import { NextRequest, NextResponse } from "next/server";

const API = "https://api.novaposhta.ua/v2.0/json/";

async function npCall(modelName: string, calledMethod: string, methodProperties: object) {
  const apiKey = process.env.NOVA_POSHTA_API_KEY || "";
  if (!apiKey) {
    return null;
  }
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      modelName,
      calledMethod,
      methodProperties,
    }),
    next: { revalidate: 3600 },
  });
  return res.json();
}

/** Demo cities/warehouses when API key is missing */
const DEMO_CITIES = [
  { Ref: "kyiv", Description: "Київ" },
  { Ref: "lviv", Description: "Львів" },
  { Ref: "odesa", Description: "Одеса" },
  { Ref: "kharkiv", Description: "Харків" },
  { Ref: "dnipro", Description: "Дніпро" },
];

const DEMO_WH: Record<string, { Ref: string; Description: string }[]> = {
  kyiv: [
    { Ref: "k1", Description: "Відділення №1: вул. Пирогівський шлях, 135" },
    { Ref: "k2", Description: "Відділення №2: вул. Богатирська, 11" },
    { Ref: "k3", Description: "Відділення №5: бульв. Лесі Українки, 26" },
  ],
  lviv: [
    { Ref: "l1", Description: "Відділення №1: вул. Городоцька, 359" },
    { Ref: "l2", Description: "Відділення №3: вул. Сихівська, 16" },
  ],
  odesa: [{ Ref: "o1", Description: "Відділення №1: вул. Мала Арнаутська, 71" }],
  kharkiv: [{ Ref: "h1", Description: "Відділення №1: вул. Полтавський Шлях, 154" }],
  dnipro: [{ Ref: "d1", Description: "Відділення №1: вул. Робоча, 148" }],
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  if (action === "cities") {
    const q = (searchParams.get("q") || "").toLowerCase();
    const data = await npCall("Address", "searchSettlements", {
      CityName: searchParams.get("q") || "",
      Limit: 10,
    });

    if (data?.success && data.data?.[0]?.Addresses) {
      const cities = data.data[0].Addresses.map(
        (a: { DeliveryCity: string; Present: string }) => ({
          Ref: a.DeliveryCity,
          Description: a.Present,
        })
      );
      return NextResponse.json({ cities, demo: false });
    }

    const cities = DEMO_CITIES.filter((c) =>
      c.Description.toLowerCase().includes(q)
    );
    return NextResponse.json({ cities, demo: true });
  }

  if (action === "warehouses") {
    const cityRef = searchParams.get("cityRef") || "";
    const data = await npCall("Address", "getWarehouses", {
      CityRef: cityRef,
      Limit: 50,
    });

    if (data?.success && data.data) {
      const warehouses = data.data.map(
        (w: { Ref: string; Description: string }) => ({
          Ref: w.Ref,
          Description: w.Description,
        })
      );
      return NextResponse.json({ warehouses, demo: false });
    }

    return NextResponse.json({
      warehouses: DEMO_WH[cityRef] || DEMO_WH.kyiv,
      demo: true,
    });
  }

  if (action === "cost") {
    const price = Number(searchParams.get("price") || 0);
    const data = await npCall("InternetDocument", "getDocumentPrice", {
      CitySender: process.env.NOVA_POSHTA_SENDER_CITY_REF || "",
      CityRecipient: searchParams.get("cityRef") || "",
      Weight: searchParams.get("weight") || "1",
      ServiceType: "WarehouseWarehouse",
      Cost: String(price),
      CargoType: "Cargo",
      SeatsAmount: "1",
    });

    if (data?.success && data.data?.[0]) {
      return NextResponse.json({
        cost: Number(data.data[0].Cost),
        demo: false,
      });
    }

    // Demo flat rate under free shipping threshold
    const cost = price >= 50000 ? 0 : 90;
    return NextResponse.json({ cost, demo: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
