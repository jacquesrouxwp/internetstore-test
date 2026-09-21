import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getProductBySlug } from "@/lib/catalog";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/breadcrumbs";
import { pageAlternates } from "@/lib/seo-alternates";
import { formatUah, type Locale } from "@/lib/brand-pages";
import {
  comparisonHighlights,
  getComparison,
  productMetrics,
  sharedTraits,
} from "@/lib/comparisons";
import { buildSpecRows, classifySpecKey, SPEC_SECTION_ORDER } from "@/lib/product-specs";
import { parseProductThermal } from "@/lib/thermal/parse-product-thermal";
import { simulatorHref, specNetdMk } from "@/lib/thermal/simulator-link";
import { serviceBlockHtml } from "@/lib/category-seo";
import type { Product } from "@/types";

export const revalidate = 300;

type Props = { params: Promise<{ locale: string; pair: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, pair } = await params;
  const c = getComparison(pair);
  if (!c) return { title: "Compare" };
  const ru = locale === "ru";
  return {
    title: ru
      ? `${c.a.name} vs ${c.b.name} — сравнение характеристик`
      : `${c.a.name} vs ${c.b.name} — порівняння характеристик`,
    description: ru
      ? `Сравниваем ${c.a.name} и ${c.b.name}: дальность обнаружения, NETD, матрица, объектив, вес, автономность и цена — по паспортным данным. Что выбрать и чем они отличаются.`
      : `Порівнюємо ${c.a.name} і ${c.b.name}: дальність виявлення, NETD, матриця, об'єктив, вага, автономність і ціна — за паспортними даними. Що обрати та чим вони відрізняються.`,
    alternates: pageAlternates(locale, `/porivniannia/${pair}`),
  };
}

const MATRIX_WIDTHS = new Set([256, 384, 640]);

function simLink(p: Product): string | null {
  const width = parseInt(p.resolution || "", 10);
  if (!MATRIX_WIDTHS.has(width)) return null;
  const params = parseProductThermal({
    resolution: p.resolution,
    specs: p.specs,
    detectionRangeM: p.detectionRangeM,
    name: p.nameUk,
  });
  return simulatorHref({
    ...params,
    matrix: width as 256 | 384 | 640,
    netdMk: specNetdMk(p.specs) ?? 0,
  });
}

