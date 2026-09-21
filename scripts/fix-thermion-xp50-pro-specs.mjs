/**
 * Fix swapped/broken Thermion 2 (LRF) XP50 Pro characteristic fields.
 *
 *   npx tsx scripts/fix-thermion-xp50-pro-specs.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

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

const SLUGS = [
  "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-lrf-xp50-pro-76554",
  "pulsar-teploviziynyy-prytsil-pulsar-thermion-2-xp50-pro-76547",
];

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function fixSpecs(specs) {
  const s = { ...(specs || {}) };

  // Remove broken / duplicate donor keys
  delete s["Ядро"]; // was truncated "17 µm (NETD"
  delete s["Об єктив, мм"]; // broken apostrophe duplicate
  delete s["Об'єктив"]; // if VOx was wrongly saved under short admin key
  delete s["Крок пікселя"]; // if FOV/click was wrongly saved here
  delete s["Крок пікселя, мкм"];

  // Canonical correct values for Thermion 2 XP50 Pro / LRF XP50 Pro
  s["Об'єктив, мм"] = "50";
  s["Крок пікселя, мкм"] = "17";
  s["Тип сенсора"] = "VOx (оксид ванадію)";
  s["Тип мікроболометр"] = "VOx (оксид ванадію)";
  s["Роздільна здатність матриці"] = "640x480";
  s["Матриця"] = "640x480";
  s["NETD"] = "≤25 мК";
  s["Фокусна відстань"] = "F/1.0";

  // Click / windage step — NOT pixel pitch (keep clear label)
  if (s["Значення кроку корекції"]) {
    s["Крок поправок, мм на 100 м"] = String(s["Значення кроку корекції"])
      .replace(/\s*\/\s*/g, " / ")
      .trim();
    delete s["Значення кроку корекції"];
  } else if (!s["Крок поправок, мм на 100 м"]) {
    s["Крок поправок, мм на 100 м"] = "21 / 21";
  }

  // Technical mirrors for importers / filters
  s.focalLengthMm = "50";
  s.pixelPitchUm = "17";
  s.netdMk = "25";
  s.frequencyHz = s["Частота, Гц"] || s.frequencyHz || "50";

  return s;
}

async function main() {
  for (const slug of SLUGS) {
    const { data: p, error } = await sb
      .from("products")
      .select("id, slug, name_uk, specs")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!p) {
      console.log("MISS", slug);
      continue;
    }
    const before = {
      "Об єктив, мм": p.specs?.["Об єктив, мм"],
      "Об'єктив": p.specs?.["Об'єктив"],
      "Об'єктив, мм": p.specs?.["Об'єктив, мм"],
      Ядро: p.specs?.["Ядро"],
      "Крок пікселя": p.specs?.["Крок пікселя"],
      "Значення кроку корекції": p.specs?.["Значення кроку корекції"],
      "Тип мікроболометр": p.specs?.["Тип мікроболометр"],
    };
    console.log("\nBEFORE", p.name_uk, before);

    const specs = fixSpecs(p.specs);
    const { data, error: e2 } = await sb
      .from("products")
      .update({ specs, updated_at: new Date().toISOString() })
      .eq("id", p.id)
      .select("slug, specs")
      .single();
    if (e2) throw e2;

    console.log("AFTER keys of interest:");
    for (const k of [
      "Об'єктив, мм",
      "Крок пікселя, мкм",
      "Тип сенсора",
      "NETD",
      "Крок поправок, мм на 100 м",
      "Ядро",
      "Значення кроку корекції",
    ]) {
      console.log(" ", k, "=", data.specs?.[k] ?? "(gone)");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
