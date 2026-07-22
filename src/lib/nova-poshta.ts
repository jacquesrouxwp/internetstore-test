/**
 * Server-only Nova Poshta API client.
 * Key from NOVA_POSHTA_API_KEY — never expose to the browser.
 */

const NP_API = "https://api.novaposhta.ua/v2.0/json/";

export type NpCity = {
  Ref: string;
  Description: string;
  Area?: string;
};

export type NpWarehouse = {
  Ref: string;
  Description: string;
  Number?: string;
  ShortAddress?: string;
  Category?: string;
};

type NpResponse<T = unknown> = {
  success?: boolean;
  data?: T;
  errors?: string[];
  errorCodes?: string[];
  warnings?: string[];
  info?: unknown;
};

/** Simple TTL cache (server process memory) */
const cache = new Map<string, { at: number; data: unknown }>();
const CITY_TTL_MS = 10 * 60 * 1000; // 10 min
const WH_TTL_MS = 30 * 60 * 1000; // 30 min

function cacheGet<T>(key: string, ttl: number): T | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttl) {
    cache.delete(key);
    return null;
  }
  return hit.data as T;
}

function cacheSet(key: string, data: unknown) {
  cache.set(key, { at: Date.now(), data });
  // soft cap
  if (cache.size > 500) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

export function hasNovaPoshtaKey(): boolean {
  return Boolean(process.env.NOVA_POSHTA_API_KEY?.trim());
}

export async function npCall<T = unknown>(
  modelName: string,
  calledMethod: string,
  methodProperties: Record<string, unknown> = {}
): Promise<{ ok: true; data: T } | { ok: false; error: string; demo?: boolean }> {
  const apiKey = process.env.NOVA_POSHTA_API_KEY?.trim() || "";
  if (!apiKey) {
    return { ok: false, error: "NOVA_POSHTA_API_KEY not set", demo: true };
  }

  try {
    const res = await fetch(NP_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        modelName,
        calledMethod,
        methodProperties,
      }),
      // do not use next.revalidate on mutating POST with different bodies
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Nova Poshta HTTP ${res.status}`,
      };
    }

    const json = (await res.json()) as NpResponse<T>;

    if (!json.success) {
      const msg =
        (Array.isArray(json.errors) && json.errors.filter(Boolean).join("; ")) ||
        "Nova Poshta API error";
      console.error("[nova-poshta]", calledMethod, msg, json.errorCodes);
      return { ok: false, error: msg };
    }

    return { ok: true, data: json.data as T };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nova Poshta request failed";
    console.error("[nova-poshta]", calledMethod, msg);
    return { ok: false, error: msg };
  }
}

/** Demo fallback when key missing or API down */
export const DEMO_CITIES: NpCity[] = [
  { Ref: "8d5a980d-391c-11dd-90d9-001a92567626", Description: "Київ" },
  { Ref: "db5c88de-391c-11dd-90d9-001a92567626", Description: "Львів" },
  { Ref: "db5c88f0-391c-11dd-90d9-001a92567626", Description: "Одеса" },
  { Ref: "db5c88e0-391c-11dd-90d9-001a92567626", Description: "Харків" },
  { Ref: "db5c88f5-391c-11dd-90d9-001a92567626", Description: "Дніпро" },
];

const DEMO_WH: Record<string, NpWarehouse[]> = {
  "8d5a980d-391c-11dd-90d9-001a92567626": [
    {
      Ref: "demo-k1",
      Description: "Відділення №1: вул. Пирогівський шлях, 135",
      Number: "1",
      ShortAddress: "вул. Пирогівський шлях, 135",
      Category: "Branch",
    },
    {
      Ref: "demo-k2",
      Description: "Відділення №2: вул. Богатирська, 11",
      Number: "2",
      ShortAddress: "вул. Богатирська, 11",
      Category: "Branch",
    },
    {
      Ref: "demo-k3",
      Description: "Поштомат №301: бульв. Лесі Українки, 26",
      Number: "301",
      ShortAddress: "бульв. Лесі Українки, 26",
      Category: "Postomat",
    },
  ],
  "db5c88de-391c-11dd-90d9-001a92567626": [
    {
      Ref: "demo-l1",
      Description: "Відділення №1: вул. Городоцька, 359",
      Number: "1",
      ShortAddress: "вул. Городоцька, 359",
      Category: "Branch",
    },
  ],
};

function filterDemoCities(q: string): NpCity[] {
  const s = q.toLowerCase().trim();
  if (!s) return DEMO_CITIES;
  return DEMO_CITIES.filter((c) => c.Description.toLowerCase().includes(s));
}

/**
 * Address → searchSettlements (preferred autocomplete)
 * Falls back to getCities, then demo list.
 */
export async function searchCities(query: string): Promise<{
  cities: NpCity[];
  demo: boolean;
  error?: string;
}> {
  const q = query.trim();
  if (q.length < 2) {
    return { cities: [], demo: false };
  }

  const cacheKey = `cities:${q.toLowerCase()}`;
  const cached = cacheGet<{ cities: NpCity[]; demo: boolean }>(
    cacheKey,
    CITY_TTL_MS
  );
  if (cached) return cached;

  // 1) searchSettlements
  const settled = await npCall<
    Array<{
      TotalCount?: string;
      Addresses?: Array<{
        Present?: string;
        MainDescription?: string;
        Area?: string;
        DeliveryCity?: string;
        Ref?: string;
      }>;
    }>
  >("Address", "searchSettlements", {
    CityName: q,
    Limit: "20",
    Page: "1",
  });

  if (settled.ok) {
    const addresses = settled.data?.[0]?.Addresses || [];
    const cities: NpCity[] = addresses
      .map((a) => ({
        Ref: String(a.DeliveryCity || a.Ref || ""),
        Description: String(
          a.Present || a.MainDescription || ""
        ).trim(),
        Area: a.Area,
      }))
      .filter((c) => c.Ref && c.Description);

    if (cities.length) {
      const result = { cities, demo: false };
      cacheSet(cacheKey, result);
      return result;
    }
  }

  // 2) getCities fallback
  const citiesRes = await npCall<
    Array<{ Ref: string; Description: string; AreaDescription?: string }>
  >("Address", "getCities", {
    FindByString: q,
    Limit: "20",
  });

  if (citiesRes.ok && Array.isArray(citiesRes.data)) {
    const cities: NpCity[] = citiesRes.data
      .map((c) => ({
        Ref: String(c.Ref),
        Description: String(c.Description || "").trim(),
        Area: c.AreaDescription,
      }))
      .filter((c) => c.Ref && c.Description);

    if (cities.length) {
      const result = { cities, demo: false };
      cacheSet(cacheKey, result);
      return result;
    }
  }

  // 3) Demo / graceful degrade
  const demo = {
    cities: filterDemoCities(q),
    demo: true as const,
    error:
      settled.ok === false
        ? settled.error
        : citiesRes.ok === false
          ? citiesRes.error
          : "No cities found",
  };
  cacheSet(cacheKey, demo);
  return demo;
}

/**
 * Address → getWarehouses for CityRef.
 * Optional FindByString for server-side filter.
 */
export async function getWarehouses(
  cityRef: string,
  find?: string
): Promise<{
  warehouses: NpWarehouse[];
  demo: boolean;
  error?: string;
}> {
  const ref = cityRef.trim();
  if (!ref) {
    return { warehouses: [], demo: false, error: "cityRef required" };
  }

  const findKey = (find || "").trim().toLowerCase();
  const cacheKey = `wh:${ref}:${findKey}`;
  const cached = cacheGet<{ warehouses: NpWarehouse[]; demo: boolean }>(
    cacheKey,
    WH_TTL_MS
  );
  if (cached) return cached;

  // Full list cache (no find) — filter client-side when possible
  const fullKey = `wh:${ref}:`;
  if (findKey) {
    const full = cacheGet<{ warehouses: NpWarehouse[]; demo: boolean }>(
      fullKey,
      WH_TTL_MS
    );
    if (full?.warehouses?.length) {
      const filtered = {
        warehouses: full.warehouses.filter((w) =>
          `${w.Description} ${w.Number || ""} ${w.ShortAddress || ""}`
            .toLowerCase()
            .includes(findKey)
        ),
        demo: full.demo,
      };
      cacheSet(cacheKey, filtered);
      return filtered;
    }
  }

  const props: Record<string, unknown> = {
    CityRef: ref,
    Limit: "500",
    Page: "1",
  };
  if (findKey) {
    props.FindByString = find!.trim();
  }

  const res = await npCall<
    Array<{
      Ref: string;
      Description?: string;
      Number?: string;
      ShortAddress?: string;
      CategoryOfWarehouse?: string;
    }>
  >("Address", "getWarehouses", props);

  if (res.ok && Array.isArray(res.data)) {
    const warehouses: NpWarehouse[] = res.data
      .map((w) => {
        const number = w.Number != null ? String(w.Number) : undefined;
        const short = w.ShortAddress ? String(w.ShortAddress) : undefined;
        const desc =
          String(w.Description || "").trim() ||
          [number ? `№${number}` : "", short].filter(Boolean).join(": ");
        return {
          Ref: String(w.Ref),
          Description: desc,
          Number: number,
          ShortAddress: short,
          Category: w.CategoryOfWarehouse
            ? String(w.CategoryOfWarehouse)
            : undefined,
        };
      })
      .filter((w) => w.Ref && w.Description);

    const result = { warehouses, demo: false };
    cacheSet(cacheKey, result);
    if (!findKey) cacheSet(fullKey, result);
    return result;
  }

  // Demo fallback
  const list =
    DEMO_WH[ref] ||
    Object.values(DEMO_WH)[0] ||
    [];
  let warehouses = list;
  if (findKey) {
    warehouses = list.filter((w) =>
      `${w.Description} ${w.Number || ""}`.toLowerCase().includes(findKey)
    );
  }
  const demo = {
    warehouses,
    demo: true as const,
    error: res.ok === false ? res.error : "No warehouses",
  };
  cacheSet(cacheKey, demo);
  return demo;
}

export async function getDeliveryCost(opts: {
  cityRef: string;
  weight?: string;
  price: number;
}): Promise<{ cost: number; demo: boolean; error?: string }> {
  const cacheKey = `cost:${opts.cityRef}:${opts.weight || "1"}:${opts.price}`;
  const cached = cacheGet<{ cost: number; demo: boolean }>(cacheKey, CITY_TTL_MS);
  if (cached) return cached;

  const sender = process.env.NOVA_POSHTA_SENDER_CITY_REF?.trim();
  if (!sender || !hasNovaPoshtaKey()) {
    const cost = opts.price >= 50000 ? 0 : 90;
    return { cost, demo: true };
  }

  const res = await npCall<Array<{ Cost?: string | number }>>(
    "InternetDocument",
    "getDocumentPrice",
    {
      CitySender: sender,
      CityRecipient: opts.cityRef,
      Weight: opts.weight || "1",
      ServiceType: "WarehouseWarehouse",
      Cost: String(opts.price),
      CargoType: "Cargo",
      SeatsAmount: "1",
    }
  );

  if (res.ok && res.data?.[0]?.Cost != null) {
    const result = { cost: Number(res.data[0].Cost), demo: false };
    cacheSet(cacheKey, result);
    return result;
  }

  const cost = opts.price >= 50000 ? 0 : 90;
  return {
    cost,
    demo: true,
    error: res.ok === false ? res.error : undefined,
  };
}