export default async function ComparisonPage({ params }: Props) {
  const { locale, pair } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const ru = loc === "ru";
  const c = getComparison(pair);
  if (!c) notFound();
  const [a, b] = await Promise.all([getProductBySlug(c.a.slug), getProductBySlug(c.b.slug)]);
  // A pair only makes sense while both cards exist
  if (!a || !b) notFound();
  const tn = await getTranslations("nav");

  const ma = productMetrics(a);
  const mb = productMetrics(b);
  const names: [string, string] = [c.a.name, c.b.name];
  const highlights = comparisonHighlights(names, ma, mb, loc);
  const shared = sharedTraits(ma, mb, loc);
  const h1 = ru
    ? `${c.a.name} или ${c.b.name}: сравнение`
    : `${c.a.name} чи ${c.b.name}: порівняння`;

  const crumbs = [
    { name: tn("home"), path: "/" },
    { name: ru ? "Сравнения" : "Порівняння", path: "/porivniannia" },
    { name: `${c.a.name} vs ${c.b.name}`, path: `/porivniannia/${pair}` },
  ];

  // Spec table: union of both cards' normalised rows, grouped like the PDP
  const rowsA = buildSpecRows(a.specs, { locale: loc, resolution: a.resolution, detectionRangeM: a.detectionRangeM });
  const rowsB = buildSpecRows(b.specs, { locale: loc, resolution: b.resolution, detectionRangeM: b.detectionRangeM });
  const byKeyA = new Map(rowsA.map((r) => [r.key, r]));
  const byKeyB = new Map(rowsB.map((r) => [r.key, r]));
  const keys: string[] = [];
  for (const r of [...rowsA, ...rowsB]) if (!keys.includes(r.key)) keys.push(r.key);
  const sections = SPEC_SECTION_ORDER.map((id) => ({
    id,
    keys: keys.filter((k) => {
      const r = byKeyA.get(k) || byKeyB.get(k)!;
      return classifySpecKey(r.sourceKey || r.key) === id;
    }),
  })).filter((s) => s.keys.length);

  const products: [Product, string, "a" | "b"][] = [
    [a, c.a.name, "a"],
    [b, c.b.name, "b"],
  ];

  return (
    <div className="container-shop py-5 sm:py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(locale, crumbs)) }}
      />
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-2 text-sm text-secondary sm:mb-4">
        <Link href="/" className="hover:text-[var(--accent)]">{crumbs[0].name}</Link>
        <span className="text-faint">/</span>
        <Link href="/porivniannia" className="hover:text-[var(--accent)]">{crumbs[1].name}</Link>
        <span className="text-faint">/</span>
        <span className="text-primary">{crumbs[2].name}</span>
      </nav>

      <h1 className="section-title">{h1}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-secondary">
        {ru
          ? `Сравниваем два прибора одного класса${shared.length ? ` (общее: ${shared.join(", ")})` : ""}. Все цифры — паспортные данные производителей из карточек в нашем каталоге.`
          : `Порівнюємо два прилади одного класу${shared.length ? ` (спільне: ${shared.join(", ")})` : ""}. Усі цифри — паспортні дані виробників із карток у нашому каталозі.`}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {products.map(([p, name, side]) => {
          const sim = simLink(p);
          const wins = highlights.filter((h) => h.edge === side);
          return (
            <div key={p.id} className="card-surface flex flex-col p-4 sm:p-5">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-white">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.images[0]}
                    alt={name}
                    className="h-full w-full object-contain p-4"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-primary">{name}</h2>
              <p className="mt-1 text-xl font-semibold text-primary">{formatUah(p.price)}</p>
              {wins.length > 0 && (
                <div className="mt-3 text-sm text-secondary">
                  <p className="font-semibold text-primary">
                    {ru ? "Преимущества по цифрам:" : "Переваги за цифрами:"}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {wins.map((w) => (
                      <li key={w.text}>{w.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Link href={`/product/${p.slug}`} className="btn-hero btn-hero-primary">
                  {ru ? "Подробнее и купить" : "Детальніше й купити"}
                </Link>
                {sim ? (
                  <Link href={sim} className="btn-hero btn-hero-secondary">
                    {ru ? "В симуляторе" : "У симуляторі"}
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {highlights.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-primary">
            {ru ? "Главные отличия" : "Головні відмінності"}
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-secondary">
            {highlights.map((h) => (
              <li key={h.text}>{h.text}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-primary">
          {ru ? "Характеристики" : "Характеристики"}
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-2/5 border-b border-white/10 px-3 py-2 text-left font-medium text-muted-ui"></th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-primary">{c.a.name}</th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold text-primary">{c.b.name}</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) =>
                s.keys.map((k) => {
                  const ra = byKeyA.get(k);
                  const rb = byKeyB.get(k);
                  const differs = (ra?.value || "") !== (rb?.value || "");
                  return (
                    <tr key={`${s.id}-${k}`} className="odd:bg-white/[0.02]">
                      <td className="border-b border-white/5 px-3 py-2 text-secondary">{(ra || rb)!.label}</td>
                      <td className={`border-b border-white/5 px-3 py-2 ${differs ? "text-primary" : "text-secondary"}`}>{ra?.value || "—"}</td>
                      <td className={`border-b border-white/5 px-3 py-2 ${differs ? "text-primary" : "text-secondary"}`}>{rb?.value || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="category-seo mt-10 max-w-3xl text-sm leading-relaxed text-secondary">
        <h2 className="font-display text-xl font-bold text-primary">
          {ru ? "Как выбрать между ними" : "Як обрати між ними"}
        </h2>
        <p className="mt-3">
          {ru
            ? "Паспортная дальность — это расстояние, на котором прибор лишь заметит тёплое пятно; распознать цель получится примерно на четверти этой дистанции. Поэтому сравнивайте приборы под свои реальные дистанции: откройте каждый в симуляторе и посмотрите, как он показывает цель на 150, 300 и 500 метрах."
            : "Паспортна дальність — це відстань, на якій прилад лише помітить теплу пляму; розпізнати ціль вийде приблизно на чверті цієї дистанції. Тому порівнюйте прилади під свої реальні дистанції: відкрийте кожен у симуляторі й подивіться, як він показує ціль на 150, 300 і 500 метрах."}{" "}
          <Link href="/blog/dalnist-teplovizora-yak-chytaty-pasport">
            {ru ? "Подробнее о дальности" : "Детальніше про дальність"}
          </Link>
          .
        </p>
        <div className="mt-3" dangerouslySetInnerHTML={{ __html: serviceBlockHtml(loc) }} />
        <style
          dangerouslySetInnerHTML={{
            __html: `.category-seo h3{font-size:1rem;font-weight:600;color:var(--text-primary);margin-top:1.25rem}.category-seo a{color:var(--accent);text-decoration:underline}.category-seo strong{color:var(--text-primary)}`,
          }}
        />
      </section>
    </div>
  );
}
