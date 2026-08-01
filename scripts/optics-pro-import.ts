/**
 * optics-pro.com.ua -> our catalog importer.
 *
 * Usage:
 *   npx tsx scripts/optics-pro-import.ts discover
 *     Crawl category listings only (no product-page fetches). Prints URL
 *     counts per donor root. Fast, safe, no writes.
 *
 *   npx tsx scripts/optics-pro-import.ts dry-run [--cats teplovizori,...] [--limit N]
 *     Full scrape: crawl + fetch every product page + normalize + map
 *     brand/category. NO DB writes, NO image downloads. Writes a JSON report
 *     to scripts/out/optics-pro-report.json and prints a summary.
 *
 * Run with: npx tsx scripts/optics-pro-import.ts <mode> [flags]
 */
import { writeFileSync, mkdirSync } from "fs";
import {
  DONOR_ROOT_PATHS,
  CATEGORY_ROOT_MAP,
  mapDonorCategory,
} from "../src/lib/import/optics-pro-categories";
import {
  discoverProductUrls,
  fetchDonorHtml,
  parseProductPage,
  mapWithConcurrency,
  imagesShareSameFolder,
  looksLikeMatchingGallery,
} from "../src/lib/import/optics-pro-scraper";
import { normalizeSpecs } from "../src/lib/import/optics-pro-normalize";
import { SEED_BRANDS } from "../src/data/seed";
import { matchBrand, matchBrandFromName } from "../src/lib/import/optics-pro-categories";

function parseArgs() {
  const args = process.argv.slice(2);
  const mode = args[0] || "discover";
  const flags: Record<string, string> = {};
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags[k] = v ?? args[++i] ?? "true";
    }
  }
  return { mode, flags };
}

async function runDiscover() {
  console.log(`Donor roots to crawl: ${DONOR_ROOT_PATHS.length}`);
  let total = 0;
  const perRoot: Record<string, number> = {};
  for (const root of DONOR_ROOT_PATHS) {
    const urls = await discoverProductUrls(root, {
      onPage: (page, found, sofar) => {
        process.stdout.write(
          `\r  [${root}] page ${page}: +${found} (total ${sofar})     `
        );
      },
    });
    process.stdout.write("\n");
    perRoot[root] = urls.length;
    total += urls.length;
    console.log(
      `  -> ${root} (=> our "${CATEGORY_ROOT_MAP[root].ourSlug}"): ${urls.length} product URLs`
    );
  }
  console.log("\n=== Discovery summary ===");
  for (const [root, n] of Object.entries(perRoot)) {
    console.log(`  ${root.padEnd(30)} ${n}`);
  }
  console.log(`  TOTAL (with dupes across roots possible): ${total}`);
}

type DryRunRow = {
  url: string;
  name: string;
  donorBrand: string | null;
  ourBrandSlug: string | null;
  donorRoot: string;
  ourCategorySlug: string;
  price: number | null;
  availability: string | null;
  skuOrModel: string | null;
  hasDescription: boolean;
  specCount: number;
  imageCount: number;
  imagesConsistent: boolean;
  skipReason: string | null;
};

async function runDryRun(flags: Record<string, string>) {
  const catsFilter = flags.cats ? flags.cats.split(",") : DONOR_ROOT_PATHS;
  const perCatLimit = flags.limit ? Number(flags.limit) : Infinity;
  const concurrency = flags.concurrency ? Number(flags.concurrency) : 6;

  const rows: DryRunRow[] = [];
  let fetchErrors = 0;

  for (const root of catsFilter) {
    if (!CATEGORY_ROOT_MAP[root]) {
      console.warn(`  ! unknown root "${root}", skipping`);
      continue;
    }
    console.log(`\n=== ${root} ===`);
    let urls = await discoverProductUrls(root, {
      onPage: (page, found, sofar) =>
        process.stdout.write(`\r  listing page ${page}: total ${sofar}   `),
    });
    process.stdout.write("\n");
    if (Number.isFinite(perCatLimit)) urls = urls.slice(0, perCatLimit);
    console.log(`  fetching ${urls.length} product pages (concurrency ${concurrency})...`);

    let done = 0;
    await mapWithConcurrency(urls, concurrency, async (relUrl) => {
      const fullUrl = `https://www.optics-pro.com.ua/${relUrl}`;
      try {
        const html = await fetchDonorHtml(fullUrl);
        const parsed = parseProductPage(html, relUrl);
        done++;
        if (done % 25 === 0 || done === urls.length) {
          process.stdout.write(`\r  parsed ${done}/${urls.length}   `);
        }
        if (!parsed) {
          rows.push(mkSkippedRow(relUrl, root, "no-product-jsonld"));
          return;
        }
        const catMap = mapDonorCategory(relUrl);
        if (!catMap) {
          rows.push(mkSkippedRow(relUrl, root, "category-not-whitelisted"));
          return;
        }
        const ourBrand =
          matchBrand(parsed.brandName, SEED_BRANDS) ||
          (!parsed.brandName
            ? matchBrandFromName(parsed.name, SEED_BRANDS)
            : null);
        const normalized = normalizeSpecs(parsed.specPairs);
        const folderOk = imagesShareSameFolder(parsed.images);
        const images = folderOk ? parsed.images : [];
        const galleryLooksRight =
          folderOk && looksLikeMatchingGallery(images, relUrl);
        rows.push({
          url: relUrl,
          name: parsed.name,
          donorBrand: parsed.brandName,
          ourBrandSlug: ourBrand?.slug ?? null,
          donorRoot: root,
          ourCategorySlug: catMap.ourSlug,
          price: parsed.price,
          availability: parsed.availability,
          skuOrModel: parsed.sku || parsed.model,
          hasDescription: parsed.descriptionRaw.length > 0,
          specCount: Object.keys(normalized.raw).length,
          imageCount: images.length,
          imagesConsistent: galleryLooksRight,
          skipReason: !ourBrand ? `brand-not-whitelisted:${parsed.brandName || "null"}` : null,
        });
      } catch (e) {
        fetchErrors++;
        rows.push(
          mkSkippedRow(
            relUrl,
            root,
            `fetch-error:${e instanceof Error ? e.message : String(e)}`
          )
        );
      }
    });
    process.stdout.write("\n");
  }

  mkdirSync("scripts/out", { recursive: true });
  writeFileSync(
    "scripts/out/optics-pro-report.json",
    JSON.stringify(rows, null, 2),
    "utf8"
  );

  printSummary(rows, fetchErrors);
}

