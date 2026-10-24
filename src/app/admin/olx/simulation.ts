"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { priceWindow } from "@/lib/olx-terminal";
import type { ProRow } from "./ProTerminal";

/**
 * Demo of the Pro terminal: 10 made-up sellers over 5 minutes, bargained with
 * by the same rules the real bots follow — 20 % of our new price is bought at
 * once, 20–35 % waits for the owner's ок, above 35 % is turned down. Nothing
 * leaves the browser: no API calls, no messages to anyone.
 */

export const SIM_SECONDS = 300;
const SELLERS = 10;

export type SimModel = { slug: string; name: string; n: number };

type Stage = "wait" | "open" | "reply" | "needs_ok" | "agreed" | "done";
type SimDeal = { row: ProRow; stage: Stage; at: number; round: number; floor: number };

const NAMES = ["Олег", "Андрій", "Сергій", "Віталій", "Ігор", "Максим", "Дмитро", "Юрій", "Роман", "Богдан"];
const CITIES = ["Київ", "Львів", "Дніпро", "Одеса", "Харків", "Вінниця", "Полтава", "Житомир", "Рівне", "Черкаси"];
// Lowest share of the new price each seller would take: 3 sell at 20 %, 5 land in the owner's zone, 2 are too dear
const FLOORS = [0.17, 0.19, 0.2, 0.23, 0.26, 0.28, 0.31, 0.34, 0.42, 0.5];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const r100 = (x: number) => Math.round(x / 100) * 100;
const uah = (n: number) => new Intl.NumberFormat("uk-UA").format(n);
const shuffle = <T,>(a: T[]) => a.map((v) => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(([, v]) => v);

export function createDeals(models: SimModel[]): SimDeal[] {
  const pool = shuffle(models);
  const floors = shuffle(FLOORS);
  const now = Date.now();
  let arrive = 2;
  return Array.from({ length: SELLERS }, (_, i) => {
    const m = pool[i % pool.length];
    const floor = floors[i];
    const ask = r100(m.n * Math.max(floor + 0.08, rnd(0.33, 0.58)));
    const at = arrive;
    arrive += rnd(6, 16);
    const iso = new Date(now).toISOString();
    return {
      stage: "wait",
      at,
      round: 0,
      floor,
      row: {
        id: `sim-${i}`,
        olx_url: "https://www.olx.ua/",
        title: m.name,
        seller_name: NAMES[i],
        city: CITIES[i],
        listed_at: new Date(now - rnd(3, 400) * 60000).toISOString(),
        product_slug: m.slug,
        model: m.name,
        product_name: m.name,
        new_price: m.n,
        asking_price: ask,
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
      },
    };
  });
}

function say(d: SimDeal, from: "us" | "seller", text: string) {
  const at = new Date().toISOString();
  d.row = { ...d.row, chat: [...d.row.chat, { at, from, text }], updated_at: at };
}
function set(d: SimDeal, patch: Partial<ProRow>) {
  d.row = { ...d.row, ...patch, updated_at: new Date().toISOString() };
}

/** Moves every deal whose next step is due; true when anything changed. */
export function step(deals: SimDeal[], t: number): boolean {
  let changed = false;
  for (const d of deals) {
    if (d.stage === "done" || d.at > t) continue;
    changed = true;
    const n = d.row.new_price!;
    const w = priceWindow(n)!;
    const name = d.row.model!;
    switch (d.stage) {
      case "wait": {
        const at = new Date().toISOString();
        set(d, { created_at: at, status: "new" });
        d.stage = "open";
        d.at = t + rnd(3, 7);
        break;
      }
      case "open":
        set(d, { our_offer: w.target, bargain_at: w.target, status: "negotiating" });
        say(d, "us", pick([
          `Добрий день! Ще актуально? Можу забрати сьогодні за ${uah(w.target)} грн`,
          `Вітаю, ${name} ще продаєте? Готовий взяти за ${uah(w.target)}, гроші одразу`,
          `Добрий! Актуально? ${uah(w.target)} грн і забираю сьогодні`,
        ]));
        d.stage = "reply";
        d.at = t + rnd(6, 14);
        break;
      case "reply": {
        d.round += 1;
        const floor = r100(d.floor * n);
        if (floor <= w.target) {
          say(d, "seller", pick([`ну давайте, забирайте за ${uah(w.target)}`, "ок, згоден. коли заберете?", "та давайте, мені терміново"]));
          set(d, { bargain_at: w.target, final_price: w.target });
          say(d, "us", "Домовились! Скиньте дані для Нової пошти 🙌");
          d.stage = "agreed";
          d.at = t + rnd(4, 8);
          break;
        }
        const ask = d.row.asking_price ?? floor;
        const counter = d.round === 1 ? Math.max(floor, r100(floor + (ask - floor) * 0.5)) : floor;
        set(d, { asking_price: counter });
        say(d, "seller", pick([`за ${uah(counter)} віддам, менше ніяк`, `${uah(counter)} і забирайте`, `ну ви даєте... ${uah(counter)} останнє`]));
        if (counter <= w.ceiling) {
          set(d, { status: "needs_ok", bargain_at: counter });
          say(d, "us", "Зараз уточню і відпишу за хвилинку");
          d.stage = "needs_ok";
          d.at = t + 90; // nobody answers in time — the seller sells to someone else
        } else if (d.round < 2) {
          say(d, "us", `Розумію, але ${uah(w.target)} — це наш максимум. Може подумаєте?`);
          d.at = t + rnd(8, 15);
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
        say(d, "seller", pick(["давайте, завтра відправлю НП", "ок, пишіть ПІБ і відділення"]));
        set(d, { status: "bought" });
        d.stage = "done";
        break;
    }
  }
  return changed;
}

export function useOlxSimulation(models: SimModel[]) {
  const deals = useRef<SimDeal[]>([]);
  const clock = useRef(0);
  const [active, setActive] = useState(false);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [version, setVersion] = useState(0);
  const [, setTick] = useState(0);

  const start = useCallback(() => {
    deals.current = createDeals(models.length ? models : [{ slug: "demo", name: "Демо-тепловізор", n: 60000 }]);
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
      say(d, "us", `Ок, ${uah(price)} грн — беру. Скиньте дані для Нової пошти`);
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
    decide,
  };
}
