import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { productName } from "@/types";

/**
 * GET /api/trade-in/models?q=axion — model suggestions for the trade-in form.
 *
 * Public and read-only: it returns what the catalogue already shows on every
 * category page, so there is nothing here a visitor could not see anyway. The
 * price travels with the suggestion because the consultant wants to know what
 * the same model costs new when the seller names their own figure.
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
      price: p.price,
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