function mkSkippedRow(url: string, root: string, reason: string): DryRunRow {
  return {
    url,
    name: "",
    donorBrand: null,
    ourBrandSlug: null,
    donorRoot: root,
    ourCategorySlug: CATEGORY_ROOT_MAP[root]?.ourSlug || "",
    price: null,
    availability: null,
    skuOrModel: null,
    hasDescription: false,
    specCount: 0,
    imageCount: 0,
    imagesConsistent: true,
    skipReason: reason,
  };
}

function printSummary(rows: DryRunRow[], fetchErrors: number) {
  const total = rows.length;
  const kept = rows.filter((r) => !r.skipReason);
  const skippedBrand = rows.filter((r) =>
    r.skipReason?.startsWith("brand-not-whitelisted")
  );
  const skippedOther = rows.filter(
    (r) => r.skipReason && !r.skipReason.startsWith("brand-not-whitelisted")
  );
  const missingPrice = kept.filter((r) => r.price == null);
  const fewSpecs = kept.filter((r) => r.specCount < 5);
  const noImages = kept.filter((r) => r.imageCount === 0);
  const inconsistentImages = kept.filter((r) => !r.imagesConsistent);

  console.log("\n\n========== DRY-RUN SUMMARY ==========");
  console.log(`Total product pages parsed: ${total}`);
  console.log(`  Would import (brand+category OK): ${kept.length}`);
  console.log(`  Skipped -- brand not whitelisted: ${skippedBrand.length}`);
  console.log(`  Skipped -- other (${skippedOther.length}):`);
  const otherReasons = new Map<string, number>();
  for (const r of skippedOther) {
    const key = (r.skipReason || "").split(":")[0];
    otherReasons.set(key, (otherReasons.get(key) || 0) + 1);
  }
  for (const [k, n] of otherReasons) console.log(`    ${k}: ${n}`);
  console.log(`  Fetch errors: ${fetchErrors}`);

  console.log("\n-- By category (kept) --");
  const byCat = new Map<string, number>();
  for (const r of kept) byCat.set(r.ourCategorySlug, (byCat.get(r.ourCategorySlug) || 0) + 1);
  for (const [k, n] of byCat) console.log(`  ${k.padEnd(15)} ${n}`);

  console.log("\n-- By brand (kept) --");
  const byBrand = new Map<string, number>();
  for (const r of kept) byBrand.set(r.ourBrandSlug!, (byBrand.get(r.ourBrandSlug!) || 0) + 1);
  for (const [k, n] of [...byBrand.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(15)} ${n}`);
  }

  console.log("\n-- Top skipped (non-whitelisted) donor brands --");
  const brandSkipCounts = new Map<string, number>();
  for (const r of skippedBrand) {
    const b = (r.skipReason || "").split(":")[1] || "?";
    brandSkipCounts.set(b, (brandSkipCounts.get(b) || 0) + 1);
  }
  for (const [k, n] of [...brandSkipCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${k.padEnd(20)} ${n}`);
  }

  console.log(`\nNeeds manual review:`);
  console.log(`  missing price: ${missingPrice.length}`);
  console.log(`  <5 specs: ${fewSpecs.length}`);
  console.log(`  no images: ${noImages.length}`);
  console.log(`  inconsistent image folder (possible wrong photo): ${inconsistentImages.length}`);

  console.log(`\nFull report: scripts/out/optics-pro-report.json`);
}

async function main() {
  const { mode, flags } = parseArgs();
  if (mode === "discover") {
    await runDiscover();
  } else if (mode === "dry-run") {
    await runDryRun(flags);
  } else {
    console.error(`Unknown mode "${mode}". Use "discover" or "dry-run".`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
