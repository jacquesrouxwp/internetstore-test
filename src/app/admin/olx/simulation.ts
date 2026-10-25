"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buyPrices, type OlxModel, type TerminalDeal } from "@/lib/olx-terminal";

/**
 * Demo of the Pro terminal: 10 made-up sellers over 5 minutes. The bot asks
 * for the condition out of 10, the box and the documents, takes the owner's
 * range for that state and bargains within it: without the "наш ОК" tick it
 * buys and sends our address by itself, with it — waits for the owner.
 * Nothing leaves the browser: no API calls, no messages to anyone.
 */

export const SIM_SECONDS = 300;
const SELLERS = 10;

// Made-up delivery address for the demo
const SHIP_TO = "Нова пошта, відділення №999, м. Київ, вул. Пушкіна, буд. Колотушкіна. Отримувач: Демо Покупець, 0990000000";

// Used when the owner has no priced models yet — demo numbers, not real prices
const tier = (from: number, to: number, needs_ok = false) => ({ from, to, needs_ok });
const DEMO_MODELS: OlxModel[] = [
  { id: "demo-1", name: "Тепловізор (демо) A35", product_slug: null, brand: null, category: null, aliases: [], notes: null,
    tiers: { new_full: tier(34000, 40000), new_bare: tier(30000, 35000), g9: tier(27000, 32000), g8: tier(23000, 28000, true), g7: tier(19000, 23000, true) } },
  { id: "demo-2", name: "Тепловізор (демо) B19", product_slug: null, brand: null, category: null, aliases: [], notes: null,
    tiers: { new_full: tier(15000, 18000), new_bare: tier(13000, 15500), g9: tier(11500, 14000), g8: tier(10000, 12000) } },
  { id: "demo-3", name: "Приціл (демо) C50", product_slug: null, brand: null, category: null, aliases: [], notes: null,
    tiers: { new_full: tier(50000, 58000, true), new_bare: tier(45000, 52000, true), g9: tier(40000, 47000), g8: tier(35000, 41000, true) } },
];

type Stage = "wait" | "ask" | "cond" | "offer" | "reply" | "needs_ok" | "agreed" | "done";
export type SimItem = { grade: number; has_box: boolean; has_docs: boolean; kit: string; defect?: boolean };
/** Where the seller's lowest price sits: under our "від", inside our range, or above our "до". */
type Floor = "cheap" | "in" | "high";
type SimDeal = {
  row: TerminalDeal;
  model: OlxModel;
  item: SimItem;
  floor: Floor;
  /** The seller's lowest price, known once the item's state is */
  min: number;
  stage: Stage;
  at: number;
  round: number;
};

