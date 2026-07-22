import { NextRequest, NextResponse } from "next/server";
import {
  getDeliveryCost,
  getWarehouses,
  searchCities,
} from "@/lib/nova-poshta";

/**
 * Nova Poshta proxy — server only.
 * GET ?action=cities&q=
 * GET ?action=warehouses&cityRef=&q=
 * GET ?action=cost&cityRef=&price=&weight=
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    if (action === "cities") {
      const q = searchParams.get("q") || "";
      if (q.trim().length < 2) {
        return NextResponse.json({ cities: [], demo: false });
      }
      const result = await searchCities(q);
      return NextResponse.json({
        cities: result.cities,
        demo: result.demo,
        error: result.error,
      });
    }

    if (action === "warehouses") {
      const cityRef = searchParams.get("cityRef") || "";
      if (!cityRef) {
        return NextResponse.json(
          { warehouses: [], error: "cityRef required" },
          { status: 400 }
        );
      }
      const q = searchParams.get("q") || undefined;
      const result = await getWarehouses(cityRef, q);
      return NextResponse.json({
        warehouses: result.warehouses,
        demo: result.demo,
        error: result.error,
      });
    }

    if (action === "cost") {
      const cityRef = searchParams.get("cityRef") || "";
      const price = Number(searchParams.get("price") || 0);
      const weight = searchParams.get("weight") || "1";
      if (!cityRef) {
        return NextResponse.json({ cost: 0, demo: true });
      }
      const result = await getDeliveryCost({ cityRef, price, weight });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[api/nova-poshta]", e);
    // Never break checkout — return empty/demo payload
    if (action === "cities") {
      return NextResponse.json({
        cities: [],
        demo: true,
        error: "Service unavailable",
      });
    }
    if (action === "warehouses") {
      return NextResponse.json({
        warehouses: [],
        demo: true,
        error: "Service unavailable",
      });
    }
    return NextResponse.json({
      cost: 90,
      demo: true,
      error: "Service unavailable",
    });
  }
}
