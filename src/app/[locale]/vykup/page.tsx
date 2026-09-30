import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/types";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { ConsultTrackLink } from "@/components/analytics/ConsultTrackLink";
import { TradeInForm } from "@/components/tradein/TradeInForm";
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

/** Brands with their own landing page — linked from "що ми приймаємо". */
const BRANDS: [string, string][] = [
  ["Pulsar", "pulsar"],
  ["HikMicro", "hikmicro"],
  ["AGM", "agm"],
  ["InfiRay", "infiray"],
  ["ATN", "atn"],
  ["PARD", "pard"],
  ["Guide", "guide"],
  ["ThermTec", "thermtec"],
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ru"
        ? "Выкуп тепловизоров б/у и trade-in — продать тепловизор, прицел, ПНВ"
        : locale === "en"
          ? "Sell your thermal imager in Ukraine — buyback and trade-in"
          : "Викуп тепловізорів Б/У та trade-in — продати тепловізор, приціл, ПНБ",
    description:
      locale === "ru"
        ? "Выкупаем б/у тепловизоры, тепловизионные прицелы и ПНВ Pulsar, HikMicro, AGM, InfiRay и других брендов по всей Украине. Оценка консультантом, выкуп или обмен на новый прибор (trade-in)."
        : locale === "en"
          ? "We buy used thermal imagers, thermal sights and night vision devices — Pulsar, HikMicro, AGM, InfiRay and others — anywhere in Ukraine. Send photos and your asking price through the form; an English-speaking colleague replies."
          : "Викуповуємо Б/У тепловізори, тепловізійні приціли та ПНБ Pulsar, HikMicro, AGM, InfiRay та інших брендів по всій Україні. Оцінка консультантом, викуп або обмін на новий прилад (trade-in).",
alternates: pageAlternates(locale, "/vykup"),
  };
}

/**
 * Buy-back / trade-in landing page. The store announces it on the homepage
 * but had no page for "викуп тепловізорів" queries. Copy states only what the
 * store says elsewhere (consultant appraisal, buy-back or exchange, all of
 * Ukraine); payment and shipping terms are agreed per case.
 */
