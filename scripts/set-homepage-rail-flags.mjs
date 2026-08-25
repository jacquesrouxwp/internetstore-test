/**
 * Fill homepage rails: Top / Hit / New / Sale.
 * Clears previous rail flags, then sets curated lists (AGM-heavy + hot sellers).
 * Featured shelf on the homepage is separate (hardcoded slugs in page.tsx).
 *
 *   npx tsx scripts/set-homepage-rail-flags.mjs
 *   npx tsx scripts/set-homepage-rail-flags.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = resolve(f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  }
}
loadEnv();

const DRY = process.argv.includes("--dry-run");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/** Bestsellers — flagship / mid-premium that move. Overlaps featured are fine (deduped on page). */
const TOP = [
  // AGM
  "agm-teploviziynyy-prytsil-agm-rattler-v2-50-640-314205550206r561",
  "agm-teploviziynyy-prytsil-agm-rattler-v3-lrf-35-640-ratt35-640-v3",
  "agm-teploviziynyy-prytsil-agm-rattler-v3-lrf-50-640-rattler-v3-50-640lrf",
  "agm-teploviziynyy-prytsil-agm-adder-v2-lrf-35-384-agm-adder-v2-lrf-35-384",
  "agm-teploviziynyy-prytsil-agm-adder-ts50-640-ts50-640",
  "agm-teploviziynyy-prytsil-agm-secutor-lrf-35-384-secu35-384-lrf",
  "agm-teploviziynyy-prytsil-agm-clarion-384-clar25-384",
  "agm-teploviziynyy-binokl-agm-observir-lrf-35-384-observir-lrf-35-384",
  "agm-prylad-nichnoho-bachennia-agm-pvs-14-nl1-pvs-14-nl1",
  // Hik / Pulsar / Pard
  "hikmicro-teplovizor-hikmicro-condor-lrf-cq50l-2-0-cq50l-2-0",
  "hikmicro-teplovizor-hikmicro-falcon-fq50l-2-0-fq50l-2-0",
  "hikmicro-teplovizor-hikmicro-lynx-lh35-3-0-lh35-3-0",
  "hikmicro-teplovizor-hikmicro-lynx-lh25-3-0-lh25-3-0",
  "pulsar-teploviziynyy-binokl-pulsar-merger-lrf-xp50-77462",
  "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-xq50-76545",
  "pulsar-teplovizor-pulsar-axion-2-xg35-07601",
  "pard-teplovizor-pard-leopard-640-50-lrf-pard-leopard-640-50-lrf",
  "pard-teploviziynyy-prytsil-pard-pantera-640-50-lrf-pantera-640-50-lrf",
];

/** Hits — volume / entry-mid sellers */
const HIT = [
  // AGM entry–mid
  "agm-teploviziynyy-prytsil-agm-rattler-ts19-256-ts19-256",
  "agm-teploviziynyy-prytsil-agm-rattler-ts25-256-ts25-256",
  "agm-teploviziynyy-prytsil-agm-rattler-v2-25-256-314218550204r221",
  "agm-teploviziynyy-prytsil-agm-rattler-v2-25-320-v2-25-320",
  "agm-teploviziynyy-prytsil-agm-rattler-ts25-384-ts25-384",
  "agm-teploviziynyy-prytsil-agm-rattler-ts35-384-ts35-384",
  "agm-teploviziynyy-prytsil-agm-adder-ts35-384-ats35-384",
  "agm-teplovizor-agm-asp-tm35-384-agm-asp-tm35-384",
  "agm-teploviziynyy-prytsil-agm-adder-ts50-384-ts50-384",
  "agm-teplovizor-agm-sidewinder-tm50-640-sidewinder-tm50-640",
  // volume brands
  "hikmicro-teplovizor-hikmicro-lynx-le10-3-0-le10-3-0",
  "hikmicro-teplovizor-hikmicro-lynx-le15-3-0-le15-3-0",
  "hikmicro-teplovizor-hikmicro-lynx-lh19-3-0-lh19-3-0",
  "pard-prytsil-nichnoho-bachennia-pard-nv008s-lrf-pard-nv008s-lrf",
  "pard-teploviziynyy-prytsil-pard-ocelot-480-50-lrf-ocelot-480-50-lrf",
  "pard-teploviziynyy-prytsil-pard-hunt-pro-35-hunt-pro-35",
  "sytong-prytsil-nichnoho-bachennia-sytong-ht-60-lrf-ht-60-lrf",
  "pulsar-teplovizor-pulsar-helion-2-xp50-pro-77431",
  "infiray-teplovizor-nocpix-iray-vista-h50r-vista-h50r",
];

/** New arrivals / fresh lines */
const NEW = [
  "agm-teploviziynyy-prytsil-agm-rattler-v3-25-384-ratt25-384-v3",
  "agm-teploviziynyy-prytsil-agm-rattler-v3-lrf-35-384-ratt35-384-v3",
  "agm-teploviziynyy-prytsil-agm-adder-v2-lrf-35-640-agm-adder-v2-lrf-35-640",
  "agm-teploviziynyy-prytsil-agm-varmint-v2-lrf-35-384-v2-lrf-35-384",
  "agm-teploviziynyy-monokuliar-agm-reachir-lrf-35-640-reachir-lrf-35-640",
  "agm-teploviziynyy-binokl-agm-voyage-lrf-tb50-384-voyage-lrf-tb50-384",
  "pard-teploviziynyy-prytsil-pard-pantera-2-0-640-75-lrf-pantera-2-0-640-75-lrf",
  "pard-teploviziynyy-multyspektralnyy-prytsil-pard-td62-70-lrf-td62-70-lrf",
  "pard-teploviziynyy-prytsil-pard-ocelot-640-50-lrf-q-ocelot-640-50-lrf-q",
  "hikmicro-teploviziynyy-binokl-hikmicro-habrok-hq35l-hq35l",
  "hikmicro-teploviziynyy-prytsil-hikmicro-stellar-sq50l-3-0-sq50l-3-0",
  "thermtec-teploviziynyy-prytsil-thermtec-vidar-660l-2-0-vidar-660l-2-0",
  "infiray-teploviziynyy-prytsil-nocpix-iray-ace-h50r-ace-h50r",
  "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-lrf-xg50-thermion-2-lrf-xg50",
];

