/**
 * Retire the demo/seed products that duplicate real imported catalogue rows.
 *
 * The store carries two records for the same physical device: an early seed
 * product on a short slug (agm-pvs-14-nl1) and the imported optics-pro row on a
 * long slug with the SKU (agm-prylad-nichnoho-bachennia-agm-pvs-14-nl1-...).
 * Both are published, so shoppers meet the same item twice and Google sees
 * duplicate pages.
 *
 * The imported row is the one to keep: it carries the real SKU, specs and
 * photos. The seed twin is UNPUBLISHED (never deleted), so this is reversible
 * and any order history pointing at it survives.
 *
 * Usage:
 *   node scripts/unpublish-seed-duplicates.mjs           # dry run, changes nothing
 *   node scripts/unpublish-seed-duplicates.mjs --apply   # actually unpublish
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY (+ NEXT_PUBLIC_SUPABASE_URL) in .env.local.
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

const APPLY = process.argv.includes("--apply");

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

/**
 * seed slug (to retire) → imported slug that must survive.
 * Verified against the live sitemap: both sides were published.
 */
const PAIRS = [
  ["hikmicro-lynx-le10-3-0", "hikmicro-teplovizor-hikmicro-lynx-le10-3-0-le10-3-0"],
  ["hikmicro-lynx-le15-3-0", "hikmicro-teplovizor-hikmicro-lynx-le15-3-0-le15-3-0"],
  ["hikmicro-lynx-lh19-3-0", "hikmicro-teplovizor-hikmicro-lynx-lh19-3-0-lh19-3-0"],
  ["hikmicro-lynx-lh25-3-0", "hikmicro-teplovizor-hikmicro-lynx-lh25-3-0-lh25-3-0"],
  ["hikmicro-lynx-lh35-3-0", "hikmicro-teplovizor-hikmicro-lynx-lh35-3-0-lh35-3-0"],
  ["hikmicro-lynx-lc06s", "hikmicro-teplovizor-hikmicro-lynx-lc06s-lc06s"],
  ["hikmicro-condor-lrf-cq50l-2-0", "hikmicro-teplovizor-hikmicro-condor-lrf-cq50l-2-0-cq50l-2-0"],
  ["hikmicro-falcon-fq50l-2-0", "hikmicro-teplovizor-hikmicro-falcon-fq50l-2-0-fq50l-2-0"],
  ["hikmicro-habrok-hq35l", "hikmicro-teploviziynyy-binokl-hikmicro-habrok-hq35l-hq35l"],
  ["hikmicro-thunder-th35pc-2-0", "hikmicro-teploviziyna-nasadka-hikmicro-thunder-th35pc-2-0-hm-tr53-35s1g-cw-th35pc-2-0-hm-t"],
  ["nocpix-vista-h50r", "infiray-teplovizor-nocpix-iray-vista-h50r-vista-h50r"],
  ["pard-leopard-640-50-lrf", "pard-teplovizor-pard-leopard-640-50-lrf-pard-leopard-640-50-lrf"],
  ["pulsar-thermion-2-xq50", "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-xq50-76545"],
  ["pulsar-merger-lrf-xp50", "pulsar-teploviziynyy-binokl-pulsar-merger-lrf-xp50-77462"],
  ["agm-pvs-14-nl1", "agm-prylad-nichnoho-bachennia-agm-pvs-14-nl1-pvs-14-nl1"],
  ["pulsar-edge-gs-1x20", "pulsar-okuliary-nichnoho-bachennia-pulsar-edge-gs-1x20-pulsar-edge-gs-1x20"],
  ["pard-nv008s-lrf", "pard-prytsil-nichnoho-bachennia-pard-nv008s-lrf-pard-nv008s-lrf"],
  ["sytong-ht-60-lrf", "sytong-prytsil-nichnoho-bachennia-sytong-ht-60-lrf-ht-60-lrf"],
];

console.log(APPLY ? "APPLYING changes\n" : "DRY RUN — nothing will change\n");

let retired = 0;
let skipped = 0;

for (const [seedSlug, keepSlug] of PAIRS) {
  const { data: rows, error } = await sb
    .from("products")
    .select("id, slug, published")
    .in("slug", [seedSlug, keepSlug]);

  if (error) {
    console.log(`ERROR  ${seedSlug}: ${error.message}`);
    skipped++;
    continue;
  }

  const seed = rows?.find((r) => r.slug === seedSlug);
  const keep = rows?.find((r) => r.slug === keepSlug);

  // Never retire the twin unless the replacement really exists and is live.
  if (!keep) {
    console.log(`SKIP   ${seedSlug} — replacement ${keepSlug} not found`);
    skipped++;
    continue;
  }
  if (keep.published === false) {
    console.log(`SKIP   ${seedSlug} — replacement is unpublished`);
    skipped++;
    continue;
  }
  if (!seed) {
    console.log(`SKIP   ${seedSlug} — already gone`);
    skipped++;
    continue;
  }
  if (seed.published === false) {
    console.log(`OK     ${seedSlug} — already unpublished`);
    continue;
  }

  if (!APPLY) {
    console.log(`WOULD  unpublish ${seedSlug}  (keeping ${keepSlug})`);
    retired++;
    continue;
  }

  const { error: upErr } = await sb
    .from("products")
    .update({
      published: false,
      is_top: false,
      is_hit: false,
      is_new: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", seed.id);

  if (upErr) {
    console.log(`ERROR  ${seedSlug}: ${upErr.message}`);
    skipped++;
  } else {
    console.log(`DONE   unpublished ${seedSlug}`);
    retired++;
  }
}

console.log(
  `\n${APPLY ? "Retired" : "Would retire"}: ${retired} · skipped: ${skipped}`
);
if (!APPLY) console.log("Re-run with --apply to make the changes.");
