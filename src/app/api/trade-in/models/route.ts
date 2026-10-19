import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { productName } from "@/types";

/**
 * GET /api/trade-in/models?q=axion — model suggestions for the trade-in form.
 *
 * Public and read-only: names only. The new price is left out on purpose —
 * a seller who sees it just asks a little less than new; the consultant gets
 * the price server-side with the request (see /api/trade-in).
 */
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();
  const locale = req.nextUrl.searchParams.get("locale") === "ru" ? "ru" : "uk";

  if (q.length < 2) return NextResponse.json({ items: [] });

  try {
    const { products } = await getCatalog({ q, limit: 8 });
    const items = products.map((p) => ({
      slug: p.slug,
      name: productName(p, locale),
      brand: p.brandName || null,
    }));
    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (e) {
    console.error("[trade-in/models]", e);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