const NAMES = ["Олег", "Андрій", "Сергій", "Віталій", "Ігор", "Максим", "Дмитро", "Юрій", "Роман", "Богдан"];
const CITIES = ["Київ", "Львів", "Дніпро", "Одеса", "Харків", "Вінниця", "Полтава", "Житомир", "Рівне", "Черкаси"];
// 3 sellers go under our "від", 5 stop inside the range, 2 stay above our "до"
const FLOORS: Floor[] = ["cheap", "cheap", "cheap", "in", "in", "in", "in", "in", "high", "high"];
const ITEMS: SimItem[] = [
  { grade: 10, has_box: true, has_docs: true, kit: "не користувався, плівки на місці" },
  { grade: 10, has_box: false, has_docs: false, kit: "новий, без коробки" },
  { grade: 9, has_box: true, has_docs: true, kit: "кейс, зарядка" },
  { grade: 9, has_box: false, has_docs: true, kit: "чохол" },
  { grade: 8, has_box: true, has_docs: false, kit: "дві батареї" },
  { grade: 7, has_box: false, has_docs: false, kit: "тільки прилад і кабель" },
  { grade: 6, has_box: true, has_docs: true, kit: "тріщина на корпусі", defect: true },
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const r100 = (x: number) => Math.round(x / 100) * 100;
const uah = (n: number) => new Intl.NumberFormat("uk-UA").format(n);
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

function sellerSays(it: SimItem): string {
  const cond = it.defect ? `є дефект — ${it.kit}` : it.grade === 10 ? "новий, не користувався" : `стан ${it.grade} з 10`;
  const box = it.has_box ? "коробка є" : "коробки нема";
  const docs = it.has_docs ? "документи є" : "доків нема";
  return `${cond}, ${box}, ${docs}${it.defect ? "" : `. в комплекті: ${it.kit}`}`;
}

/** The most this model is ever worth to us — for the made-up asking prices. */
const topOf = (m: OlxModel) => Math.max(...Object.values(m.tiers).map((t) => t?.to ?? 0), 10000);

export function createDeals(models: OlxModel[], items: SimItem[] = ITEMS): SimDeal[] {
  const pool = shuffle(models);
  const floors = shuffle(FLOORS);
  const now = Date.now();
  let arrive = 2;
  return Array.from({ length: SELLERS }, (_, i) => {
    const model = pool[i % pool.length];
    const item = pick(items);
    const at = arrive;
    arrive += rnd(6, 14);
    const iso = new Date(now).toISOString();
    const row: TerminalDeal = {
      id: `sim-${i}`,
      olx_url: "https://www.olx.ua/",
      title: model.name,
      seller_name: NAMES[i],
      city: CITIES[i],
      listed_at: new Date(now - rnd(3, 400) * 60000).toISOString(),
      product_slug: null,
      model_id: model.id,
      model: model.name,
      condition: null,
      grade: null,
      has_box: null,
      has_docs: null,
      kit: null,
      condition_notes: null,
      asking_price: r100(topOf(model) * rnd(1.05, 1.5)),
      our_offer: null,
      bargain_at: null,
      final_price: null,
      status: "new",
      owner_decision: null,
      owner_decision_at: null,
      notes: null,
      chat: [],
      outbox: [],
      refresh_requested_at: null,
      created_at: iso,
      updated_at: iso,
      buy: null,
    };
    row.buy = buyPrices(model, row);
    return { row, model, item, floor: floors[i], min: 0, stage: "wait", at, round: 0 };
  });
}

function say(d: SimDeal, from: "us" | "seller", text: string) {
  const at = new Date().toISOString();
  d.row = { ...d.row, chat: [...d.row.chat, { at, from, text }], updated_at: at };
}
function set(d: SimDeal, patch: Partial<TerminalDeal>) {
  const row = { ...d.row, ...patch, updated_at: new Date().toISOString() };
  d.row = { ...row, buy: buyPrices(d.model, row) };
}

/** The seller's lowest price for this item, against our range for its state. */
function floorOf(d: SimDeal): number {
  const b = d.row.buy;
  const to = b?.to ?? r100(topOf(d.model) * 0.7);
  const from = b?.from ?? r100(to * 0.85);
  if (d.floor === "cheap") return r100(from * rnd(0.9, 1));
  if (d.floor === "in") return r100(from + (to - from) * rnd(0.3, 1));
  return r100(to * rnd(1.12, 1.3));
}

/** Within our range: buy and send the address, or ask the owner when ticked, a defect or no price. */
function settle(d: SimDeal, price: number, t: number) {
  const b = d.row.buy;
  if (b?.to && !b.needs_ok && !b.owner_only && !b.unknown.length && price <= b.to) {
    set(d, { asking_price: price, bargain_at: price, our_offer: price, final_price: price });
    say(d, "us", `Домовились! 🙌 Відправляйте на: ${SHIP_TO}`);
    d.stage = "agreed";
    d.at = t + rnd(4, 8);
  } else {
    set(d, { status: "needs_ok", asking_price: price, bargain_at: price });
    say(d, "us", "Зараз уточню і відпишу за хвилинку");
    d.stage = "needs_ok";
    d.at = t + 90; // nobody answers in time — the seller sells to someone else
  }
}

/** Moves every deal whose next step is due; true when anything changed. */
export function step(deals: SimDeal[], t: number): boolean {
  let changed = false;
  for (const d of deals) {
    if (d.stage === "done" || d.at > t) continue;
    changed = true;
    const b = d.row.buy;
    switch (d.stage) {
      case "wait":
        set(d, { created_at: new Date().toISOString(), status: "new" });
        d.stage = "ask";
        d.at = t + rnd(3, 6);
        break;
      case "ask":
        set(d, { status: "negotiating" });
        say(d, "us", pick([
          "Добрий день! Ще актуально? Оцініть, будь ласка, стан з 10, і чи є коробка й документи?",
          "Вітаю! Продаєте ще? Який стан з 10, коробка й документи є?",
        ]));
        d.stage = "cond";
        d.at = t + rnd(6, 12);
        break;
      case "cond":
        say(d, "seller", sellerSays(d.item));
        set(d, {
          grade: d.item.grade,
          condition: d.item.defect ? "defect" : d.item.grade === 10 ? "new" : "used",
          has_box: d.item.has_box,
          has_docs: d.item.has_docs,
          kit: d.item.defect ? null : d.item.kit,
          condition_notes: d.item.defect ? d.item.kit : null,
        });
        d.min = floorOf(d);
        d.stage = "offer";
        d.at = t + rnd(3, 6);
        break;
      case "offer": {
        if (!b?.to) {
          say(d, "us", "Дякую! Дайте хвилинку, уточню і відпишу");
          set(d, { status: "needs_ok" });
          d.stage = "needs_ok";
          d.at = t + 90;
          break;
        }
        const offer = b.from ?? b.to;
        set(d, { our_offer: offer, bargain_at: offer });
        say(d, "us", `Дякую! За такий стан (${b.tier_label?.toLowerCase()}) можу запропонувати ${uah(offer)} грн, забираю сьогодні`);
        d.stage = "reply";
        d.at = t + rnd(6, 12);
        break;
      }
      case "reply": {
        d.round += 1;
        const to = b?.to ?? 0;
        const ask = d.row.asking_price ?? d.min;
        if (d.min <= (d.row.our_offer ?? 0)) {
          const price = d.row.our_offer!;
          say(d, "seller", pick([`ну давайте за ${uah(price)}, забирайте`, `${uah(price)} і домовились`]));
          settle(d, price, t);
          break;
        }
        const counter = d.round === 1 ? Math.max(d.min, r100(d.min + (ask - d.min) * 0.5)) : d.min;
        say(d, "seller", pick([`за ${uah(counter)} віддам, менше ніяк`, `${uah(counter)} і забирайте`, `ну ви даєте... ${uah(counter)} останнє`]));
        set(d, { asking_price: counter });
        if (counter <= to) {
          settle(d, counter, t);
        } else if (d.round < 2) {
          set(d, { our_offer: to, bargain_at: to });
          say(d, "us", `Розумію, але за такий стан ${uah(to)} — наш максимум. Може подумаєте?`);
          d.at = t + rnd(8, 14);
        } else {
          say(d, "us", "Дякую, для нас дорого. Якщо передумаєте — пишіть");
          set(d, { status: "rejected" });
          d.stage = "done";
        }
        break;
      }
      case "needs_ok":
        say(d, "seller", "вже продав, вибачте");
        set(d, { status: "lost" });
        d.stage = "done";
        break;
      case "agreed":
        say(d, "seller", pick(["прийняв, завтра відправлю на 999-те", "ок, відправив, ТТН 20450999999999", "записав адресу, ввечері відправлю"]));
        set(d, { status: "bought" });
        d.stage = "done";
        break;
    }
  }
  return changed;
}

export function useOlxSimulation(ownerModels: OlxModel[]) {
  const priced = useMemo(() => ownerModels.filter((m) => Object.values(m.tiers || {}).some((t) => t?.to)), [ownerModels]);
  const models = priced.length ? priced : DEMO_MODELS;
  const deals = useRef<SimDeal[]>([]);
  const clock = useRef(0);
  const [active, setActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [version, setVersion] = useState(0);
  const [, setTick] = useState(0);

  const start = useCallback(() => {
    deals.current = createDeals(models);
    clock.current = 0;
    setActive(true);
    setRunning(true);
    setVersion((v) => v + 1);
  }, [models]);

  const exit = useCallback(() => {
    setActive(false);
    setRunning(false);
    deals.current = [];
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      clock.current = Math.min(SIM_SECONDS, clock.current + 0.25 * speed);
      if (step(deals.current, clock.current)) setVersion((v) => v + 1);
      if (clock.current >= SIM_SECONDS) setRunning(false);
      setTick((x) => x + 1);
    }, 250);
    return () => clearInterval(id);
  }, [running, speed]);

  // Rows change identity only when a deal moved, so the terminal's flashes behave as live
  const rows = useMemo(
    () => deals.current.filter((d) => d.stage !== "wait").map((d) => d.row),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );

  const decide = useCallback(async (id: string, body: Record<string, unknown>) => {
    const d = deals.current.find((x) => x.row.id === id);
    if (!d) return;
    const now = new Date().toISOString();
    if (typeof body.send === "string" && body.send.trim()) say(d, "us", body.send.trim());
    if (body.decision === "ok" && d.stage !== "done") {
      const price = Math.round(Number(body.price));
      set(d, { owner_decision: `ok ${price}`, owner_decision_at: now, status: "negotiating", our_offer: price, bargain_at: price, final_price: price });
      say(d, "us", `Ок, ${uah(price)} грн — беру. Відправляйте на: ${SHIP_TO}`);
      d.stage = "agreed";
      d.at = clock.current + rnd(4, 8);
    } else if (body.decision === "no" && d.stage !== "done") {
      set(d, { owner_decision: "ні", owner_decision_at: now, status: "rejected" });
      say(d, "us", "Дякую, не підходить");
      d.stage = "done";
    }
    setVersion((v) => v + 1);
  }, []);

  return {
    active,
    running,
    finished: active && !running && clock.current >= SIM_SECONDS,
    left: Math.max(0, Math.ceil(SIM_SECONDS - clock.current)),
    progress: clock.current / SIM_SECONDS,
    speed,
    setSpeed,
    pause: () => setRunning(false),
    resume: () => clock.current < SIM_SECONDS && setRunning(true),
    start,
    exit,
    rows,
    models,
    demoPrices: !priced.length,
    decide,
  };
}
