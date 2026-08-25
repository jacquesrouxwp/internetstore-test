/**
 * Fill homepage rails: Top / Hit / New / Sale.
 * Clears blanket is_new on everything, then sets curated flags.
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

/** Curated homepage-quality models (imported long slugs after seed dedupe). */
const TOP = [
  "hikmicro-teplovizor-hikmicro-lynx-lh19-3-0-lh19-3-0",
  "hikmicro-teplovizor-hikmicro-lynx-lh25-3-0-lh25-3-0",
  "hikmicro-teplovizor-hikmicro-condor-lrf-cq50l-2-0-cq50l-2-0",
  "hikmicro-teplovizor-hikmicro-falcon-fq50l-2-0-fq50l-2-0",
  "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-xq50-76545",
  "pulsar-teploviziynyy-binokl-pulsar-merger-lrf-xp50-77462",
  "agm-teploviziynyy-prytsil-agm-rattler-v2-35-384-314204550205r331",
  "agm-prylad-nichnoho-bachennia-agm-pvs-14-nw1-pvs-14-nw1",
];

const HIT = [
  "hikmicro-teplovizor-hikmicro-lynx-le10-3-0-le10-3-0",
  "hikmicro-teplovizor-hikmicro-lynx-le15-3-0-le15-3-0",
  "hikmicro-teplovizor-hikmicro-lynx-lh35-3-0-lh35-3-0",
  "hikmicro-teploviziynyy-binokl-hikmicro-habrok-hq35l-hq35l",
  "infiray-teplovizor-nocpix-iray-vista-h50r-vista-h50r",
  "pard-teplovizor-pard-leopard-640-50-lrf-pard-leopard-640-50-lrf",
  "pard-prytsil-nichnoho-bachennia-pard-nv008s-lrf-pard-nv008s-lrf",
  "sytong-prytsil-nichnoho-bachennia-sytong-ht-60-lrf-ht-60-lrf",
  "agm-teploviziynyy-prytsil-agm-rattler-v2-19-256-314218550203r921",
  "agm-prylad-nichnoho-bachennia-agm-pvs-7-nw1-pvs-7-nw1",
  "hikmicro-teploviziyna-nasadka-hikmicro-thunder-th35pc-2-0-hm-tr53-35s1g-cw-th35pc-2-0-hm-t",
  "pulsar-okuliary-nichnoho-bachennia-pulsar-edge-gs-1x20-pulsar-edge-gs-1x20",
];

const NEW = [
  "agm-teploviziynyy-prytsil-agm-rattler-v3-lrf-50-640-rattler-v3-50-640lrf",
  "agm-teploviziynyy-prytsil-agm-rattler-v3-lrf-35-640-ratt35-640-v3",
  "agm-teploviziynyy-prytsil-agm-rattler-v3-25-384-ratt25-384-v3",
  "agm-teploviziynyy-prytsil-agm-rattler-ts35-384-ts35-384",
  "agm-teploviziynyy-prytsil-agm-rattler-ts25-384-ts25-384",
  "hikmicro-teplovizor-hikmicro-lynx-lc06s-lc06s",
  "thermtec-teploviziynyy-prytsil-thermtec-vidar-660l-2-0-vidar-660l-2-0",
  "nocpix-teploviziynyy-prytsil-nocpix-ace-h50r",
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

  // 1) Clear blanket is_new on all published (almost everything was "new")
  if (!DRY) {
    const { count } = await sb
      .from("products")
      .update({ is_new: false })
      .eq("published", true)
      .eq("is_new", true);
    console.log("cleared is_new on published (bulk)");
  } else {
    console.log("[dry] would clear is_new on all published");
  }

  console.log("\n— TOP —");
  await setFlags(TOP, { is_top: true, is_hit: false });

  console.log("\n— HIT —");
  await setFlags(HIT, { is_hit: true });

  console.log("\n— NEW —");
  await setFlags(NEW, { is_new: true });

  // Sale: products that already have old_price > price
  if (!DRY) {
    const { data: saleCand } = await sb
      .from("products")
      .select("id, slug, price, old_price")
      .eq("published", true)
      .not("old_price", "is", null)
      .limit(40);
    let saleN = 0;
    for (const p of saleCand || []) {
      if (p.old_price != null && Number(p.old_price) > Number(p.price)) {
        await sb
          .from("products")
          .update({ is_sale: true })
          .eq("id", p.id);
        saleN++;
      }
    }
    console.log("\nSale flagged from old_price:", saleN);
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
