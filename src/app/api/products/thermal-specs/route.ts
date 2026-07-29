import { NextRequest, NextResponse } from "next/server";
import { listThermalCompareOptions } from "@/lib/thermal/list-thermal-products";

/**
 * GET /api/products/thermal-specs?locale=uk&exclude=productId
 * Lightweight list of thermal products for simulator comparison.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "uk";
    const exclude = searchParams.get("exclude") || undefined;
    const items = await listThermalCompareOptions(locale, exclude);
    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    console.error("[thermal-specs]", e);
    return NextResponse.json({ items: [], error: "failed" }, { status: 500 });
  }
}
