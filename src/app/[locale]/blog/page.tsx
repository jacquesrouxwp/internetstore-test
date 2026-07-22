import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { InfoPage } from "@/components/layout/InfoPage";

export const metadata: Metadata = { title: "Новини" };

const POSTS = [
  {
    slug: "yak-obraty-teplovizor",
    titleUk: "Як обрати тепловізор: гід за характеристиками",
    titleRu: "Как выбрать тепловизор: гид по характеристикам",
    date: "2026-04-20",
    excerptUk:
      "Матриця, об'єктив, NETD і частота — що реально впливає на картинку в полі.",
    excerptRu:
      "Матрица, объектив, NETD и частота — что реально влияет на картинку в поле.",
  },
  {
    slug: "rix-vs-hikmicro",
    titleUk: "Rix чи HikMicro: порівняння популярних моделей",
    titleRu: "Rix или HikMicro: сравнение популярных моделей",
    date: "2026-03-11",
    excerptUk: "Короткий розбір для бюджету 25–60 тис. грн.",
    excerptRu: "Короткий разбор для бюджета 25–60 тыс. грн.",
  },
  {
    slug: "dostavka-nova-poshta",
    titleUk: "Доставка тепловізорів Новою Поштою",
    titleRu: "Доставка тепловизоров Новой Почтой",
    date: "2026-02-01",
    excerptUk: "Як ми пакуємо прилади та що перевірити при отриманні.",
    excerptRu: "Как мы упаковываем приборы и что проверить при получении.",
  },
];

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  const loc = locale as "uk" | "ru";
  const readMore = loc === "ru" ? "Читать →" : "Читати →";

  return (
    <InfoPage title={t("blogTitle")} wide>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((p) => (
          <article key={p.slug} className="info-card">
            <time className="info-card__date" dateTime={p.date}>
              {p.date}
            </time>
            <h2 className="info-card__title">
              {loc === "ru" ? p.titleRu : p.titleUk}
            </h2>
            <p className="info-card__excerpt">
              {loc === "ru" ? p.excerptRu : p.excerptUk}
            </p>
            <Link href={`/blog/${p.slug}`} className="info-card__link">
              {readMore}
            </Link>
          </article>
        ))}
      </div>
    </InfoPage>
  );
}
