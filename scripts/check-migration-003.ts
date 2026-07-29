/**
 * Verify P0 migration 003 applied.
 * npx tsx scripts/check-migration-003.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
for (const line of text.split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    v = v.slice(1, -1);
  process.env[k] = v;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const report: string[] = [];
  let ok = true;

  // store_settings
  const { data: settings, error: se } = await sb
    .from("store_settings")
    .select("key")
    .order("key");
  if (se) {
    ok = false;
    report.push(`✗ store_settings: ${se.message}`);
  } else {
    const keys = (settings || []).map((r) => r.key).sort();
    report.push(`✓ store_settings: ${keys.length} keys → ${keys.join(", ")}`);
    const need = [
      "site",
      "social",
      "legal",
      "delivery",
      "nova_poshta_sender",
      "notify_templates",
      "security",
      "inventory",
    ];
    for (const k of need) {
      if (!keys.includes(k)) {
        ok = false;
        report.push(`  ✗ missing key: ${k}`);
      }
    }
  }

  // orders new columns
  const { data: ord, error: oe } = await sb
    .from("orders")
    .select(
      "id, manager_comment, tracking_number, tracking_url, status_notified_at"
    )
    .limit(1);
  if (oe) {
    ok = false;
    report.push(`✗ orders new cols: ${oe.message}`);
  } else {
    report.push(
      `✓ orders: manager_comment / tracking_* / status_notified_at readable (${ord?.length ?? 0} sample rows)`
    );
  }

  // products SEO cols
  const { data: prod, error: pe } = await sb
    .from("products")
    .select(
      "id, meta_title_uk, meta_title_ru, meta_description_uk, meta_description_ru, image_alts"
    )
    .limit(1);
  if (pe) {
    ok = false;
    report.push(`✗ products SEO cols: ${pe.message}`);
  } else {
    report.push(
      `✓ products: meta_* / image_alts readable (${prod?.length ?? 0} sample)`
    );
  }

  // counts
  const { count: pc } = await sb
    .from("products")
    .select("*", { count: "exact", head: true });
  const { count: oc } = await sb
    .from("orders")
    .select("*", { count: "exact", head: true });
  report.push(`· products count: ${pc ?? "?"}`);
  report.push(`· orders count: ${oc ?? "?"}`);

  console.log(report.join("\n"));
  console.log(ok ? "\n=== MIGRATION 003: OK ===" : "\n=== MIGRATION 003: ISSUES ===");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