/** Prefer these for sale rail (volume / mid AGM + hot sellers) */
const SALE_PREFER = [
  "agm-teploviziynyy-prytsil-agm-rattler-ts50-640-aa-0008722",
  "agm-teploviziynyy-prytsil-agm-adder-ts35-640-ts35-640",
  "agm-teplovizonna-nasadka-agm-rattler-tc35-384-tc35-384",
  "agm-prylad-nichnoho-bachennia-agm-wolf-14-nw1-agm-wolf-14-nw1",
  "agm-prylad-nichnoho-bachennia-agm-wolf-14-nl2-agm-wolf-14-nl2",
  "agm-teplovizor-agm-fuzion-tm35-640-tm35-640",
  "agm-teplovizor-agm-fuzion-lrf-tm35-640-lrf-tm35-640",
  "hikmicro-teploviziyna-nasadka-hikmicro-thunder-th35pc-2-0-hm-tr53-35s1g-cw-th35pc-2-0-hm-t",
  "hikmicro-teplovizor-hikmicro-lynx-lc06s-lc06s",
  "hikmicro-teplovizor-hikmicro-lynx-pro-le10s-le10s",
  "hikmicro-teplovizor-hikmicro-lynx-pro-le15s-le15s",
  "hikmicro-teploviziynyy-binokl-hikmicro-habrok-hh35l-hh35l",
  "pard-prytsil-nichnoho-bachennia-pard-nv008sp2-lrf-pard-nv008sp2-lrf",
  "pard-prytsil-nichnoho-bachennia-pard-nv008-lrf-pard-nv008-lrf",
  "pard-teplovizor-pard-leopard-256-16-pard-leopard-256-16",
  "pard-teplovizor-pard-leopard-480-35-lrf-pard-leopard-480-35-lrf",
  "pard-teploviziynyy-prytsil-pard-sa-45-sa-45",
  "pulsar-okuliary-nichnoho-bachennia-pulsar-edge-gs-1x20-pulsar-edge-gs-1x20",
  "pulsar-axion-xg30",
  "atn-x-sight-4k-pro",
  "atn-ots-xlt-160",
];

async function setFlags(slugs, patch) {
  let ok = 0;
  for (const slug of slugs) {
    if (DRY) {
      console.log("[dry]", slug, patch);
      ok++;
      continue;
    }
    const { data, error } = await sb
      .from("products")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("slug", slug)
      .eq("published", true)
      .select("slug");
    if (error) console.log("ERR", slug, error.message);
    else if (!data?.length) console.log("MISS", slug);
    else {
      console.log("OK", slug);
      ok++;
    }
  }
  return ok;
}

async function main() {
  console.log(DRY ? "DRY RUN" : "LIVE");

  // Reset all rail flags so old curation does not leak into rails
  if (!DRY) {
    for (const col of ["is_top", "is_hit", "is_new", "is_sale"]) {
      await sb
        .from("products")
        .update({ [col]: false })
        .eq("published", true)
        .eq(col, true);
      console.log("cleared", col);
    }
  } else {
    console.log("[dry] would clear is_top/is_hit/is_new/is_sale on published");
  }

  console.log("\n— TOP —");
  await setFlags(TOP, { is_top: true });

  console.log("\n— HIT —");
  await setFlags(HIT, { is_hit: true });

  console.log("\n— NEW —");
  await setFlags(NEW, { is_new: true });

  // Sale: prefer curated discounted SKUs, then fill from any old_price > price
  const reserved = new Set([...TOP, ...HIT, ...NEW]);
  if (!DRY) {
    let saleN = 0;
    for (const slug of SALE_PREFER) {
      if (reserved.has(slug)) continue;
      const { data } = await sb
        .from("products")
        .select("id, slug, price, old_price")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!data) {
        console.log("SALE MISS", slug);
        continue;
      }
      await sb
        .from("products")
        .update({ is_sale: true, updated_at: new Date().toISOString() })
        .eq("id", data.id);
      console.log("SALE OK", slug);
      reserved.add(slug);
      saleN++;
    }

    const { data: saleCand } = await sb
      .from("products")
      .select("id, slug, price, old_price")
      .eq("published", true)
      .not("old_price", "is", null)
      .limit(80);
    for (const p of saleCand || []) {
      if (saleN >= 18) break;
      if (reserved.has(p.slug)) continue;
      if (p.old_price != null && Number(p.old_price) > Number(p.price)) {
        await sb
          .from("products")
          .update({ is_sale: true, updated_at: new Date().toISOString() })
          .eq("id", p.id);
        reserved.add(p.slug);
        saleN++;
        console.log("SALE AUTO", p.slug);
      }
    }
    console.log("\nSale flagged:", saleN);
  }

  const { count: top } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("published", true)
    .eq("is_top", true);
  const { count: hit } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("published", true)
    .eq("is_hit", true);
  const { count: neu } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("published", true)
    .eq("is_new", true);
  const { count: sale } = await sb
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("published", true)
    .eq("is_sale", true);
  console.log("\nFINAL COUNTS", { top, hit, neu, sale });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
