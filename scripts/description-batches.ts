/**
 * Переписывание описаний товаров фида порциями — так, чтобы работу можно было
 * прервать в любой момент (лимит, выключенный компьютер) и продолжить с того
 * же места. Всё состояние лежит в рабочей папке, по умолчанию
 * ../descriptions-work (рядом с репозиторием, вне git: там выгрузка базы).
 *
 *   npx tsx scripts/description-batches.ts init <выгрузка.json>
 *       один раз: кладёт выгрузку в папку, делает нетронутую копию-бэкап и
 *       строит очередь — товары фида, которые сейчас не проходят проверку
 *   npx tsx scripts/description-batches.ts status
 *   npx tsx scripts/description-batches.ts next [N=10] [--ahead]
 *       данные следующих N товаров для написания и номер файла партии.
 *       --ahead: готовить впрок, пока предыдущие партии не записаны на сайт
 *       (запись в базу недоступна или ждёт проверки): подготовленные товары
 *       пропускаются, их зачины считаются занятыми
 *   npx tsx scripts/description-batches.ts check <NNN>
 *       проверяет batches/NNN.json; если прошла — пишет batches/NNN.upload.json
 *   npx tsx scripts/description-batches.ts apply <NNN>
 *       после записи в базу: сверяет живые страницы с новыми текстами,
 *       отмечает товары сделанными, отправляет адреса в IndexNow
 *
 * Правила проверки — src/lib/description-lint.ts.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Product } from "@/types";
import { lintProduct, repeatedLeads, sentenceLead, sentences, type LintProduct } from "@/lib/description-lint";
import { isMerchantEligible, merchantItemId } from "@/lib/merchant-eligibility";
import { localizedProductName } from "@/lib/product-name";

const DIR = resolve(process.env.DESCRIPTIONS_DIR || "../descriptions-work");
const CATALOG = join(DIR, "catalog.json");
const STATE = join(DIR, "state.json");
const BATCHES = join(DIR, "batches");
const SITE = "https://pro-optics.com.ua";
const INDEXNOW_KEY = "49017b64a8779209c006511743c08f0f";

interface State {
  createdAt: string;
  queue: string[];
  done: Record<string, string>;
}

interface BatchItem {
  slug: string;
  descriptionUk: string;
  descriptionRu: string;
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, "")) as T;
const writeJson = (path: string, data: unknown) => writeFileSync(path, JSON.stringify(data, null, 1));

function loadCatalog(): LintProduct[] {
  if (!existsSync(CATALOG)) throw new Error(`нет ${CATALOG} — сначала init`);
  return readJson<LintProduct[]>(CATALOG);
}

function loadState(): State {
  if (!existsSync(STATE)) throw new Error(`нет ${STATE} — сначала init`);
  return readJson<State>(STATE);
}

const inFeed = (p: LintProduct) => {
  const asProduct = p as unknown as Product;
  return isMerchantEligible(asProduct, merchantItemId(asProduct));
};

const batchPath = (n: string) => join(BATCHES, `${n.padStart(3, "0")}.json`);

function nextBatchNumber(): string {
  if (!existsSync(BATCHES)) return "001";
  const nums = readdirSync(BATCHES)
    .map((f) => /^(\d{3})\.json$/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number);
  return String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0");
}

/** Партии, написанные, но ещё не отмеченные через apply. */
function openBatches(state: State): string[] {
  if (!existsSync(BATCHES)) return [];
  return readdirSync(BATCHES)
    .filter((f) => /^\d{3}\.json$/.test(f))
    .filter((f) => readJson<BatchItem[]>(join(BATCHES, f)).some((b) => !state.done[b.slug]))
    .map((f) => f.slice(0, 3));
}

/**
 * Тексты из партий, которые написаны, но ещё не записаны на сайт. Нужны, пока
 * запись в базу недоступна или ждёт проверки: партии готовятся впрок, а
 * повторы зачинов должны считаться по всем сразу, не по одной.
 */
