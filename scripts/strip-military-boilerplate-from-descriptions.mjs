/**
 * Remove military-discount boilerplate paragraphs from product descriptions in DB.
 * Does not touch unique product copy — only known template sentences we appended.
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

/** Exact / near-exact templates we used to inject */
const PATTERNS = [
  /\s*Для військовослужбовців ЗСУ — спеціальні умови та знижки на тепловізори: уточніть у консультанта\.?\s*/gi,
  /\s*Для военнослужащих ВСУ — специальные условия и скидки на тепловизоры: уточните у консультанта\.?\s*/gi,
  /\s*Для військовослужбовців ЗСУ діють спеціальні умови та знижки на тепловізори й тепловізійні приціли\.?[^.]*консультанта[^.]*\.\s*/gi,
  /\s*Для военнослужащих ВСУ действуют специальные условия и скидки на тепловизоры и тепловизионные прицелы\.?[^.]*консультанта[^.]*\.\s*/gi,
];

function clean(text) {
  if (text == null || typeof text !== "string") return { text, changed: false };
  let out = text;
  for (const re of PATTERNS) out = out.replace(re, " ");
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/  +/g, " ").trim();
  return { text: out, changed: out !== text.trim() };
}

const sb = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data, error } = await sb
  .from("products")
  .select("id, slug, description_uk, description_ru, short_uk, short_ru");
if (error) {
  console.error(error);
  process.exit(1);
}

let n = 0;
for (const p of data || []) {
  const uk = clean(p.description_uk);
  const ru = clean(p.description_ru);
  const suk = clean(p.short_uk);
  const sru = clean(p.short_ru);
  if (!uk.changed && !ru.changed && !suk.changed && !sru.changed) continue;

  const { error: up } = await sb
    .from("products")
    .update({
      description_uk: uk.text || null,
      description_ru: ru.text || null,
      short_uk: suk.text || null,
      short_ru: sru.text || null,
    })
    .eq("id", p.id);
  if (up) console.error("fail", p.slug, up.message);
  else {
    n++;
    console.log("cleaned", p.slug);
  }
}
console.log("done, cleaned", n, "products");
