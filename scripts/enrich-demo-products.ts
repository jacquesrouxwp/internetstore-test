/**
 * Enrich the 28 original demo/seed products with real data from
 * optics-pro.com.ua: they ship with 6 generic specs and a one-line
 * description each.
 *
 * Matching is deliberately conservative -- a product is only accepted when
 * the brand agrees AND every digit-bearing model token from our name is
 * present in the candidate's name. Anything short of that is reported as
 * unmatched rather than guessed, since a wrong match would put another
 * device's specs on the page.
 *
 * Usage: npx tsx scripts/enrich-demo-products.ts [--out FILE]
 * Writes a JSON report; performs no DB writes.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { SEED_PRODUCTS } from "../src/data/seed";
import {
  fetchDonorHtml,
  parseProductPage,
  discoverProductUrls,
} from "../src/lib/import/optics-pro-scraper";
import { DONOR_ROOT_PATHS, mapDonorCategory } from "../src/lib/import/optics-pro-categories";
import { normalizeSpecs, resolutionString } from "../src/lib/import/optics-pro-normalize";

const BASE = "https://www.optics-pro.com.ua/";

/** Strip the leading category noun so the query is just brand + model. */
const CATEGORY_PREFIXES = [
  "тепловізійний приціл",
  "тепловізійний бінокль",
  "тепловізійна насадка",
  "приціл нічного бачення",
  "тепловізор",
  "пнб",
];

function searchQuery(nameUk: string): string {
  let s = nameUk.toLowerCase();
  for (const p of CATEGORY_PREFIXES) {
    if (s.startsWith(p)) {
      s = s.slice(p.length);
      break;
    }
  }
  return s.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/g, " ").trim();
}

/** Tokens that pin down the model: anything containing a digit, plus long words. */
function modelTokens(name: string): string[] {
  const q = norm(searchQuery(name));
  return q
    .split(" ")
    .filter((t) => t.length >= 2)
    .filter((t) => /\d/.test(t) || t.length >= 4);
}

/** Compact form so "th35pc" matches "th 35 pc" and "640-50" matches "64050". */
function squash(s: string): string {
  return norm(s).replace(/\s+/g, "");
}

type Candidate = { url: string; name: string; score: number; reason: string };

function scoreCandidate(
  ourName: string,
  ourBrand: string | null,
  candName: string
): { score: number; reason: string } {
  const candSq = squash(candName);
  const tokens = modelTokens(ourName);
  const digitTokens = tokens.filter((t) => /\d/.test(t));

  const brandOk = ourBrand
    ? candSq.includes(squash(ourBrand)) ||
      squash(ourBrand).includes("nocpix") ||
      squash(ourBrand) === "infiray"
    : true;
  if (!brandOk) return { score: 0, reason: "brand mismatch" };

  // Per-token matching proved far too loose. Short words carrying the actual
  // model identity were dropped ("Nyx"-14 matched plain N-14, HT-60 "LRF"
  // matched the non-LRF model), and substring hits crossed models entirely
  // ("NV008S" is a substring of "NV008SP3", "CQ50L" paired with "GQ50L").
  // Require the whole model signature -- everything after the category noun,
  // punctuation removed -- to appear intact in the candidate slug.
  const ourSq = squash(searchQuery(ourName));
  if (!ourSq || !candSq.includes(ourSq)) {
    return { score: 0, reason: `модель не совпала целиком (${ourSq})` };
  }
  return { score: 1, reason: "ok" };
}

/**
 * The donor's own search endpoint redirects in an infinite loop (it rewrites
 * "a+b" to "a b" and then redirects again), so it is unusable. Instead build
 * a local index by crawling the category listings once -- the product slug in
 * each URL carries the brand and model, which is what matching needs.
 */
const INDEX_CACHE = "scripts/out/donor-url-index.json";

async function buildUrlIndex(): Promise<string[]> {
  if (existsSync(INDEX_CACHE)) {
    const cached = JSON.parse(readFileSync(INDEX_CACHE, "utf8")) as string[];
    if (Array.isArray(cached) && cached.length > 500) {
      console.log(`  индекс из кеша: ${cached.length}`);
      return cached;
    }
  }
  const urls = new Set<string>();
  for (const root of DONOR_ROOT_PATHS) {
    try {
      const found = await discoverProductUrls(root, { delayMs: 150 });
      found.forEach((u) => urls.add(u));
      process.stdout.write(`\r  индекс: ${urls.size} товаров   `);
    } catch {
      /* skip a root that fails */
    }
  }
  process.stdout.write("\n");
  const list = Array.from(urls);
  mkdirSync("scripts/out", { recursive: true });
  writeFileSync(INDEX_CACHE, JSON.stringify(list), "utf8");
  return list;
}

