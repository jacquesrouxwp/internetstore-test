"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONDITION_LABEL, STATUS_LABEL, type OlxModel, type OlxStatus, type TerminalDeal } from "@/lib/olx-terminal";
import { useOlxSimulation } from "./simulation";

export type ProRow = TerminalDeal;

type Props = {
  rows: ProRow[];
  models: OlxModel[];
  busy: string | null;
  decide: (id: string, body: Record<string, unknown>) => Promise<void>;
  requestRefresh: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
};

const ACTIVE: OlxStatus[] = ["new", "negotiating", "needs_ok"];
const num = (n: number | null | undefined) => (n ? new Intl.NumberFormat("uk-UA").format(n) : "—");
const short = (n: number) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}к` : String(n));
const minutes = (iso: string | null | undefined) => (iso ? (Date.now() - Date.parse(iso)) / 60000 : Infinity);
function ago(iso: string | null | undefined) {
  const m = Math.round(minutes(iso));
  if (!Number.isFinite(m)) return "—";
  if (m < 1) return "щойно";
  if (m < 60) return `${m} хв`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} год` : `${Math.round(h / 24)} д`;
}
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
const modelOf = (r: ProRow) => r.buy?.model_name || r.model || r.title || "—";
const modelKey = (r: ProRow) => r.buy?.model_id || (r.model || r.title || r.id).toLowerCase();
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const noop = async () => {};

const STATUS_PRO: Record<OlxStatus, string> = {
  new: "bg-sky-500/15 text-sky-300",
  negotiating: "bg-zinc-500/20 text-zinc-300",
  needs_ok: "bg-amber-400/20 text-amber-300",
  bought: "bg-emerald-500/20 text-emerald-300",
  rejected: "bg-zinc-600/20 text-zinc-500",
  lost: "bg-zinc-600/20 text-zinc-500",
};

/** What the seller says about the item; amber "?" for what the bot has not found out yet. */
function Condition({ r }: { r: ProRow }) {
  const chip = (text: string, tone: "ok" | "bad" | "ask") => (
    <span
      key={text}
      className={`rounded px-1.5 py-px text-[10px] ${
        tone === "ok" ? "bg-emerald-500/15 text-emerald-300" : tone === "bad" ? "bg-rose-500/15 text-rose-300" : "bg-amber-400/15 text-amber-300"
      }`}
    >
      {text}
    </span>
  );
  const yn = (v: boolean | null, yes: string, no: string, ask: string) => (v === true ? chip(yes, "ok") : v === false ? chip(no, "bad") : chip(ask, "ask"));
  return (
    <span className="inline-flex flex-wrap gap-1">
      {r.condition
        ? chip(CONDITION_LABEL[r.condition], r.condition === "defect" ? "bad" : r.condition === "used" ? "ask" : "ok")
        : chip("стан ?", "ask")}
      {yn(r.has_box, "📦 коробка", "без коробки", "коробка ?")}
      {yn(r.has_docs, "📄 документи", "без документів", "документи ?")}
      {r.kit ? <span className="rounded bg-zinc-800 px-1.5 py-px text-[10px] text-zinc-400">{r.kit}</span> : null}
    </span>
  );
}