function preparedItems(state: State): Map<string, BatchItem> {
  const out = new Map<string, BatchItem>();
  if (!existsSync(BATCHES)) return out;
  for (const f of readdirSync(BATCHES).filter((x) => /^\d{3}\.json$/.test(x)).sort()) {
    for (const item of readJson<BatchItem[]>(join(BATCHES, f))) {
      if (!state.done[item.slug]) out.set(item.slug, item);
    }
  }
  return out;
}

function warnOpen(state: State): boolean {
  const open = openBatches(state);
  if (!open.length) return false;
  console.log(`СТОП: партия ${open.join(", ")} не доведена. Сначала check → запись в базу → apply, потом next.`);
  return true;
}

// ------------------------------------------------------------------- init
/**
 * Slugs of the products the live feed publishes, read from their links. The
 * queue is cut to them: eligibility alone would also take in unpublished
 * drafts and hidden brands, whose pages do not exist and could never pass
 * apply. Slugs, not ids: when two products clash on an id the feed publishes
 * their slugs instead (9a994eb), so an id match would drop both of them.
 */
async function liveFeedSlugs(): Promise<Set<string>> {
  const xml = await (await fetch(`${SITE}/feed/google-merchant.xml?v=${Date.now()}`)).text();
  const slugs = Array.from(xml.matchAll(/<g:link>([\s\S]*?)<\/g:link>/g))
    .map((m) => m[1].trim().split("/product/")[1])
    .filter(Boolean);
  if (slugs.length < 100) throw new Error(`в живом фиде ${slugs.length} позиций — что-то не так, init остановлен`);
  return new Set(slugs);
}

async function init(exportPath: string) {
  const raw = readJson<unknown>(exportPath);
  const list = (Array.isArray(raw) ? raw : (raw as { products?: unknown[] }).products) as LintProduct[] | undefined;
  if (!Array.isArray(list) || !list.length) throw new Error("выгрузка пустая или не того формата");
  if (existsSync(STATE)) throw new Error(`${STATE} уже есть — init делается один раз`);
  mkdirSync(BATCHES, { recursive: true });

  const stamp = new Date().toISOString().slice(0, 10);
  copyFileSync(exportPath, join(DIR, `backup-${stamp}.json`));
  writeJson(CATALOG, list);

  const feedSlugs = await liveFeedSlugs();
  const feed = list.filter((p) => inFeed(p) && feedSlugs.has(p.slug));
  const failing = feed
    .map((p) => ({ p, issues: lintProduct(p) }))
    .filter((r) => r.issues.length)
    .sort((a, b) => {
      const glue = (r: typeof a) => (r.issues.some((i) => i.code === "glue") ? 0 : 1);
      const price = (r: typeof a) => parseFloat(String(r.p.price ?? 0)) || 0;
      return glue(a) - glue(b) || price(b) - price(a);
    });

  writeJson(STATE, { createdAt: new Date().toISOString(), queue: failing.map((r) => r.p.slug), done: {} } as State);
  console.log(`выгрузка: ${list.length} товаров, в фиде ${feed.length} (живой фид: ${feedSlugs.size})`);
  if (feed.length !== feedSlugs.size) {
    console.log(`ВНИМАНИЕ: в фиде ${feedSlugs.size} позиций, а в выгрузке подошло ${feed.length} — проверьте, каких не хватает`);
  }
  console.log(`в очереди: ${failing.length} (сначала тексты генератора, внутри — по цене)`);
  console.log(`бэкап: ${join(DIR, `backup-${stamp}.json`)}`);
}

// ----------------------------------------------------------------- status
function status() {
  const state = loadState();
  const done = Object.keys(state.done).length;
  console.log(`сделано ${done} из ${state.queue.length}, осталось ${state.queue.length - done}`);
  const prepared = preparedItems(state);
  if (prepared.size) {
    console.log(`подготовлено, но не записано на сайт: ${prepared.size} товаров (партии ${openBatches(state).join(", ")})`);
  }
  if (!warnOpen(state)) console.log(`следующая партия: ${nextBatchNumber()}`);
  else console.log(`готовить впрок, не записывая: next --ahead (следующая партия ${nextBatchNumber()})`);
}

