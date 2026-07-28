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
  for (const table of ["posts", "blog_posts"]) {
    const { data, error, count } = await sb
      .from(table)
      .select("id,slug", { count: "exact" })
      .limit(5);
    console.log(
      table,
      error ? `ERR ${error.message}` : `ok count=${count}`,
      data?.map((r) => r.slug)
    );
  }
}
main();
