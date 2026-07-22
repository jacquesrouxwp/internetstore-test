import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";

const BODIES: Record<
  string,
  { uk: string; ru: string; titleUk: string; titleRu: string }
> = {
  "yak-obraty-teplovizor": {
    titleUk: "Як обрати тепловізор: гід за характеристиками",
    titleRu: "Как выбрать тепловизор: гид по характеристикам",
    uk: "Матриця 384×288 — золотий стандарт для більшості завдань. 640×512 потрібна, коли важлива ідентифікація на великих дистанціях. Об'єктив 19–25 мм зручний у лісі, 35–50 мм — на відкритій місцевості. NETD нижче 35 мК дає кращу «промальовку» в негоду.",
    ru: "Матрица 384×288 — золотой стандарт для большинства задач. 640×512 нужна, когда важна идентификация на больших дистанциях. Объектив 19–25 мм удобен в лесу, 35–50 мм — на открытой местности. NETD ниже 35 мК даёт лучшую детализацию в непогоду.",
  },
  "rix-vs-hikmicro": {
    titleUk: "Rix чи HikMicro: порівняння популярних моделей",
    titleRu: "Rix или HikMicro: сравнение популярных моделей",
    uk: "HikMicro сильний сервісом і лінійкою LYNX/FALCON. Rix часто пропонує цікавіше співвідношення ціна/функції в компактному форм-факторі. Вибір залежить від бюджету та потрібної матриці.",
    ru: "HikMicro силён сервисом и линейкой LYNX/FALCON. Rix часто предлагает более интересное соотношение цена/функции в компактном форм-факторе. Выбор зависит от бюджета и нужной матрицы.",
  },
  "dostavka-nova-poshta": {
    titleUk: "Доставка тепловізорів Новою Поштою",
    titleRu: "Доставка тепловизоров Новой Почтой",
    uk: "Кожен прилад пакуємо в оригінальну коробку з амортизацією. При отриманні перевірте комплектацію та увімкніть прилад у відділенні. Замовлення від 50 000 грн — доставка безкоштовна.",
    ru: "Каждый прибор упаковываем в оригинальную коробку с амортизацией. При получении проверьте комплектацию и включите прибор в отделении. Заказы от 50 000 грн — доставка бесплатная.",
  },
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = BODIES[slug];
  if (!post) notFound();
  const loc = locale as "uk" | "ru";
  const backLabel = loc === "ru" ? "← К новостям" : "← До новин";

  return (
    <InfoPage
      title={loc === "ru" ? post.titleRu : post.titleUk}
      lead={
        <Link href="/blog" className="info-page__back">
          {backLabel}
        </Link>
      }
    >
      <InfoPanel>
        <p>{loc === "ru" ? post.ru : post.uk}</p>
      </InfoPanel>
    </InfoPage>
  );
}