// ------------------------------------------------------------------- next
function specLines(specs: unknown): string[] {
  return Object.entries((specs as Record<string, unknown>) || {})
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `    ${k}: ${String(v).replace(/\s+/g, " ").trim()}`);
}

function next(n: number, ahead: boolean) {
  const state = loadState();
  const catalog = new Map(loadCatalog().map((p) => [p.slug, p]));
  if (!ahead && warnOpen(state)) process.exit(1);
  // --ahead: партии готовятся впрок, без записи на сайт — подготовленные
  // товары пропускаем, а их зачины считаем занятыми.
  const prepared = preparedItems(state);
  const pending = state.queue.filter((s) => !state.done[s] && !prepared.has(s)).slice(0, n);
  if (!pending.length) {
    console.log("очередь пуста — всё сделано или подготовлено");
    return;
  }

  // Зачины, которые уже заняты новыми текстами: их не повторять.
  const counts = new Map<string, number>();
  const used: (string | null | undefined)[][] = Object.keys(state.done).map((slug) => {
    const p = catalog.get(slug);
    return [p?.descriptionUk as string | undefined, p?.descriptionRu as string | undefined];
  });
  prepared.forEach((item) => used.push([item.descriptionUk, item.descriptionRu]));
  for (const texts of used) {
    for (const text of texts) {
      const seen = new Set<string>();
      for (const s of sentences(String(text || ""))) {
        const lead = sentenceLead(s);
        if (lead && !seen.has(lead)) {
          seen.add(lead);
          counts.set(lead, (counts.get(lead) || 0) + 1);
        }
      }
    }
  }
  const busy = Array.from(counts.entries()).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]);

  const number = nextBatchNumber();
  console.log(`партия ${number}: напишите ${batchPath(number)}`);
  console.log(`формат: [{ "slug": "...", "descriptionUk": "...", "descriptionRu": "..." }]\n`);
  for (const slug of pending) {
    const p = catalog.get(slug)!;
    const base = { nameUk: String(p.nameUk || ""), nameRu: (p.nameRu as string) || null };
    console.log(`── ${slug}`);
    console.log(`  назва UK: ${p.nameUk}`);
    console.log(`  название RU: ${localizedProductName(base, "ru")}`);
    console.log(`  категорія: ${p.categorySlug}${p.deviceType ? `, тип ${p.deviceType}` : ""}; ціна: ${p.price} грн`);
    for (const k of ["resolution", "detectionRangeM"]) if (p[k] != null) console.log(`  ${k}: ${p[k]}`);
    console.log("  характеристики:");
    specLines(p.specs).forEach((l) => console.log(l));
    console.log("");
  }
  if (busy.length) {
    console.log("уже заняты в новых текстах (не начинать так предложения):");
    busy.slice(0, 15).forEach(([lead, c]) => console.log(`  ${c}×  ${lead}`));
  }
}

// ------------------------------------------------------------------ check
function check(n: string) {
  const path = batchPath(n);
  const batch = readJson<BatchItem[]>(path);
  const catalog = loadCatalog();
  const bySlug = new Map(catalog.map((p) => [p.slug, p]));

  const unknown = batch.filter((b) => !bySlug.has(b.slug)).map((b) => b.slug);
  if (unknown.length) throw new Error(`в партии slug, которых нет в каталоге: ${unknown.join(", ")}`);

  // Повторы зачинов — по всему каталогу вместе со всеми подготовленными, но ещё
  // не записанными партиями, иначе две соседние партии могли бы начинать
  // предложения одинаково и ни одна проверка этого не увидела бы.
  const overlay = preparedItems(loadState());
  for (const b of batch) overlay.set(b.slug, b);
  const merged = catalog.map((p) => {
    const b = overlay.get(p.slug);
    return b ? { ...p, descriptionUk: b.descriptionUk, descriptionRu: b.descriptionRu } : p;
  });
  const batchSlugs = new Set(batch.map((b) => b.slug));

  let failed = 0;
  for (const b of batch) {
    const issues = lintProduct(merged.find((p) => p.slug === b.slug)!);
    if (!issues.length) continue;
    failed++;
    console.log(`✗ ${b.slug}`);
    issues.slice(0, 8).forEach((i) => console.log(`    [${i.locale}] ${i.code}: ${i.detail.slice(0, 160)}`));
  }
  const repeated = repeatedLeads(merged).filter((r) => r.slugs.some((s) => batchSlugs.has(s)));
  for (const r of repeated) {
    const mine = r.slugs.filter((s) => batchSlugs.has(s));
    console.log(`✗ зачин у ${r.count} товаров [${r.locale}]: «${r.lead}» — в партии: ${mine.join(", ")}`);
  }

  if (failed || repeated.length) {
    console.log(`\nНЕ ПРОШЛА: товаров с замечаниями ${failed}, повторов зачинов ${repeated.length}. Исправьте ${path} и запустите check снова.`);
    process.exit(1);
  }

  const upload = batch.map((b) => ({
    id: bySlug.get(b.slug)!.id,
    slug: b.slug,
    descriptionUk: b.descriptionUk,
    descriptionRu: b.descriptionRu,
  }));
  const uploadPath = path.replace(/\.json$/, ".upload.json");
  writeJson(uploadPath, upload);
  console.log(`партия прошла: ${batch.length} товаров`);
  console.log(`для записи в базу: ${uploadPath}`);
}

