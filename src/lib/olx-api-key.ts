import { NextResponse, type NextRequest } from "next/server";

function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** The bots' key for the OLX terminal API (header `x-olx-key`); null when it matches. */
export function olxKeyDenied(req: NextRequest): NextResponse | null {
  const key = process.env.OLX_TERMINAL_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Terminal is off" }, { status: 503 });
  const given =
    req.headers.get("x-olx-key")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  return given && sameKey(given, key) ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
