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

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/003_admin_p0.sql"),
  "utf8"
);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Split and run statements — supabase-js has no multi SQL; use rpc if available
  // Fallback: use PostgREST won't run DDL. Print for manual run.
  console.log(
    "Apply this SQL in Supabase SQL Editor (Dashboard → SQL):\n"
  );
  console.log("--- BEGIN ---");
  console.log(sql);
  console.log("--- END ---");
  console.log(
    "\nIf you have supabase CLI linked: supabase db push\nProject:",
    url
  );

  // Try optional exec via pg if DATABASE_URL set
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import("pg").catch(() => ({
      default: null,
    }));
    if (pg) {
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log("Applied via DATABASE_URL");
    }
  }
}

main().catch(console.error);
