/**
 * Проверка описаний товаров перед записью в базу.
 *
 *   npx tsx scripts/check-descriptions.ts <партия.json> [--base <каталог.json>] [--feed] [--report <отчёт.json>]
 *
 *   партия.json   товары с новыми текстами — в том виде, в каком их отдаёт
 *                 GET /api/admin/products (массив или { products: [...] })
 *   --base        выгрузка всего каталога. Партия накладывается на неё по id
 *                 (или slug), и повторяющиеся зачины считаются по всему
 *                 каталогу: шаблон, повторённый по четыре раза в десяти
 *                 партиях, внутри одной партии не виден.
 *   --feed        проверять только товары, которые уходят в Merchant Center
 *   --report      записать полный отчёт в JSON
 *
 * Правила — src/lib/description-lint.ts. Код выхода 1, если есть хоть одно
 * замечание: такую партию в базу не пишут.
 */

import { readFileSync, writeFileSync } from "node:fs";
import type { Product } from "@/types";
import {
  lintProduct,
  repeatedLeads,
  type LintIssue,
  type LintProduct,
} from "@/lib/description-lint";
import { isMerchantEligible, merchantItemId } from "@/lib/merchant-eligibility";

function readProducts(path: string): LintProduct[] {
  const raw = JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.products) ? raw.products : null;
  if (!list) throw new Error(`${path}: ожидался массив товаров или { products: [...] }`);
  return list as LintProduct[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const key = (p: LintProduct) => String((p.id as string) || p.slug);

function main() {
  const batchPath = process.argv[2];
  if (!batchPath || batchPath.startsWith("--")) {
    console.error("использование: npx tsx scripts/check-descriptions.ts <партия.json> [--base <каталог.json>] [--feed] [--report <отчёт.json>]");
    process.exit(2);
  }

  let batch = readProducts(batchPath);
  if (process.argv.includes("--feed")) {
    batch = batch.filter((p) => {
      const asProduct = p as unknown as Product;
      return isMerchantEligible(asProduct, merchantItemId(asProduct));
    });
  }

  const basePath = arg("--base");
  const merged = new Map<string, LintProduct>();
  if (basePath) for (const p of readProducts(basePath)) merged.set(key(p), p);
  for (const p of batch) merged.set(key(p), { ...(merged.get(key(p)) || {}), ...p });

  const batchSlugs = new Set(batch.map((p) => p.slug));

  const perProduct = batch
    .map((p) => ({ slug: p.slug, name: p.nameUk, issues: lintProduct(merged.get(key(p))!) }))
    .filter((r) => r.issues.length);

  // Зачины считаются по всему каталогу, но показываются только те, что задевают партию.
  const repeated = repeatedLeads(Array.from(merged.values())).filter((r) =>
    r.slugs.some((s) => batchSlugs.has(s)),
  );

  const tally = new Map<string, number>();
  for (const r of perProduct) {
    for (const code of Array.from(new Set(r.issues.map((i: LintIssue) => i.code)))) {
      tally.set(code, (tally.get(code) || 0) + 1);
    }
  }

  console.log(`партия: ${batch.length} товаров${basePath ? `, каталог для сверки: ${merged.size}` : ""}`);
  console.log(`без замечаний: ${batch.length - perProduct.length}, с замечаниями: ${perProduct.length}`);

  if (tally.size) {
    console.log("\nзамечания по видам (товаров):");
    const LABEL: Record<string, string> = {
      missing: "нет описания",
      length: "длина не 1200–1800",
      weapon: "оружейная лексика у товара фида",
      glue: "связка генератора",
      "yes-no": "«Так/Ні» вместо цифры",
      superlative: "превосходная степень / отзывы",
      figure: "цифры нет в характеристиках",
      model: "модель не в начале",
      language: "буква другого языка",
    };
    Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, n]) => console.log(`  ${String(n).padStart(4)}  ${LABEL[code] || code}`));
  }

  if (repeated.length) {
    console.log(`\nзачины, повторяющиеся больше чем у 5 товаров: ${repeated.length}`);
    for (const r of repeated.slice(0, 15)) {
      const inBatch = r.slugs.filter((s) => batchSlugs.has(s)).length;
      console.log(`  ${String(r.count).padStart(4)}  [${r.locale}] ${r.lead}  (из партии: ${inBatch})`);
    }
  }

  if (perProduct.length) {
    console.log("\nпервые товары с замечаниями:");
    for (const r of perProduct.slice(0, 25)) {
      console.log(`\n  ${r.name || r.slug}`);
      for (const i of r.issues.slice(0, 6)) {
        console.log(`    [${i.locale}] ${i.code}: ${i.detail.slice(0, 150)}`);
      }
      if (r.issues.length > 6) console.log(`    … ещё ${r.issues.length - 6}`);
    }
  }

  const reportPath = arg("--report");
  if (reportPath) {
    writeFileSync(reportPath, JSON.stringify({ products: perProduct, repeated }, null, 2));
    console.log(`\nполный отчёт: ${reportPath}`);
  }

  const failed = perProduct.length > 0 || repeated.length > 0;
  console.log(failed ? "\nПАРТИЯ НЕ ПРОШЛА — в базу не писать" : "\nпартия прошла проверку");
  process.exit(failed ? 1 : 0);
}

main();
