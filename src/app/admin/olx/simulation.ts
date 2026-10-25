"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONDITION_LABEL, buyPrices, type OlxCondition, type OlxModel, type TerminalDeal } from "@/lib/olx-terminal";

/**
 * Demo of the Pro terminal: 10 made-up sellers over 5 minutes. The bot asks
 * about condition, box and documents first, works out this item's target and
 * ceiling from the model's prices, and bargains: at or under the target it
 * buys, between target and ceiling it waits for the owner's ок, above it
 * passes. Nothing leaves the browser: no API calls, no messages to anyone.
 */

export const SIM_SECONDS = 300;
const SELLERS = 10;

// Made-up delivery address for the demo
const SHIP_TO = "Нова пошта, відділення №999, м. Київ, вул. Пушкіна, буд. Колотушкіна. Отримувач: Демо Покупець, 0990000000";

// Used when the owner has no priced models yet — demo numbers, not real prices
const DEMO_MODELS: OlxModel[] = [
  { id: "demo-1", name: "Тепловізор (демо) A35", aliases: [], category: null, target_price: 30000, ceiling_price: 38000, adjust: { new: 3000, used: 4000, no_box: 1500, no_docs: 2000 }, notes: null },
  { id: "demo-2", name: "Тепловізор (демо) B19", aliases: [], category: null, target_price: 14000, ceiling_price: 18000, adjust: { new: 1500, used: 2000, no_box: 800, no_docs: 1000 }, notes: null },
  { id: "demo-3", name: "Приціл (демо) C50", aliases: [], category: null, target_price: 45000, ceiling_price: 56000, adjust: { new: 4000, used: 6000, no_box: 2000, no_docs: 3000 }, notes: null },
  { id: "demo-4", name: "Монокуляр (демо) D25", aliases: [], category: null, target_price: 22000, ceiling_price: 27000, adjust: { used: 3000, no_box: 1000, no_docs: 1500 }, notes: null },
];

type Stage = "wait" | "ask" | "cond" | "offer" | "reply" | "needs_ok" | "agreed" | "done";
type Item = { condition: OlxCondition; has_box: boolean; has_docs: boolean; kit: string };
/** Where the seller's lowest price sits: under our target, in the owner's zone, or above our ceiling. */
type Floor = "low" | "mid" | "high";
type SimDeal = {
  row: TerminalDeal;
  model: OlxModel;
  item: Item;
  floor: Floor;
  /** The seller's lowest price, known once the item's condition is */
  min: number;
  stage: Stage;
  at: number;
  round: number;
};