// ------------------------------------------------------------------ apply
const flat = (s: string) => s.replace(/\s+/g, " ").trim();

async function liveDescription(url: string): Promise<string> {
  const html = await (await fetch(`${url}?v=${Date.now()}`)).text();
  for (const m of Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = [data, ...(Array.isArray(data) ? data : []), ...((data && data["@graph"]) || [])];
      const product = nodes.find((x) => x && x["@type"] === "Product");
      if (product?.description) return String(product.description);
    } catch {
      /* not JSON — skip */
    }
  }
  return "";
}

async function apply(n: string) {
  const path = batchPath(n);
  const batch = readJson<BatchItem[]>(path);
  const state = loadState();
  const catalog = loadCatalog();

  const mismatched: string[] = [];
  for (const b of batch) {
    for (const [locale, text] of [["uk", b.descriptionUk], ["ru", b.descriptionRu]] as const) {
      const url = `${SITE}${locale === "ru" ? "/ru" : ""}/product/${b.slug}`;
      const live = flat(await liveDescription(url));
      if (!live.startsWith(flat(text).slice(0, 80))) mismatched.push(`${b.slug} [${locale}]`);
    }
  }
  if (mismatched.length) {
    console.log("на сайте ещё старый текст — партия НЕ отмечена сделанной:");
    mismatched.forEach((m) => console.log("  " + m));
    console.log("Проверьте, что запись в базу прошла без ошибок, и повторите apply.");
    process.exit(1);
  }

  for (const b of batch) {
    const p = catalog.find((x) => x.slug === b.slug)!;
    p.descriptionUk = b.descriptionUk;
    p.descriptionRu = b.descriptionRu;
    state.done[b.slug] = `${n.padStart(3, "0")}.json`;
  }
  writeJson(CATALOG, catalog);
  writeJson(STATE, state);

  const urls = batch.flatMap((b) => [`${SITE}/product/${b.slug}`, `${SITE}/ru/product/${b.slug}`]);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: "pro-optics.com.ua",
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: urls,
    }),
  });
  const done = Object.keys(state.done).length;
  console.log(`партия ${n} на сайте и отмечена: ${batch.length} товаров`);
  console.log(`IndexNow: ${res.status} (${urls.length} адресов)`);
  console.log(`всего сделано ${done} из ${state.queue.length}`);
}

// ------------------------------------------------------------------- main
async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === "init" && arg) return init(arg);
  if (cmd === "status") return status();
  if (cmd === "next") {
    const count = arg && !arg.startsWith("--") ? Number(arg) : 10;
    return next(count, process.argv.includes("--ahead"));
  }
  if (cmd === "check" && arg) return check(arg);
  if (cmd === "apply" && arg) return apply(arg);
  console.error("команды: init <выгрузка.json> | status | next [N] | check <NNN> | apply <NNN>");
  process.exit(2);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