export default async function BuybackPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const ru = loc === "ru";
  const en = loc === "en";
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
    "Викуп тепловізорів Б/У та trade-in",
    "Выкуп тепловизоров б/у и trade-in",
    "Thermal imager buyback and trade-in",
  ) as string;
  const crumbs = [
    { name: ru ? "Главная" : "Головна", path: "/" },
    { name: title, path: "/vykup" },
  ];
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    serviceType: ru ? "Выкуп и обмен тепловизоров" : "Викуп та обмін тепловізорів",
    url: absoluteUrl(localizedPath(locale, "/vykup")),
    areaServed: { "@type": "Country", name: ru ? "Украина" : "Україна" },
    provider: { "@type": "Organization", name: "Pro-Optics", url: absoluteUrl("/") },
  };

  const cta = (
    <div className="my-5 flex flex-wrap gap-2.5">
      <ConsultTrackLink
        channel="telegram"
        source="buyback"
        href={tg}
        target="_blank"
        rel="noreferrer"
        className="btn-hero btn-hero-primary !no-underline"
      >
        {L("Оцінити в Telegram", "Оценить в Telegram", "Get a quote on Telegram")}
      </ConsultTrackLink>
      <ConsultTrackLink
        channel="whatsapp"
        source="buyback"
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="btn-hero btn-hero-secondary !no-underline"
      >
        WhatsApp
      </ConsultTrackLink>
      <ConsultTrackLink
        channel="phone"
        source="buyback"
        href={STORE_PHONE_TEL}
        className="btn-hero btn-hero-secondary !no-underline"
      >
        {STORE_PHONE_DISPLAY}
      </ConsultTrackLink>
    </div>
  );

  return (
    <InfoPage title={title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbJsonLd(locale, crumbs)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(service) }}
      />
      <InfoPanel>
        <p>
          {L(
            "Продайте свій тепловізор, тепловізійний приціл або прилад нічного бачення — чи обміняйте його на новий з доплатою. Консультант Pro-Optics оцінить стан приладу, назве ринкову ціну та умови викупу або обміну. Працюємо по всій Україні.",
            "Продайте свой тепловизор, тепловизионный прицел или прибор ночного видения — или обменяйте его на новый с доплатой. Консультант Pro-Optics оценит состояние прибора, назовёт рыночную цену и условия выкупа или обмена. Работаем по всей Украине.", "Sell us your thermal imager, thermal sight or night vision device — or trade it in against a new one. A Pro-Optics consultant assesses the condition, names the market price and the terms of purchase or exchange. We work across Ukraine. Not everyone on our phone line speaks English, so the online form is the surest route: an English-speaking colleague picks it up and gets back to you."
          )}
        </p>
        {cta}
      </InfoPanel>

      <TradeInForm locale={loc} />

      <InfoPanel>
        <h2>{L("Що ми приймаємо", "Что мы принимаем", "What we take")}</h2>
        <ul>
          <li>{L("тепловізійні монокуляри та біноклі;", "тепловизионные монокуляры и бинокли;", "thermal monoculars and binoculars;")}</li>
          <li>{L("тепловізійні приціли та насадки;", "тепловизионные прицелы и насадки;", "thermal sights and clip-on attachments;")}</li>
          <li>{L("прилади нічного бачення (ПНБ) та нічні приціли.", "приборы ночного видения (ПНВ) и ночные прицелы.", "night vision devices and night sights.")}</li>
        </ul>
        <p>
          {L("Бренди: ", "Бренды: ", "Brands: ")}
          {BRANDS.map(([name, slug], i) => (
            <span key={slug}>
              {i > 0 ? ", " : ""}
              <Link href={`/brand/${slug}`}>{name}</Link>
            </span>
          ))}
          {L(" та інші.", " и другие.", " and others.")}
        </p>

        <h2>{L("Як це працює", "Как это работает", "How it works")}</h2>
        <ol>
          <li>
            {L(
              "Напишіть нам у Telegram чи WhatsApp або зателефонуйте: вкажіть модель приладу, коли його купували та в якому він стані.",
              "Напишите нам в Telegram или WhatsApp или позвоните: укажите модель прибора, когда его покупали и в каком он состоянии.", "Fill in the form above — it takes two minutes and the consultant sees the model, the condition and your photos before getting in touch. You can also write on Telegram or WhatsApp."
            )}
          </li>
          <li>
            {L(
              "Надішліть кілька фото: корпус, об'єктив, екран увімкненого приладу та комплектацію.",
              "Пришлите несколько фото: корпус, объектив, экран включённого прибора и комплектацию.", "Attach a few photos: the body, the lens, the screen of the device switched on, and what comes with it."
            )}
          </li>
          <li>
            {L(
              "Консультант оцінить прилад і назве ціну викупу або умови обміну на новий прилад.",
              "Консультант оценит прибор и назовёт цену выкупа или условия обмена на новый прибор.", "The consultant assesses the device and names a purchase price or the terms of an exchange."
            )}
          </li>
          <li>
            {L(
              "Якщо умови вас влаштовують — узгоджуємо спосіб передачі приладу та оплати.",
              "Если условия вас устраивают — согласуем способ передачи прибора и оплаты.", "If the terms suit you, we agree how to hand the device over and how you get paid."
            )}
          </li>
        </ol>

        <h2>{L("Trade-in: обмін старого приладу на новий", "Trade-in: обмен старого прибора на новый", "Trade-in: your old device against a new one")}</h2>
        <p>
          {L(
            <>
              Вартість вашого приладу враховується в ціні нового — ви доплачуєте різницю. Так
              можна перейти з матриці 256 на 384 чи 640, узяти приціл із далекоміром або оновити
              модель, не продаючи стару окремо. Новий прилад можна обрати в{" "}
              <Link href="/catalog/teplovizori">каталозі тепловізорів</Link>,{" "}
              <Link href="/catalog/pricili">прицілів</Link> чи на{" "}
              <Link href="/brand">сторінках брендів</Link>.
            </>,
            <>
              Стоимость вашего прибора учитывается в цене нового — вы доплачиваете разницу. Так
              можно перейти с матрицы 256 на 384 или 640, взять прицел с дальномером или обновить
              модель, не продавая старую отдельно. Новый прибор можно выбрать в{" "}
              <Link href="/catalog/teplovizori">каталоге тепловизоров</Link>,{" "}
              <Link href="/catalog/pricili">прицелов</Link> или на{" "}
              <Link href="/brand">страницах брендов</Link>.
            </>,
            <>
              What your device is worth goes towards the new one — you pay the difference. That is
              how people move from a 256 sensor to 384 or 640, add a rangefinder or refresh a model
              without selling the old one separately. Pick the new device in the{" "}
              <Link href="/catalog/teplovizori">thermal imager catalogue</Link>, among{" "}
              <Link href="/catalog/pricili">sights</Link> or on the{" "}
              <Link href="/brand">brand pages</Link>.
            </>
          )}
        </p>

        <h2>{L("Що впливає на ціну", "Что влияет на цену", "What the price depends on")}</h2>
        <ul>
          <li>{L("модель і наскільки вона актуальна;", "модель и насколько она актуальна;", "the model and how current it still is;")}</li>
          <li>
            {L(
              "технічний стан: матриця без битих пікселів, справний дисплей, калібрування, акумулятор;",
              "техническое состояние: матрица без битых пикселей, исправный дисплей, калибровка, аккумулятор;", "technical condition: a sensor without dead pixels, a working display, calibration, the battery;"
            )}
          </li>
          <li>{L("зовнішній стан: лінза, корпус, кнопки;", "внешнее состояние: линза, корпус, кнопки;", "cosmetic condition: the lens, the body, the buttons;")}</li>
          <li>
            {L(
              "комплектність: коробка, зарядний пристрій, кабелі, чохол, кріплення;",
              "комплектность: коробка, зарядное устройство, кабели, чехол, крепление;", "completeness: box, charger, cables, case, mounts;"
            )}
          </li>
          <li>{L("документи: чек, гарантійний талон.", "документы: чек, гарантийный талон.", "paperwork: the receipt and the warranty card.")}</li>
        </ul>

        <h2>{L("Питання та відповіді", "Вопросы и ответы", "Questions and answers")}</h2>
        <p>
          <strong>{L("Скільки коштує мій тепловізор?", "Сколько стоит мой тепловизор?", "What is my thermal imager worth?")}</strong>
        </p>
        <p>
          {L(
            <>
              Ціну консультант називає після оцінки — вона залежить від моделі, стану та
              комплектності. Зорієнтуватися допоможуть ціни на нові моделі в{" "}
              <Link href="/catalog/teplovizori">каталозі</Link>.
            </>,
            <>
              Цену консультант называет после оценки — она зависит от модели, состояния и
              комплектности. Сориентироваться помогут цены на новые модели в{" "}
              <Link href="/catalog/teplovizori">каталоге</Link>.
            </>,
            <>
              The consultant names a price after the appraisal — it depends on the model, the
              condition and what comes with it. Prices for new models in the{" "}
              <Link href="/catalog/teplovizori">catalogue</Link> give you a reference point.
            </>
          )}
        </p>
        <p>
          <strong>
            {L("Чи викуповуєте прилади з інших міст?", "Выкупаете ли приборы из других городов?", "Do you buy devices from other cities?")}
          </strong>
        </p>
        <p>
          {L(
            "Так, працюємо по всій Україні. Спосіб передачі приладу консультант узгодить з вами.",
            "Да, работаем по всей Украине. Способ передачи прибора консультант согласует с вами.", "Yes, we work across Ukraine. The consultant will agree with you how to hand the device over."
          )}
        </p>
        <p>
          <strong>
            {L(
              "Чи можна обміняти прилад на модель іншого бренду?",
              "Можно ли обменять прибор на модель другого бренда?", "Can I exchange my device for a different brand?"
            )}
          </strong>
        </p>
        <p>
          {L(
            "Так, у межах trade-in можна обрати прилад із нашого каталогу — умови обміну консультант назве після оцінки.",
            "Да, в рамках trade-in можно выбрать прибор из нашего каталога — условия обмена консультант назовёт после оценки.", "Yes — with a trade-in you can pick any device from our catalogue, and the consultant names the terms after the appraisal."
          )}
        </p>

        {cta}
      </InfoPanel>
    </InfoPage>
  );
}
