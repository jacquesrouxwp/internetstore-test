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
  return {
    title:
      locale === "ru"
        ? "Тепловизоры для военных и ВСУ — специальные условия, скидка"
        : locale === "en"
          ? "Thermal imagers for the military in Ukraine — separate terms"
          : "Тепловізори для військових і ЗСУ — спеціальні умови, знижка",
    description:
      locale === "ru"
        ? "Скидка для военнослужащих ВСУ, НГУ, пограничников, добровольцев и ТрО на тепловизоры, прицелы и ПНВ. Как подтвердить статус, подбор под задачу, доставка Новой Почтой."
        : locale === "en"
          ? "Separate terms for the Armed Forces of Ukraine, the National Guard, the Border Guard, volunteers and territorial defence on thermal imagers, sights and night vision. How to confirm status, what to pick for the task, Nova Poshta delivery."
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
  const en = locale === "en";
  // Third argument is optional: a page still being translated falls back to
  // Ukrainian rather than rendering an empty slot.
  const L = (
    uk: React.ReactNode,
    ruText: React.ReactNode,
    enText?: React.ReactNode,
  ): React.ReactNode => (en ? (enText ?? uk) : ru ? ruText : uk);

  let tg = process.env.NEXT_PUBLIC_TELEGRAM_URL || STORE_PHONE_TELEGRAM;
  let wa = process.env.NEXT_PUBLIC_WHATSAPP_URL || STORE_PHONE_WHATSAPP;
  try {
    const s = await getAllPublicSettings();
    if (s.social.telegram) tg = s.social.telegram;
    if (s.social.whatsapp) wa = s.social.whatsapp;
  } catch {
    /* settings table may not exist yet */
  }

  const title = L(
    "Тепловізори для військових — спеціальні умови",
    "Тепловизоры для военных — специальные условия",
    "Thermal imagers for the military — separate terms",
  ) as string;
  const crumbs = [
    { name: L("Головна", "Главная", "Home") as string, path: "/" },
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
        {L("Написати в Telegram", "Написать в Telegram", "Message us on Telegram")}
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
      L("Спостереження та розвідка на великих дистанціях", "Наблюдение и разведка на больших дистанциях", "Observation and reconnaissance at long range"),
      L("тепловізори з матрицею 640", "тепловизоры с матрицей 640", "thermal imagers with a 640 sensor"),
      "/catalog/teplovizori/matrytsia-640",
    ],
    [
      L("Точна відстань до цілі", "Точное расстояние до цели", "Exact distance to the target"),
      L("тепловізори з далекоміром", "тепловизоры с дальномером", "thermal imagers with a rangefinder"),
      "/catalog/teplovizori/z-dalekomirom",
    ],
    [
      L("Тривале спостереження, охорона периметра", "Длительное наблюдение, охрана периметра", "Long watches, perimeter security"),
      L("тепловізійні біноклі", "тепловизионные бинокли", "thermal binoculars"),
      "/catalog/binokli",
    ],
    [
      L("Приціл зі вбудованим далекоміром", "Прицел со встроенным дальномером", "A sight with a built-in rangefinder"),
      L("тепловізійні приціли з далекоміром", "тепловизионные прицелы с дальномером", "thermal sights with a rangefinder"),
      "/catalog/pricili/z-dalekomirom",
    ],
    [
      L("Нічна версія денного прицілу", "Ночная версия дневного прицела", "A night version of your day optic"),
      L("тепловізійні насадки", "тепловизионные насадки", "thermal clip-on attachments"),
      "/catalog/nasadky",
    ],
    [
      L("Прилади нічного бачення", "Приборы ночного видения", "Night vision devices"),
      L("ПНБ", "ПНВ", "night vision"),
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
            "Pro-Optics постоянно предоставляет отдельные, выгодные условия защитникам Украины на весь ассортимент — тепловизоры, тепловизионные прицелы, приборы ночного видения, монокуляры и бинокли. Консультант поможет подобрать прибор под конкретную задачу: наблюдение, разведку, охрану периметра или ночные дежурства.",
            "Pro-Optics gives the defenders of Ukraine separate, favourable terms across the whole range — thermal imagers, thermal sights, night vision devices, monoculars and binoculars. The consultant will help pick a device for the actual task: observation, reconnaissance, perimeter security or night watch."
          )}
        </p>
        {cta}

        <h2>{L("Хто може отримати знижку", "Кто может получить скидку", "Who the discount is for")}</h2>
        <ul>
          <li>{L("військовослужбовці Збройних Сил України;", "военнослужащие Вооружённых Сил Украины;", "serving members of the Armed Forces of Ukraine;")}</li>
          <li>{L("Національна гвардія України;", "Национальная гвардия Украины;", "the National Guard of Ukraine;")}</li>
          <li>{L("прикордонники;", "пограничники;", "the Border Guard;")}</li>
          <li>{L("добровольці та бійці територіальної оборони.", "добровольцы и бойцы территориальной обороны.", "volunteers and territorial defence fighters.")}</li>
        </ul>

        <h2>{L("Як отримати знижку", "Как получить скидку", "How to claim it")}</h2>
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
              </>,
              <>
                Pick a device in the <Link href="/catalog/teplovizori">catalogue</Link> or describe
                the task to a consultant — he will suggest options.
              </>
            )}
          </li>
          <li>
            {L(
              "До оформлення замовлення напишіть нам у Telegram чи WhatsApp або зателефонуйте.",
              "До оформления заказа напишите нам в Telegram или WhatsApp или позвоните.", "Before placing the order, write to us on Telegram or WhatsApp, or call."
            )}
          </li>
          <li>
            {L(
              "Підтвердьте статус: посвідчення учасника бойових дій, військовий квиток або відповідний документ підрозділу.",
              "Подтвердите статус: удостоверение участника боевых действий, военный билет или соответствующий документ подразделения.", "Confirm your status: a combat participant certificate, a military ID or a corresponding document from your unit."
            )}
          </li>
          <li>
            {L(
              "Консультант назве ціну зі знижкою та оформить замовлення з доставкою Новою Поштою.",
              "Консультант назовёт цену со скидкой и оформит заказ с доставкой Новой Почтой.", "The consultant names the discounted price and places the order with Nova Poshta delivery."
            )}
          </li>
        </ol>

        <h2>{L("Що підібрати під задачу", "Что подобрать под задачу", "What to pick for the task")}</h2>
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
              Як різні матриці й об’єктиви бачать ціль на дистанції, можна порівняти в{" "}
              <Link href="/simulator">симуляторі тепловізора</Link>, а що означають цифри
              дальності в паспорті — у статті{" "}
              <Link href="/blog/dalnist-teplovizora-yak-chytaty-pasport">«Дальність тепловізора»</Link>.
            </>,
            <>
              Как разные матрицы и объективы видят цель на дистанции, можно сравнить в{" "}
              <Link href="/simulator">симуляторе тепловизора</Link>, а что означают цифры
              дальности в паспорте — в статье{" "}
              <Link href="/blog/dalnist-teplovizora-yak-chytaty-pasport">«Дальность тепловизора»</Link>.
            </>,
            <>
              How different sensors and lenses see a target at distance can be compared in the{" "}
              <Link href="/simulator">thermal simulator</Link>, and what the stated detection
              figures actually mean is explained in{" "}
              <Link href="/blog/dalnist-teplovizora-yak-chytaty-pasport">
                “Thermal detection range”
              </Link>
              .
            </>
          )}
        </p>

        <h2>{L("Питання та відповіді", "Вопросы и ответы", "Questions and answers")}</h2>
        <p>
          <strong>{L("Яка знижка для військових?", "Какая скидка для военных?", "How large is the military discount?")}</strong>
        </p>
        <p>
          {L(
            "Точну ціну зі знижкою консультант назве після підтвердження статусу — напишіть або зателефонуйте перед замовленням.",
            "Точную цену со скидкой консультант назовёт после подтверждения статуса — напишите или позвоните перед заказом.", "The consultant names the exact discounted price once your status is confirmed — write or call before ordering."
          )}
        </p>
        <p>
          <strong>{L("На які товари діють умови?", "На какие товары действуют условия?", "Which products do the terms cover?")}</strong>
        </p>
        <p>
          {L(
            "На весь асортимент: тепловізори, тепловізійні приціли, прилади нічного бачення, монокуляри та біноклі.",
            "На весь ассортимент: тепловизоры, тепловизионные прицелы, приборы ночного видения, монокуляры и бинокли.", "The whole range: thermal imagers, thermal sights, night vision devices, monoculars and binoculars."
          )}
        </p>
        <p>
          <strong>{L("Як швидко доставите?", "Как быстро доставите?", "How fast is delivery?")}</strong>
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
            </>,
            <>
              Nova Poshta across Ukraine, usually in 1–2 days; you can pay on delivery. More on
              the <Link href="/delivery">Delivery and payment</Link> page.
            </>
          )}
        </p>

        {cta}
      </InfoPanel>
    </InfoPage>
  );
}
