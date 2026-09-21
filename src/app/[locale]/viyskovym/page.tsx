import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { ConsultTrackLink } from "@/components/analytics/ConsultTrackLink";
import { localizedPath, pageAlternates } from "@/lib/seo-alternates";
import { absoluteUrl } from "@/lib/site-url";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/breadcrumbs";
import { getAllPublicSettings } from "@/lib/store-settings";
import {
  STORE_PHONE_DISPLAY,
  STORE_PHONE_TEL,
  STORE_PHONE_TELEGRAM,
  STORE_PHONE_WHATSAPP,
} from "@/lib/contact";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const ru = locale === "ru";
  return {
    title: ru
      ? "Тепловизоры для военных и ВСУ — специальные условия, скидка"
      : "Тепловізори для військових і ЗСУ — спеціальні умови, знижка",
    description: ru
      ? "Скидка для военнослужащих ВСУ, НГУ, пограничников, добровольцев и ТрО на тепловизоры, прицелы и ПНВ. Как подтвердить статус, подбор под задачу, доставка Новой Почтой."
      : "Знижка для військовослужбовців ЗСУ, НГУ, прикордонників, добровольців і ТрО на тепловізори, приціли та ПНБ. Як підтвердити статус, підбір під задачу, доставка Новою Поштою.",
    alternates: pageAlternates(locale, "/viyskovym"),
  };
}

/**
 * Military terms page. States exactly what /about says (permanent special
 * terms on the whole range, who qualifies, which documents confirm status);
 * the discount size is not published anywhere, so the copy doesn't name one.
 */
