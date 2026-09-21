import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { COMPARISONS } from "@/lib/comparisons";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/breadcrumbs";
import { pageAlternates } from "@/lib/seo-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ru = locale === "ru";
  return {
    title: ru ? "Сравнение тепловизоров и прицелов" : "Порівняння тепловізорів і прицілів",
    description: ru
      ? "Сравнения популярных тепловизоров и прицелов одного класса: Pulsar, HikMicro, AGM — дальность, NETD, вес, цена по паспортным данным."
      : "Порівняння популярних тепловізорів і прицілів одного класу: Pulsar, HikMicro, AGM — дальність, NETD, вага, ціна за паспортними даними.",
    alternates: pageAlternates(locale, "/porivniannia"),
  };
}

export default async function ComparisonsIndex({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ru = locale === "ru";
  const tn = await getTranslations("nav");
  const title = ru ? "Сравнение тепловизоров и прицелов" : "Порівняння тепловізорів і прицілів";
  const crumbs = [
    { name: tn("home"), path: "/" },
    { name: ru ? "Сравнения" : "Порівняння", path: "/porivniannia" },
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
        <span className="text-primary">{crumbs[1].name}</span>
      </nav>
      <h1 className="section-title mb-2">{title}</h1>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed text-secondary">
        {ru
          ? "Пары приборов одного класса — одинаковая матрица и объектив. Цифры взяты из паспортов производителей."
          : "Пари приладів одного класу — однакова матриця та об'єктив. Цифри взято з паспортів виробників."}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {COMPARISONS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/porivniannia/${c.slug}`}
              className="card-surface block p-4 transition hover:border-[var(--accent)]/50"
            >
              <span className="font-semibold text-primary">{c.a.name}</span>
              <span className="mx-2 text-[var(--accent)]">vs</span>
              <span className="font-semibold text-primary">{c.b.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