function findMatch(
  nameUk: string,
  brand: string | null,
  ourCategory: string | null,
  index: string[]
): Candidate | null {
  const ourLen = squash(searchQuery(nameUk)).length;
  const cands: (Candidate & { extra: number })[] = [];

  for (const rel of index) {
    // The donor's category must map to the same category as ours. This is
    // what separates a scope from the clip-on of the same model name, or
    // the Rix Storm S3 binocular from the Rix Storm S3 scope.
    if (ourCategory) {
      const mapped = mapDonorCategory(rel);
      if (!mapped || mapped.ourSlug !== ourCategory) continue;
    }
    const slugPart = rel.split("/").pop() || rel;
    const { score, reason } = scoreCandidate(nameUk, brand, slugPart);
    if (score > 0) {
      cands.push({
        url: rel,
        name: slugPart,
        score,
        reason,
        extra: Math.abs(squash(slugPart).length - ourLen),
      });
    }
  }

  // All survivors match every token, so prefer the tightest fit: the slug
  // carrying the fewest extra characters is the exact model rather than a
  // longer variant (LYNX LE10 3.0 over LYNX PRO LE10).
  cands.sort((a, b) => a.extra - b.extra);
  const best = cands[0];
  if (!best) return null;
  if (cands.length > 1 && cands[1].extra === best.extra) {
    return { ...best, reason: `ambiguous with ${cands[1].url}` };
  }
  return best;
}

async function main() {
  const outIdx = process.argv.indexOf("--out");
  const outFile =
    outIdx >= 0 ? process.argv[outIdx + 1] : "scripts/out/demo-enrichment.json";

  console.log("Строю индекс каталога донора...");
  const index = await buildUrlIndex();
  console.log(`индекс готов: ${index.length} товаров\n`);

  const results: Record<string, unknown>[] = [];
  let matched = 0;

  for (const p of SEED_PRODUCTS) {
    const best = findMatch(p.nameUk, p.brandName ?? null, p.categorySlug ?? null, index);
    if (!best || best.reason.startsWith("ambiguous")) {
      console.log(`  ✘ ${p.nameUk}${best ? "  — " + best.reason : ""}`);
      results.push({
        slug: p.slug,
        nameUk: p.nameUk,
        matched: false,
        reason: best ? best.reason : "нет уверенного совпадения",
      });
      continue;
    }

    let parsed;
    try {
      parsed = parseProductPage(await fetchDonorHtml(`${BASE}${best.url}`), best.url);
    } catch {
      results.push({ slug: p.slug, nameUk: p.nameUk, matched: false, reason: "fetch error" });
      continue;
    }
    if (!parsed) {
      results.push({ slug: p.slug, nameUk: p.nameUk, matched: false, reason: "нет JSON-LD" });
      continue;
    }

    const n = normalizeSpecs(parsed.specPairs);
    matched++;
    console.log(
      `  ✔ ${p.nameUk}\n      -> ${parsed.name}  [specs ${parsed.specPairs.length}, desc ${parsed.descriptionRaw.length}]`
    );
    results.push({
      slug: p.slug,
      nameUk: p.nameUk,
      matched: true,
      donorName: parsed.name,
      donorUrl: `${BASE}${best.url}`,
      score: Number(best.score.toFixed(2)),
      price: parsed.price,
      availability: parsed.availability,
      description: parsed.descriptionRaw,
      specPairs: parsed.specPairs,
      normalized: {
        resolution: resolutionString(n.hPixels, n.vPixels),
        detectionRangeM: n.detectionRangeM ?? null,
        netdMk: n.netdMk ?? null,
        frequencyHz: n.frequencyHz ?? null,
      },
      images: parsed.images,
    });
  }

  mkdirSync("scripts/out", { recursive: true });
  writeFileSync(outFile, JSON.stringify(results, null, 1), "utf8");
  console.log(`\nсопоставлено ${matched} из ${SEED_PRODUCTS.length}`);
  console.log(`отчёт: ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
