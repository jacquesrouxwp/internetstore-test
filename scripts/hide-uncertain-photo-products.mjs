/**
 * Hide homepage products where photos are not confidently original.
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

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/** Not sure photos match the real device — hide from storefront for now. */
const HIDE_SLUGS = [
  "armasight-nyx-14-pro", // used Armasight N-14 substitute, not Nyx-14
  "hikmicro-thunder-th25c", // no optics-pro page; old photo only
];

for (const slug of HIDE_SLUGS) {
  const { data, error } = await sb
    .from("products")
    .update({
      published: false,
      is_top: false,
      is_hit: false,
      is_new: false,
      is_sale: false,
    })
    .eq("slug", slug)
    .select("id, slug, name_uk, published");

  if (error) console.error(slug, error.message);
  else if (!data?.length) console.log("not found", slug);
  else console.log("hidden", data[0].slug, "|", data[0].name_uk);
}

// also hide any other products matching these names (import duplicates)
const { data: extra } = await sb
  .from("products")
  .select("id, slug, name_uk, published")
  .eq("published", true)
  .or(
    "slug.ilike.%thunder-th25c%,slug.ilike.%nyx-14%,name_uk.ilike.%Thunder TH25C%,name_uk.ilike.%Nyx-14%,name_ru.ilike.%Thunder TH25C%,name_ru.ilike.%Nyx-14%"
  );

for (const p of extra || []) {
  // don't hide unrelated nyx if any — only armasight/nyx-14 style
  const blob = `${p.slug} ${p.name_uk}`.toLowerCase();
  const hide =
    blob.includes("th25c") ||
    blob.includes("nyx-14") ||
    blob.includes("nyx 14");
  if (!hide) continue;
  await sb
    .from("products")
    .update({
      published: false,
      is_top: false,
      is_hit: false,
      is_new: false,
      is_sale: false,
    })
    .eq("id", p.id);
  console.log("hidden extra", p.slug);
}

console.log("done");
