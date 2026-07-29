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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function test(name: string, key: string) {
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error, count } = await sb
    .from("blog_posts")
    .select("slug,title_uk,published", { count: "exact" })
    .eq("published", true);
  console.log(
    name,
    "\n  error:",
    error?.message || null,
    "\n  count:",
    count,
    "\n  rows:",
    data
  );
}

async function main() {
  await test("SERVICE", service);
  await test("ANON", anon);

  // same as app repo
  const { listPublishedPosts } = await import("../src/lib/blog/repo");
  const r = await listPublishedPosts({ limit: 5 });
  console.log("listPublishedPosts:", r.total, r.posts.map((p) => p.slug));
}

main().catch(console.error);