const NAMES = ["Олег", "Андрій", "Сергій", "Віталій", "Ігор", "Максим", "Дмитро", "Юрій", "Роман", "Богдан"];
const CITIES = ["Київ", "Львів", "Дніпро", "Одеса", "Харків", "Вінниця", "Полтава", "Житомир", "Рівне", "Черкаси"];
// 3 sellers come down to our target, 5 stop between target and ceiling, 2 stay above it
const FLOORS: Floor[] = ["low", "low", "low", "mid", "mid", "mid", "mid", "mid", "high", "high"];
const ITEMS: Item[] = [
  { condition: "like_new", has_box: true, has_docs: true, kit: "повний комплект" },
  { condition: "like_new", has_box: true, has_docs: false, kit: "кейс, зарядка" },
  { condition: "used", has_box: false, has_docs: false, kit: "тільки прилад і кабель" },
  { condition: "new", has_box: true, has_docs: true, kit: "не користувався" },
  { condition: "used", has_box: true, has_docs: true, kit: "дві батареї" },
  { condition: "like_new", has_box: false, has_docs: true, kit: "чохол" },
  { condition: "defect", has_box: true, has_docs: false, kit: "тріщина на корпусі" },
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const r100 = (x: number) => Math.round(x / 100) * 100;
const uah = (n: number) => new Intl.NumberFormat("uk-UA").format(n);
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

function sellerSays(it: Item): string {
  const cond = { new: "нове, не користувався", like_new: "стан ідеал", used: "є потертості, все працює", defect: `є дефект — ${it.kit}` }[it.condition];
  const box = it.has_box ? "коробка є" : "коробки нема";
  const docs = it.has_docs ? "документи є" : "доків нема";
  return `${cond}, ${box}, ${docs}${it.condition === "defect" ? "" : `. в комплекті: ${it.kit}`}`;
}

export function createDeals(models: OlxModel[], items: Item[] = ITEMS): SimDeal[] {
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
      has_box: null,
      has_docs: null,
      kit: null,
      condition_notes: null,
      asking_price: r100((model.ceiling_price || model.target_price!) * rnd(1.15, 1.6)),
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

/** The seller's lowest price for this item, against our prices for its condition. */
function floorOf(d: SimDeal): number {
  const b = d.row.buy!;
  if (d.floor === "low") return r100(b.target * rnd(0.9, 1));
  if (d.floor === "mid") return r100(b.target + (b.ceiling - b.target) * rnd(0.25, 0.95));
  return r100(b.ceiling * rnd(1.12, 1.3));
}

/** Moves every deal whose next step is due; true when anything changed. */
export function step(deals: SimDeal[], t: number): boolean {
  let changed = false;
  for (const d of deals) {
    if (d.stage === "done" || d.at > t) continue;
    changed = true;
    const b = d.row.buy!;
    switch (d.stage) {
      case "wait":
        set(d, { created_at: new Date().toISOString(), status: "new" });
        d.stage = "ask";
        d.at = t + rnd(3, 6);
        break;
      case "ask":
        set(d, { status: "negotiating" });
        say(d, "us", pick([
          "Добрий день! Ще актуально? Підкажіть, який стан, чи є коробка і документи?",
          "Вітаю! Продаєте ще? Що по стану, коробка й документи є?",
        ]));
        d.stage = "cond";
        d.at = t + rnd(6, 12);
        break;
      case "cond":
        say(d, "seller", sellerSays(d.item));
        set(d, { ...d.item, condition_notes: d.item.condition === "defect" ? d.item.kit : null });
        d.min = floorOf(d);
        d.stage = "offer";
        d.at = t + rnd(3, 6);
        break;
      case "offer": {
        const offer = r100(b.target * 0.88);
        const how = [CONDITION_LABEL[d.item.condition], d.item.has_box ? "" : "без коробки", d.item.has_docs ? "" : "без документів"].filter(Boolean).join(", ");
        set(d, { our_offer: offer, bargain_at: offer });
        say(d, "us", `Дякую! Для такого стану (${how}) можу запропонувати ${uah(offer)} грн, забираю сьогодні`);
        d.stage = "reply";
        d.at = t + rnd(6, 12);
        break;
      }
      case "reply": {
        d.round += 1;
        const ask = d.row.asking_price ?? d.min;
        if (d.min <= b.target && !b.owner_only) {
          const price = Math.max(d.row.our_offer ?? 0, d.min);
          say(d, "seller", pick([`ну давайте за ${uah(price)}, забирайте`, `${uah(price)} і домовились`]));
          set(d, { asking_price: price, bargain_at: price, our_offer: price, final_price: price });
          say(d, "us", `Домовились! 🙌 Відправляйте на: ${SHIP_TO}`);
          d.stage = "agreed";
          d.at = t + rnd(4, 8);
          break;
        }
        const counter = d.round === 1 ? Math.max(d.min, r100(d.min + (ask - d.min) * 0.5)) : d.min;
        set(d, { asking_price: counter });
        say(d, "seller", pick([`за ${uah(counter)} віддам, менше ніяк`, `${uah(counter)} і забирайте`, `ну ви даєте... ${uah(counter)} останнє`]));
        if (counter <= b.ceiling) {
          set(d, { status: "needs_ok", bargain_at: counter });
          say(d, "us", "Зараз уточню і відпишу за хвилинку");
          d.stage = "needs_ok";
          d.at = t + 90; // nobody answers in time — the seller sells to someone else
        } else if (d.round < 2) {
          set(d, { our_offer: b.target, bargain_at: b.target });
          say(d, "us", `Розумію, але для такого стану ${uah(b.target)} — наш максимум. Може подумаєте?`);
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
  const priced = useMemo(() => ownerModels.filter((m) => m.target_price), [ownerModels]);
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