export default async function MilitaryPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ru = locale === "ru";
  const L = (uk: React.ReactNode, ruText: React.ReactNode) => (ru ? ruText : uk);

  let tg = process.env.NEXT_PUBLIC_TELEGRAM_URL || STORE_PHONE_TELEGRAM;
  let wa = process.env.NEXT_PUBLIC_WHATSAPP_URL || STORE_PHONE_WHATSAPP;
  try {
    const s = await getAllPublicSettings();
    if (s.social.telegram) tg = s.social.telegram;
    if (s.social.whatsapp) wa = s.social.whatsapp;
  } catch {
    /* settings table may not exist yet */
  }

  const title = ru
    ? "Тепловизоры для военных — специальные условия"
    : "Тепловізори для військових — спеціальні умови";
  const crumbs = [
    { name: ru ? "Главная" : "Головна", path: "/" },
    { name: title, path: "/viyskovym" },
  ];
  const offer = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url: absoluteUrl(localizedPath(locale, "/viyskovym")),
    about: ru ? "Скидка для военнослужащих на тепловизионную оптику" : "Знижка для військовослужбовців на тепловізійну оптику",
    isPartOf: { "@type": "WebSite", name: "Pro-Optics", url: absoluteUrl("/") },
  };

  const cta = (
    <div className="my-5 flex flex-wrap gap-2.5">
      <ConsultTrackLink
        channel="telegram"
        source="military"
        href={tg}
        target="_blank"
        rel="noreferrer"
        className="btn-hero btn-hero-primary !no-underline"
      >
        {L("Написати в Telegram", "Написать в Telegram")}
      </ConsultTrackLink>
      <ConsultTrackLink
        channel="whatsapp"
        source="military"
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="btn-hero btn-hero-secondary !no-underline"
      >
        WhatsApp
      </ConsultTrackLink>
      <ConsultTrackLink
        channel="phone"
        source="military"
        href={STORE_PHONE_TEL}
        className="btn-hero btn-hero-secondary !no-underline"
      >
        {STORE_PHONE_DISPLAY}
      </ConsultTrackLink>
    </div>
  );

  const tasks: [React.ReactNode, React.ReactNode, string][] = [
    [
      L("Спостереження та розвідка на великих дистанціях", "Наблюдение и разведка на больших дистанциях"),
      L("тепловізори з матрицею 640", "тепловизоры с матрицей 640"),
      "/catalog/teplovizori/matrytsia-640",
    ],
    [
      L("Точна відстань до цілі", "Точное расстояние до цели"),
      L("тепловізори з далекоміром", "тепловизоры с дальномером"),
      "/catalog/teplovizori/z-dalekomirom",
    ],
    [
      L("Тривале спостереження, охорона периметра", "Длительное наблюдение, охрана периметра"),
      L("тепловізійні біноклі", "тепловизионные бинокли"),
      "/catalog/binokli",
    ],
    [
      L("Приціл зі вбудованим далекоміром", "Прицел со встроенным дальномером"),
      L("тепловізійні приціли з далекоміром", "тепловизионные прицелы с дальномером"),
      "/catalog/pricili/z-dalekomirom",
    ],
    [
      L("Нічна версія денного прицілу", "Ночная версия дневного прицела"),
      L("тепловізійні насадки", "тепловизионные насадки"),
      "/catalog/nasadky",
    ],
    [
      L("Прилади нічного бачення", "Приборы ночного видения"),
      L("ПНБ", "ПНВ"),
      "/catalog/pnb",
    ],
  ];

  return (
    <InfoPage title={title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(locale, crumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(offer) }}
      />
      <InfoPanel>
        <p>
          {L(
            "Pro-Optics постійно надає окремі, вигідні умови захисникам України на весь асортимент — тепловізори, тепловізійні приціли, прилади нічного бачення, монокуляри та біноклі. Консультант допоможе підібрати прилад під конкретне завдання: спостереження, розвідку, охорону периметра чи нічні чергування.",
            "Pro-Optics постоянно предоставляет отдельные, выгодные условия защитникам Украины на весь ассортимент — тепловизоры, тепловизионные прицелы, приборы ночного видения, монокуляры и бинокли. Консультант поможет подобрать прибор под конкретную задачу: наблюдение, разведку, охрану периметра или ночные дежурства."
          )}
        </p>
        {cta}

        <h2>{L("Хто може отримати знижку", "Кто может получить скидку")}</h2>
        <ul>
          <li>{L("військовослужбовці Збройних Сил України;", "военнослужащие Вооружённых Сил Украины;")}</li>
          <li>{L("Національна гвардія України;", "Национальная гвардия Украины;")}</li>
          <li>{L("прикордонники;", "пограничники;")}</li>
          <li>{L("добровольці та бійці територіальної оборони.", "добровольцы и бойцы территориальной обороны.")}</li>
        </ul>

        <h2>{L("Як отримати знижку", "Как получить скидку")}</h2>
        <ol>
          <li>
            {L(
              <>
                Оберіть прилад у <Link href="/catalog/teplovizori">каталозі</Link> або опишіть
                задачу консультанту — він підбере варіанти.
              </>,
              <>
                Выберите прибор в <Link href="/catalog/teplovizori">каталоге</Link> или опишите
                задачу консультанту — он подберёт варианты.
              </>
            )}
          </li>
          <li>
            {L(
              "До оформлення замовлення напишіть нам у Telegram чи WhatsApp або зателефонуйте.",
              "До оформления заказа напишите нам в Telegram или WhatsApp или позвоните."
            )}
          </li>
          <li>
            {L(
              "Підтвердьте статус: посвідчення учасника бойових дій, військовий квиток або відповідний документ підрозділу.",
              "Подтвердите статус: удостоверение участника боевых действий, военный билет или соответствующий документ подразделения."
            )}
          </li>
          <li>
            {L(
              "Консультант назве ціну зі знижкою та оформить замовлення з доставкою Новою Поштою.",
              "Консультант назовёт цену со скидкой и оформит заказ с доставкой Новой Почтой."
            )}
          </li>
        </ol>

        <h2>{L("Що підібрати під задачу", "Что подобрать под задачу")}</h2>
        <ul>
          {tasks.map(([task, label, href]) => (
            <li key={href}>
              {task} — <Link href={href}>{label}</Link>
            </li>
          ))}
        </ul>
        <p>
          {L(
            <>
              Як різні матриці й об'єктиви бачать ціль на дистанції, можна порівняти в{" "}
              <Link href="/simulator">симуляторі тепловізора</Link>, а що означають цифри
              дальності в паспорті — у статті{" "}
              <Link href="/blog/dalnist-teplovizora-yak-chytaty-pasport">«Дальність тепловізора»</Link>.
            </>,
            <>
              Как разные матрицы и объективы видят цель на дистанции, можно сравнить в{" "}
              <Link href="/simulator">симуляторе тепловизора</Link>, а что означают цифры
              дальности в паспорте — в статье{" "}
              <Link href="/blog/dalnist-teplovizora-yak-chytaty-pasport">«Дальность тепловизора»</Link>.
            </>
          )}
        </p>

        <h2>{L("Питання та відповіді", "Вопросы и ответы")}</h2>
        <p>
          <strong>{L("Яка знижка для військових?", "Какая скидка для военных?")}</strong>
        </p>
        <p>
          {L(
            "Точну ціну зі знижкою консультант назве після підтвердження статусу — напишіть або зателефонуйте перед замовленням.",
            "Точную цену со скидкой консультант назовёт после подтверждения статуса — напишите или позвоните перед заказом."
          )}
        </p>
        <p>
          <strong>{L("На які товари діють умови?", "На какие товары действуют условия?")}</strong>
        </p>
        <p>
          {L(
            "На весь асортимент: тепловізори, тепловізійні приціли, прилади нічного бачення, монокуляри та біноклі.",
            "На весь ассортимент: тепловизоры, тепловизионные прицелы, приборы ночного видения, монокуляры и бинокли."
          )}
        </p>
        <p>
          <strong>{L("Як швидко доставите?", "Как быстро доставите?")}</strong>
        </p>
        <p>
          {L(
            <>
              Новою Поштою по всій Україні, зазвичай за 1–2 дні; оплата можлива при отриманні.
              Детальніше — на сторінці <Link href="/delivery">«Доставка і оплата»</Link>.
            </>,
            <>
              Новой Почтой по всей Украине, обычно за 1–2 дня; оплата возможна при получении.
              Подробнее — на странице <Link href="/delivery">«Доставка и оплата»</Link>.
            </>
          )}
        </p>

        {cta}
      </InfoPanel>
    </InfoPage>
  );
}
