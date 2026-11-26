import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/types";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { ConsultTrackLink } from "@/components/analytics/ConsultTrackLink";
import { TradeInForm } from "@/components/tradein/TradeInForm";
import { getAllPublicSettings } from "@/lib/store-settings";
import {
  STORE_PHONE_DISPLAY,
  STORE_PHONE_TEL,
  STORE_PHONE_TELEGRAM,
  STORE_PHONE_WHATSAPP,
  STORE_PHONE_2_DISPLAY,
  STORE_PHONE_2_TEL,
} from "@/lib/contact";

type Props = { params: Promise<{ locale: string }> };

/**
 * Landing page for the buyback search ads ("продати тепловізор").
 *
 * Kept to observation devices — thermal monoculars, thermal binoculars and
 * night vision — so neither the ads nor the page fall under Google's weapons
 * rules; the full buyback page (/vykup) still covers sights. Not indexed: it
 * would compete with /vykup in search, and its visitors come from the ads.
 * The page marks itself data-merchant-clean, so the site menus leave the
 * weapon categories out here too.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ru"
        ? "Продать тепловизор, бинокль или ПНВ — выкуп б/у по всей Украине"
        : "Продати тепловізор, бінокль чи ПНБ — викуп Б/У по всій Україні",
    description:
      locale === "ru"
        ? "Выкупаем б/у тепловизоры, тепловизионные бинокли и приборы ночного видения. Оценка по фото, деньги или обмен на новый прибор. Работаем по всей Украине."
        : "Викуповуємо Б/У тепловізори, тепловізійні біноклі та прилади нічного бачення. Оцінка за фото, гроші або обмін на новий прилад. Працюємо по всій Україні.",
    robots: { index: false, follow: true },
  };
}

const BRANDS: [string, string][] = [
  ["Pulsar", "pulsar"],
  ["HikMicro", "hikmicro"],
  ["AGM", "agm"],
  ["InfiRay", "infiray"],
  ["Guide", "guide"],
  ["ThermTec", "thermtec"],
  ["Dipol", "dipol"],
];

export default async function SellPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const ru = loc === "ru";
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
        {L("Оцінити в Telegram", "Оценить в Telegram")}
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
      <ConsultTrackLink channel="phone" source="buyback" href={STORE_PHONE_TEL} className="btn-hero btn-hero-secondary !no-underline">
        {STORE_PHONE_DISPLAY}
      </ConsultTrackLink>
      <ConsultTrackLink channel="phone" source="buyback" href={STORE_PHONE_2_TEL} className="btn-hero btn-hero-secondary !no-underline">
        {STORE_PHONE_2_DISPLAY}
      </ConsultTrackLink>
    </div>
  );

  const perks: [string, string, string, string][] = [
    ["Оцінка за фото", "Оценка по фото", "Надішліть кілька фото — консультант назве ціну, без поїздок і зобов'язань.", "Пришлите несколько фото — консультант назовёт цену, без поездок и обязательств."],
    ["Гроші або обмін", "Деньги или обмен", "Отримайте оплату або зарахуйте вартість у новий прилад з каталогу (trade-in).", "Получите оплату или зачтите стоимость в новый прибор из каталога (trade-in)."],
    ["Вся Україна", "Вся Украина", "Працюємо з будь-яким містом, спосіб передачі приладу узгоджуємо з вами.", "Работаем с любым городом, способ передачи прибора согласуем с вами."],
  ];

  return (
    <InfoPage title={L("Продайте тепловізор, тепловізійний бінокль або ПНБ", "Продайте тепловизор, тепловизионный бинокль или ПНВ") as string}>
      {/* Menus leave the weapon categories out on this page (globals.css) */}
      <span data-merchant-clean="" hidden />
      <InfoPanel>
        <p className="text-lg">
          {L(
            "Викуповуємо Б/У тепловізори, тепловізійні біноклі та прилади нічного бачення. Оцінимо за фото, заплатимо гроші або зарахуємо вартість у новий прилад. Працюємо по всій Україні.",
            "Выкупаем б/у тепловизоры, тепловизионные бинокли и приборы ночного видения. Оценим по фото, заплатим деньги или зачтём стоимость в новый прибор. Работаем по всей Украине.",
          )}
        </p>
        {cta}
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {perks.map(([ukT, ruT, ukD, ruD]) => (
            <div key={ukT} className="rounded-xl border p-4" style={{ borderColor: "var(--border)" }}>
              <p className="font-semibold text-primary">{L(ukT, ruT)}</p>
              <p className="mt-1 text-sm text-secondary">{L(ukD, ruD)}</p>
            </div>
          ))}
        </div>
      </InfoPanel>

      <TradeInForm locale={loc} />

      <InfoPanel>
        <h2>{L("Що ми викуповуємо", "Что мы выкупаем")}</h2>
        <ul>
          <li>{L("тепловізійні монокуляри;", "тепловизионные монокуляры;")}</li>
          <li>{L("тепловізійні біноклі, зокрема з далекоміром;", "тепловизионные бинокли, в том числе с дальномером;")}</li>
          <li>{L("прилади нічного бачення: монокуляри, біноклі, окуляри.", "приборы ночного видения: монокуляры, бинокли, очки.")}</li>
        </ul>
        <p>
          {L("Бренди: ", "Бренды: ")}
          {BRANDS.map(([name, slug], i) => (
            <span key={slug}>
              {i > 0 ? ", " : ""}
              <Link href={`/brand/${slug}`}>{name}</Link>
            </span>
          ))}
          {L(" та інші.", " и другие.")}
        </p>

        <h2>{L("Як продати прилад — 3 кроки", "Как продать прибор — 3 шага")}</h2>
        <ol>
          <li>{L("Заповніть форму вище або напишіть у Telegram чи WhatsApp: модель, рік покупки, стан.", "Заполните форму выше или напишите в Telegram или WhatsApp: модель, год покупки, состояние.")}</li>
          <li>{L("Надішліть фото: корпус, об'єктив, екран увімкненого приладу, комплект.", "Пришлите фото: корпус, объектив, экран включённого прибора, комплект.")}</li>
          <li>{L("Отримайте ціну викупу або умови обміну. Погоджуєтесь — узгоджуємо передачу й оплату.", "Получите цену выкупа или условия обмена. Согласны — согласуем передачу и оплату.")}</li>
        </ol>

        <h2>{L("Що впливає на ціну", "Что влияет на цену")}</h2>
        <ul>
          <li>{L("модель і її актуальність;", "модель и её актуальность;")}</li>
          <li>{L("стан матриці, дисплея та акумулятора;", "состояние матрицы, дисплея и аккумулятора;")}</li>
          <li>{L("зовнішній стан лінзи й корпусу;", "внешнее состояние линзы и корпуса;")}</li>
          <li>{L("комплект: коробка, зарядний пристрій, кабелі, чохол;", "комплект: коробка, зарядное устройство, кабели, чехол;")}</li>
          <li>{L("документи: чек і гарантійний талон.", "документы: чек и гарантийный талон.")}</li>
        </ul>

        <h2>{L("Часті питання", "Частые вопросы")}</h2>
        <p><strong>{L("Скільки коштує мій тепловізор?", "Сколько стоит мой тепловизор?")}</strong></p>
        <p>{L("Ціну консультант називає після оцінки за фото — вона залежить від моделі, стану та комплекту.", "Цену консультант называет после оценки по фото — она зависит от модели, состояния и комплекта.")}</p>
        <p><strong>{L("Чи зобов'язаний я продавати після оцінки?", "Обязан ли я продавать после оценки?")}</strong></p>
        <p>{L("Ні. Оцінка нічого не зобов'язує — вирішуєте ви.", "Нет. Оценка ни к чему не обязывает — решаете вы.")}</p>
        <p><strong>{L("Я не в Києві — це проблема?", "Я не в Киеве — это проблема?")}</strong></p>
        <p>{L("Ні, працюємо по всій Україні. Спосіб передачі приладу консультант узгодить з вами.", "Нет, работаем по всей Украине. Способ передачи прибора консультант согласует с вами.")}</p>
        <p><strong>{L("Можна обміняти на новий прилад?", "Можно обменять на новый прибор?")}</strong></p>
        <p>
          {L("Так, вартість вашого приладу зараховується в ціну нового — оберіть його в ", "Да, стоимость вашего прибора засчитывается в цену нового — выберите его в ")}
          <Link href="/catalog/teplovizori">{L("каталозі тепловізорів", "каталоге тепловизоров")}</Link>
          {L(" або ", " или ")}
          <Link href="/catalog/binokli">{L("біноклів", "биноклей")}</Link>.
        </p>
        {cta}
      </InfoPanel>
    </InfoPage>
  );
}
