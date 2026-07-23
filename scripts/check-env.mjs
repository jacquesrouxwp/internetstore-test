import fs from "fs";

const t = fs.readFileSync(".env.local", "utf8");
for (const line of t.split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).replace(/^\uFEFF/, "");
  let v = line.slice(i + 1);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (/SUPABASE|TELEGRAM|NOVA|SERVICE/.test(k)) {
    console.log(k, "len=" + v.length, v ? v.slice(0, 24) + "..." : "EMPTY");
  }
}