/** Prices on one scale: green up to the target (the bot buys), amber up to the ceiling (your ок). */
function Ladder({ r, big = false }: { r: ProRow; big?: boolean }) {
  const b = r.buy;
  const top = Math.max(b ? b.ceiling * 1.35 : 0, (r.asking_price ?? 0) * 1.08, 1);
  const pos = (v: number | null | undefined) => (v ? Math.min(100, (v / top) * 100) : null);
  const marks = [
    { v: r.our_offer, cls: "bg-emerald-400", label: "ми" },
    { v: r.bargain_at, cls: "bg-white", label: "торг" },
    { v: r.asking_price, cls: "bg-rose-500", label: "хоче" },
  ];
  const h = big ? "h-2.5" : "h-1.5";
  const greenTo = b && !b.owner_only ? pos(b.target)! : 0;
  const amberTo = b ? pos(b.ceiling)! : 0;
  return (
    <div className="pt-1">
      <div className="relative">
        <div className={`${h} rounded-full bg-zinc-700`} />
        {b ? (
          <>
            <div className={`absolute left-0 top-0 ${h} rounded-l-full bg-emerald-500/50`} style={{ width: `${greenTo}%` }} />
            <div className={`absolute top-0 ${h} bg-amber-400/40`} style={{ left: `${greenTo}%`, width: `${amberTo - greenTo}%` }} />
          </>
        ) : null}
        {marks.map((m) =>
          pos(m.v) != null ? (
            <div
              key={m.label}
              title={`${m.label}: ${num(m.v)}`}
              className={`absolute ${big ? "-top-1.5 h-5" : "-top-1 h-3.5"} w-[3px] rounded ${m.cls}`}
              style={{ left: `calc(${pos(m.v)}% - 1px)` }}
            />
          ) : null,
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 font-mono text-[12px] tabular-nums">
        <span className="text-rose-300">хоче {num(r.asking_price)}</span>
        {r.bargain_at && r.bargain_at !== r.our_offer ? <span className="text-zinc-100">торг {num(r.bargain_at)}</span> : null}
        <span className="text-emerald-300">ми {num(r.our_offer)}</span>
        {r.final_price ? <span className="text-emerald-200">куплено {num(r.final_price)}</span> : null}
        {b ? (
          <span className="ml-auto text-zinc-400">
            ціль <span className="text-emerald-300">{num(b.target)}</span> · стеля <span className="text-amber-300">{num(b.ceiling)}</span>
          </span>
        ) : (
          <span className="ml-auto text-amber-300/80">немає ціни на модель</span>
        )}
      </div>
    </div>
  );
}

/** How this item's target and ceiling came out of the model's prices. */
function PriceSteps({ r, models }: { r: ProRow; models: OlxModel[] }) {
  const b = r.buy;
  if (!b) {
    return (
      <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[12px] text-amber-200">
        Ціни на «{r.model || r.title || "цю модель"}» ще немає — бот не знає, скільки пропонувати. Додайте її у вкладці «Моделі й ціни».
      </p>
    );
  }
  const m = models.find((x) => x.id === b.model_id);
  return (
    <div className="mt-2 rounded-lg bg-zinc-950/60 px-2.5 py-1.5 font-mono text-[12px] text-zinc-400">
      <span>модель {num(m?.target_price)} / {num(m?.ceiling_price || m?.target_price)}</span>
      {b.steps.map((s) => (
        <span key={s.label} className={s.amount > 0 ? "text-emerald-300" : "text-rose-300"}>
          {" "}· {s.label} {s.amount > 0 ? "+" : "−"}
          {num(Math.abs(s.amount))}
        </span>
      ))}
      <span className="text-zinc-200">
        {" "}→ для цього: {num(b.target)} / {num(b.ceiling)}
      </span>
      {b.owner_only ? <div className="text-amber-300">Дефект — бот не купує сам, вирішуєте ви.</div> : null}
      {b.unknown.length ? <div className="text-amber-300">Бот має уточнити: {b.unknown.join(", ")} (поки рахуємо як гірший варіант)</div> : null}
    </div>
  );
}

export function ProTerminal(props: Props) {
  const sim = useOlxSimulation(props.models);
  const rows = sim.active ? sim.rows : props.rows;
  const models = sim.active ? sim.models : props.models;
  const busy = sim.active ? null : props.busy;
  const decide = sim.active ? sim.decide : props.decide;
  const requestRefresh = sim.active ? noop : props.requestRefresh;
  const refreshAll = sim.active ? noop : props.refreshAll;

  // Full screen of the browser for the whole terminal
  const root = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.();
  };

  const [onlyActive, setOnlyActive] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "ok" | "no"; price: number } | null>(null);
  const [draft, setDraft] = useState("");
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const prev = useRef<Record<string, { ask: number | null; bargain: number | null; msgs: number }>>({});

  // Freshest deals that need you come first
  const list = useMemo(() => {
    const l = rows.filter((r) => !onlyActive || ACTIVE.includes(r.status));
    const rank = (r: ProRow) => (r.status === "needs_ok" ? 0 : r.status === "new" ? 1 : 2);
    return l.sort((a, b) => rank(a) - rank(b) || Date.parse(b.updated_at) - Date.parse(a.updated_at));
  }, [rows, onlyActive]);

  const current = list.find((r) => r.id === sel) ?? list[0] ?? null;

  // Flash a row when its prices move or a message arrives (green = towards us, red = away)
  useEffect(() => {
    const next: Record<string, "up" | "down"> = {};
    for (const r of rows) {
      const p = prev.current[r.id];
      const msgs = r.chat?.length ?? 0;
      if (p) {
        if ((r.asking_price ?? 0) < (p.ask ?? 0) || (r.bargain_at ?? 0) !== (p.bargain ?? 0) || msgs > p.msgs) next[r.id] = "down";
        if ((r.asking_price ?? 0) > (p.ask ?? 0) && p.ask) next[r.id] = "up";
      }
      prev.current[r.id] = { ask: r.asking_price, bargain: r.bargain_at, msgs };
    }
    if (Object.keys(next).length) {
      setFlash(next);
      const t = setTimeout(() => setFlash({}), 2500);
      return () => clearTimeout(t);
    }
  }, [rows]);

  // Keys: J/K move, O = ок on the bargaining price, N = ні, R = оновити, Enter confirms, Esc cancels
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (!current) return;
      const i = list.findIndex((r) => r.id === current.id);
      const k = e.key.toLowerCase();
      if (k === "j" || e.key === "ArrowDown") { setSel(list[Math.min(list.length - 1, i + 1)]?.id ?? null); setConfirm(null); e.preventDefault(); }
      else if (k === "k" || e.key === "ArrowUp") { setSel(list[Math.max(0, i - 1)]?.id ?? null); setConfirm(null); e.preventDefault(); }
      else if (k === "o" || k === "щ") { const p = current.bargain_at || current.our_offer; if (p) setConfirm({ kind: "ok", price: p }); }
      else if (k === "n" || k === "т") setConfirm({ kind: "no", price: 0 });
      else if (k === "r" || k === "к") void requestRefresh(current.id);
      else if (e.key === "Enter" && confirm) {
        void decide(current.id, confirm.kind === "ok" ? { decision: "ok", price: confirm.price } : { decision: "no" });
        setConfirm(null);
      } else if (e.key === "Escape") setConfirm(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, list, confirm, decide, requestRefresh]);

  const ticker = useMemo(() => {
    const active = rows.filter((r) => ACTIVE.includes(r.status));
    const bought = rows.filter((r) => r.status === "bought" && r.final_price);
    const spent = bought.reduce((s, r) => s + r.final_price!, 0);
    // How much under the ceiling we bought — what bargaining earned
    const under = bought.filter((r) => r.buy).reduce((s, r) => s + Math.max(0, r.buy!.ceiling - r.final_price!), 0);
    const fresh = active.filter((r) => minutes(r.listed_at) < 60).length;
    return { active: active.length, needs: rows.filter((r) => r.status === "needs_ok").length, bought: bought.length, spent, under, fresh };
  }, [rows]);

  // Order book of the selected model: what sellers ask vs what we bid
  const book = useMemo(() => {
    if (!current) return null;
    const same = rows.filter((r) => modelKey(r) === modelKey(current) && ACTIVE.concat("bought").includes(r.status));
    const asks = same.filter((r) => r.asking_price).map((r) => ({ id: r.id, v: r.asking_price! })).sort((a, b) => b.v - a.v);
    const bids = same.flatMap((r) => [r.bargain_at, r.our_offer].filter(Boolean).map((v) => ({ id: r.id, v: v! }))).sort((a, b) => b.v - a.v);
    const uniqBids = bids.filter((b, i) => bids.findIndex((x) => x.v === b.v) === i);
    return { asks, bids: uniqBids, target: current.buy?.target ?? null, ceiling: current.buy?.ceiling ?? null };
  }, [rows, current]);

  // Tape: chat lines, new listings and decisions across every deal
  const tape = useMemo(() => {
    const ev: { at: string; text: string; tone: string; model: string }[] = [];
    for (const r of rows) {
      const m = modelOf(r);
      ev.push({ at: r.created_at, model: m, tone: "text-sky-300", text: `нове · хоче ${num(r.asking_price)}` });
      for (const c of r.chat || []) ev.push({ at: c.at, model: m, tone: c.from === "us" ? "text-emerald-300" : "text-rose-300", text: `${c.from === "us" ? "ми" : r.seller_name || "продавець"}: ${c.text.slice(0, 80)}` });
      if (r.owner_decision_at) ev.push({ at: r.owner_decision_at, model: m, tone: "text-amber-300", text: `ваше рішення: ${r.owner_decision}` });
    }
    return ev.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 40);
  }, [rows]);

  const maxBook = Math.max(1, ...(book?.asks.map((a) => a.v) ?? []), ...(book?.bids.map((b) => b.v) ?? []));
  const vsTarget = (v: number) => {
    if (!book?.target) return "";
    const d = v - book.target;
    return `${d > 0 ? "+" : d < 0 ? "−" : ""}${short(Math.abs(d))}`;
  };

  return (
    <div ref={root} className={`bg-zinc-950 p-4 text-zinc-100 shadow-inner ${full ? "h-screen overflow-y-auto" : "rounded-2xl"}`}>
      {sim.active ? (
        <div className="mb-3 rounded-xl border border-violet-500/40 bg-violet-500/10 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-violet-500 px-2 py-0.5 text-xs font-bold text-white">ДЕМО</span>
            <span className="text-violet-200">Симуляція: продавці й переписка вигадані, нічого нікуди не надсилається</span>
            <span className="ml-auto font-mono text-lg tabular-nums text-violet-100">{mmss(sim.left)}</span>
            {[1, 3, 10].map((x) => (
              <button key={x} type="button" onClick={() => sim.setSpeed(x)} className={`rounded px-2 py-0.5 font-mono text-xs ${sim.speed === x ? "bg-violet-500 text-white" : "border border-violet-500/40 text-violet-200"}`}>
                {x}×
              </button>
            ))}
            {sim.finished ? null : (
              <button type="button" onClick={sim.running ? sim.pause : sim.resume} className="rounded border border-violet-500/40 px-2 py-0.5 text-xs text-violet-100">
                {sim.running ? "⏸ Пауза" : "▶ Далі"}
              </button>
            )}
            <button type="button" onClick={sim.exit} className="rounded border border-zinc-600 px-2 py-0.5 text-xs text-zinc-300">Вийти з демо</button>
          </div>
          <div className="mt-2 h-1 rounded-full bg-violet-950">
            <div className="h-1 rounded-full bg-violet-400 transition-[width] duration-300" style={{ width: `${sim.progress * 100}%` }} />
          </div>
          {sim.finished ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-violet-100">
              <b>Торги завершено.</b>
              <span>
                Куплено {rows.filter((r) => r.status === "bought").length} з {rows.length} · відмов {rows.filter((r) => r.status === "rejected").length} · продали іншим{" "}
                {rows.filter((r) => r.status === "lost").length}
              </span>
              <button type="button" onClick={sim.start} className="ml-auto rounded bg-violet-500 px-3 py-1 text-xs font-semibold text-white">Ще раз</button>
            </div>
          ) : rows.some((r) => r.status === "needs_ok") ? (
            <div className="mt-2 text-amber-200">
              👉 Продавець готовий між ціллю і стелею — виберіть угоду «Чекає ок» і натисніть <b>Ок</b> або <b>Ні</b>. Не встигнете за 90 с — продасть іншому.
            </div>
          ) : (
            <div className="mt-2 text-violet-300/80">Бот питає про стан, коробку й документи, рахує ціну для цього стану і торгується. Дивіться стрічку внизу праворуч.</div>
          )}
          {sim.demoPrices ? (
            <div className="mt-1 text-[11px] text-violet-300/70">У «Моделі й ціни» ще немає моделей з цінами — у демо взято умовні ціни.</div>
          ) : null}
        </div>
      ) : null}

      {/* Ticker */}
      <div className="grid grid-cols-2 gap-2 font-mono sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Активні", ticker.active, "text-zinc-100"],
          ["Чекає ок", ticker.needs, ticker.needs ? "text-amber-300" : "text-zinc-100"],
          ["Свіжі < 1 год", ticker.fresh, ticker.fresh ? "text-sky-300" : "text-zinc-100"],
          ["Куплено", ticker.bought, "text-emerald-300"],
          ["Витрачено", ticker.spent ? num(ticker.spent) : "—", "text-zinc-100"],
          ["Виторговано нижче стелі", ticker.under ? num(ticker.under) : "—", "text-emerald-300"],
        ].map(([l, v, c]) => (
          <div key={l as string} className="rounded-lg bg-zinc-900 px-3 py-2">
            <div className="font-sans text-[11px] text-zinc-500">{l}</div>
            <div className={`text-xl tabular-nums ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => setOnlyActive(!onlyActive)} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-900">
          {onlyActive ? "Показано: активні" : "Показано: усі"}
        </button>
        <button type="button" onClick={() => void refreshAll()} className="rounded-full border border-sky-700 px-3 py-1 text-sky-300 hover:bg-sky-950">
          ⟳ Оновити все
        </button>
        {sim.active ? null : (
          <button type="button" onClick={sim.start} className="rounded-full bg-violet-600 px-3 py-1 font-semibold text-white hover:bg-violet-500">
            ▶ Запустити симуляцію
          </button>
        )}
        <button type="button" onClick={toggleFull} className="rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-900">
          {full ? "✕ Вийти з повного екрана" : "⛶ На весь екран"}
        </button>
        <span className="ml-auto text-zinc-500">
          <kbd className="rounded bg-zinc-800 px-1">J</kbd>/<kbd className="rounded bg-zinc-800 px-1">K</kbd> вибір ·{" "}
          <kbd className="rounded bg-zinc-800 px-1">O</kbd> ок · <kbd className="rounded bg-zinc-800 px-1">N</kbd> ні ·{" "}
          <kbd className="rounded bg-zinc-800 px-1">R</kbd> оновити
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
        <span>Ціни — свої для кожної моделі й залежать від стану, коробки, документів:</span>
        <span><i className="mr-1 inline-block h-2 w-4 rounded-sm bg-emerald-500/50" />до цілі — бот купує сам</span>
        <span><i className="mr-1 inline-block h-2 w-4 rounded-sm bg-amber-400/40" />від цілі до стелі — потрібен ваш ок</span>
        <span><i className="mr-1 inline-block h-2 w-[3px] rounded bg-rose-500" /> хоче продавець</span>
        <span><i className="mr-1 inline-block h-2 w-[3px] rounded bg-white" /> торг зараз</span>
        <span><i className="mr-1 inline-block h-2 w-[3px] rounded bg-emerald-400" /> наша пропозиція</span>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Deals */}
        <div className={`${full ? "max-h-[calc(100vh-15rem)]" : "max-h-[70vh]"} space-y-1 overflow-y-auto pr-1`}>
          {list.map((r) => {
            const on = current?.id === r.id;
            const fl = flash[r.id];
            const fresh = minutes(r.listed_at) < 60;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSel(r.id); setConfirm(null); }}
                className={`block w-full rounded-lg px-3 py-2 text-left transition-colors duration-700 ${
                  on ? "bg-zinc-800 ring-1 ring-zinc-600" : "bg-zinc-900 hover:bg-zinc-800/70"
                } ${fl === "down" ? "!bg-emerald-900/60" : fl === "up" ? "!bg-rose-900/60" : ""}`}
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="truncate font-medium">{modelOf(r)}</span>
                  {fresh ? <span className="rounded bg-sky-500/20 px-1.5 text-[10px] text-sky-300">свіже</span> : null}
                  <span className={`ml-auto rounded-full px-2 text-[10px] ${STATUS_PRO[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-zinc-500">
                  <span>{r.seller_name || "—"}{r.city ? ` · ${r.city}` : ""}</span>
                  <span>💬 {r.chat?.filter((m) => m.from === "us").length ?? 0}/{r.chat?.filter((m) => m.from === "seller").length ?? 0}</span>
                  <Condition r={r} />
                  <span className="ml-auto">{r.refresh_requested_at ? "⟳ " : ""}{ago(r.updated_at)}</span>
                </div>
                <Ladder r={r} />
              </button>
            );
          })}
          {!list.length ? <p className="py-10 text-center text-sm text-zinc-500">Поки порожньо</p> : null}
        </div>

        {/* Selected deal, order book, tape */}
        <div className="space-y-3">
          {current ? (
            <div className="rounded-xl bg-zinc-900 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold">{modelOf(current)}</div>
                  <div className="font-mono text-[11px] text-zinc-500">
                    {current.seller_name || "—"}{current.city ? ` · ${current.city}` : ""} · опубл. {ago(current.listed_at)} тому ·{" "}
                    <a href={current.olx_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">OLX ↗</a>
                  </div>
                </div>
                <button type="button" onClick={() => void requestRefresh(current.id)} className="ml-auto rounded border border-zinc-700 px-2 text-sm text-zinc-300 hover:bg-zinc-800" title="Оновити (R)">⟳</button>
              </div>
              <div className="mt-2">
                <Condition r={current} />
                {current.condition_notes ? <div className="mt-1 text-[12px] text-zinc-400">«{current.condition_notes}»</div> : null}
              </div>
              <div className="mt-3">
                <Ladder r={current} big />
              </div>
              <PriceSteps r={current} models={models} />

              {confirm ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  {confirm.kind === "ok" ? `Ок на ${num(confirm.price)}?` : "Відмовити?"}
                  <button type="button" onClick={() => { void decide(current.id, confirm.kind === "ok" ? { decision: "ok", price: confirm.price } : { decision: "no" }); setConfirm(null); }} className="ml-auto rounded bg-amber-400 px-2 py-0.5 font-semibold text-zinc-900">Так · Enter</button>
                  <button type="button" onClick={() => setConfirm(null)} className="rounded border border-zinc-600 px-2 py-0.5 text-zinc-300">Esc</button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy === current.id || !(current.bargain_at || current.our_offer)} onClick={() => setConfirm({ kind: "ok", price: (current.bargain_at || current.our_offer)! })} className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">
                    Ок {num(current.bargain_at || current.our_offer)} · O
                  </button>
                  <button type="button" disabled={busy === current.id} onClick={() => setConfirm({ kind: "no", price: 0 })} className="rounded border border-zinc-600 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800">Ні · N</button>
                  {current.owner_decision ? <span className="self-center font-mono text-[11px] text-zinc-500">ваше: {current.owner_decision}</span> : null}
                </div>
              )}

              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto">
                {(current.chat || []).map((m, i) => (
                  <div key={i} className={`flex ${m.from === "us" ? "justify-end" : ""}`}>
                    <div className={`max-w-[80%] rounded-xl px-2.5 py-1 text-[13px] ${m.from === "us" ? "bg-sky-700/70" : "bg-zinc-800"}`}>
                      {m.text}
                      <span className="ml-2 font-mono text-[10px] text-zinc-400">{hhmm(m.at)}</span>
                    </div>
                  </div>
                ))}
                {(current.outbox || []).filter((m) => !m.sent_at).map((m) => (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-xl border border-dashed border-zinc-600 px-2.5 py-1 text-[13px] text-zinc-400">{m.text} · ⏳</div>
                  </div>
                ))}
              </div>
              <form
                className="mt-2 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  await decide(current.id, { send: draft.trim() });
                  setDraft("");
                }}
              >
                <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ваше повідомлення — бот надішле як є" className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600" />
                <button type="submit" className="rounded bg-sky-600 px-3 text-sm font-semibold text-white hover:bg-sky-500">Надіслати</button>
              </form>
            </div>
          ) : null}

          {current && book && (book.asks.length || book.bids.length) ? (
            <div className="rounded-xl bg-zinc-900 p-3 font-mono text-[12px]">
              <div className="mb-2 font-sans text-[11px] text-zinc-500">
                Стакан · {modelOf(current)} · праворуч — різниця з ціллю
              </div>
              {book.asks.map((a) => (
                <div key={a.id} className="grid grid-cols-[72px_1fr_52px] items-center gap-2">
                  <span className="text-rose-300">{num(a.v)}</span>
                  <div className="h-3 rounded-sm bg-rose-500/25" style={{ width: `${(a.v / maxBook) * 100}%` }} />
                  <span className="text-right text-zinc-500">{vsTarget(a.v)}</span>
                </div>
              ))}
              <div className="my-1.5 border-y border-dashed border-zinc-700 py-0.5 text-center text-[11px] text-zinc-500">
                {book.asks.length && book.bids.length ? `спред ${num(book.asks[book.asks.length - 1].v - book.bids[0].v)} · ` : ""}
                {book.target ? `ціль ${num(book.target)} · стеля ${num(book.ceiling)}` : "немає ціни на модель"}
              </div>
              {book.bids.map((b) => (
                <div key={b.id + b.v} className="grid grid-cols-[72px_1fr_52px] items-center gap-2">
                  <span className="text-emerald-300">{num(b.v)}</span>
                  <div className="h-3 rounded-sm bg-emerald-500/25" style={{ width: `${(b.v / maxBook) * 100}%` }} />
                  <span className="text-right text-zinc-500">{vsTarget(b.v)}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="rounded-xl bg-zinc-900 p-3">
            <div className="mb-1 text-[11px] text-zinc-500">Стрічка</div>
            <div className="max-h-56 space-y-0.5 overflow-y-auto font-mono text-[12px]">
              {tape.map((t, i) => (
                <div key={i} className="truncate">
                  <span className="text-zinc-600">{hhmm(t.at)}</span> <span className="text-zinc-300">{t.model}</span>{" "}
                  <span className={t.tone}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
