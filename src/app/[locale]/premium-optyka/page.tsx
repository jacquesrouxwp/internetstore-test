import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/types";
import { Link } from "@/i18n/routing";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { PremiumOrderForm } from "@/components/premium/PremiumOrderForm";
import { localizedPath, pageAlternates } from "@/lib/seo-alternates";
import { absoluteUrl } from "@/lib/site-url";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/breadcrumbs";
import { faqPageJsonLd } from "@/lib/faq-json-ld";
import {
  CATEGORY_LABEL,
  PREMIUM_BRANDS,
  PREMIUM_BRANDS_US,
  brandsFor,
  type PremiumCategory,
} from "@/lib/premium-order";

type Props = { params: Promise<{ locale: string }> };

const PATH = "/premium-optyka";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ru"
        ? "Люкс-оптика под заказ: тепловизоры, бинокли, прицелы Swarovski, ZEISS, Leica"
        : locale === "en"
          ? "Premium optics to order: Swarovski, ZEISS, Leica thermal imagers and binoculars"
          : "Люкс-оптика під замовлення: тепловізори, біноклі, приціли Swarovski, ZEISS, Leica",
    description:
      locale === "ru"
        ? "Премиальные тепловизоры, бинокли, прицелы и дальномеры европейских брендов под заказ: Swarovski, ZEISS, Leica, Steiner, Kahles. Заявка онлайн за минуту."
        : locale === "en"
          ? "Premium thermal imagers, binoculars, riflescopes and rangefinders from European makers, sourced to order: Swarovski, ZEISS, Leica, Steiner, Kahles."
          : "Преміальні тепловізори, біноклі, приціли й далекоміри європейських брендів під замовлення: Swarovski, ZEISS, Leica, Steiner, Kahles. Заявка онлайн за хвилину.",
    alternates: pageAlternates(locale, PATH),
  };
}

/** Category sections, in the order people search for them. */
const SECTIONS: {
  category: PremiumCategory;
  catalog?: { href: string; label: { uk: string; ru: string; en: string } };
}[] = [
  {
    category: "thermal",
    catalog: {
      href: "/catalog/teplovizori",
      label: { uk: "тепловізори в каталозі", ru: "тепловизоры в каталоге", en: "thermal imagers in the catalogue" },
    },
  },
  {
    category: "binoculars",
    catalog: {
      href: "/catalog/binokli",
      label: { uk: "тепловізійні біноклі в каталозі", ru: "тепловизионные бинокли в каталоге", en: "thermal binoculars in the catalogue" },
    },
  },
  {
    category: "sights",
    catalog: {
      href: "/catalog/pricili",
      label: { uk: "тепловізійні приціли в каталозі", ru: "тепловизионные прицелы в каталоге", en: "thermal sights in the catalogue" },
    },
  },
  { category: "rangefinders" },
  { category: "spotting" },
];

/**
 * Premium optics sourced to order. The catalogue stocks thermal and night
 * vision; this page covers the European makers it does not carry and turns a
 * search for "Swarovski", "ZEISS Victory" or "Leica Geovid" into a request
 * the consultant can act on. See lib/premium-order for what it must not claim.
 */
export default async function PremiumOpticsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const loc = locale as Locale;
  const ru = loc === "ru";
  const en = loc === "en";
  const L = (uk: React.ReactNode, ruText: React.ReactNode, enText?: React.ReactNode): React.ReactNode =>
    en ? (enText ?? uk) : ru ? ruText : uk;
  const S = (uk: string, ruText: string, enText: string): string => (en ? enText : ru ? ruText : uk);

  const title = S(
    "Люкс-оптика під замовлення",
    "Люкс-оптика под заказ",
    "Premium optics to order",
  );

  const faq = [
    {
      q: S(
        "Чи можна замовити модель, якої немає у списку?",
        "Можно ли заказать модель, которой нет в списке?",
        "Can I order a model that is not on the list?",
      ),
      a: S(
        "Так. Бренди на цій сторінці — приклади. Напишіть назву моделі або опишіть задачу, і консультант підбере варіанти.",
        "Да. Бренды на этой странице — примеры. Напишите название модели или опишите задачу, и консультант подберёт варианты.",
        "Yes. The brands on this page are examples. Name the model or describe the task and a consultant will suggest options.",
      ),
    },
    {
      q: S("Скільки чекати на прилад?", "Сколько ждать прибор?", "How long does delivery take?"),
      a: S(
        "Термін залежить від моделі та її наявності у постачальника. Консультант назве його разом із ціною — до того, як ви підтвердите замовлення.",
        "Срок зависит от модели и её наличия у поставщика. Консультант назовёт его вместе с ценой — до того, как вы подтвердите заказ.",
        "It depends on the model and on the supplier's stock. The consultant names the delivery time together with the price, before you confirm the order.",
      ),
    },
    {
      q: S(
        "Яка гарантія на прилади під замовлення?",
        "Какая гарантия на приборы под заказ?",
        "What warranty do ordered devices have?",
      ),
      a: S(
        "Умови гарантії залежать від моделі та каналу постачання. Консультант назве їх до оформлення замовлення, щоб ви знали їх заздалегідь.",
        "Условия гарантии зависят от модели и канала поставки. Консультант назовёт их до оформления заказа, чтобы вы знали их заранее.",
        "Warranty terms depend on the model and on the supply channel. The consultant states them before the order is placed, so you know them in advance.",
      ),
    },
    {
      q: S("Чи зобов'язує мене заявка?", "Обязывает ли меня заявка?", "Does a request commit me to anything?"),
      a: S(
        "Ні. Заявка — це запит на ціну й термін. Умови оплати консультант узгоджує під кожне замовлення окремо.",
        "Нет. Заявка — это запрос цены и срока. Условия оплаты консультант согласует под каждый заказ отдельно.",
        "No. A request asks for a price and a delivery time. Payment terms are agreed for each order separately.",
      ),
    },
  ];

  const crumbs = [
    { name: ru ? "Главная" : en ? "Home" : "Головна", path: "/" },
    { name: title, path: PATH },
  ];
  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    serviceType: S(
      "Постачання преміальної оптики під замовлення",
      "Поставка премиальной оптики под заказ",
      "Sourcing premium optics to order",
    ),
    url: absoluteUrl(localizedPath(locale, PATH)),
    areaServed: { "@type": "Country", name: S("Україна", "Украина", "Ukraine") },
    provider: { "@type": "Organization", name: "Pro-Optics", url: absoluteUrl("/") },
  };
  const faqLd = faqPageJsonLd(faq);

  const toOrder = (
    <a href="#order" className="btn-hero btn-hero-primary !no-underline">
      {L("Залишити заявку", "Оставить заявку", "Send a request")}
    </a>
  );

  return (
    <InfoPage title={title}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(locale, crumbs)) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(service) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqLd) }} />
      )}

      <InfoPanel>
        <p>
          {L(
            "Преміальні тепловізори, біноклі, приціли, далекоміри та зорові труби європейських виробників — Swarovski Optik, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender та інших — рідко бувають у наявності в українських магазинах. Pro-Optics привозить їх під замовлення: ви називаєте модель, консультант знаходить її, називає ціну й термін постачання та зв'язується з вами.",
            "Премиальные тепловизоры, бинокли, прицелы, дальномеры и зрительные трубы европейских производителей — Swarovski Optik, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender и других — редко бывают в наличии в украинских магазинах. Pro-Optics привозит их под заказ: вы называете модель, консультант находит её, называет цену и срок поставки и связывается с вами.",
            "Premium thermal imagers, binoculars, riflescopes, rangefinders and spotting scopes from European makers — Swarovski Optik, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender and others — are rarely in stock in Ukrainian shops. Pro-Optics sources them to order: you name the model, a consultant finds it, gives you the price and the delivery time and gets back to you.",
          )}
        </p>
        <p>
          {L(
            "Це оптика, яку беруть на роки: світлосильні біноклі для спостереження в сутінках, приціли з точною механікою, біноклі з вбудованим далекоміром, компактні тепловізори від виробників з багаторічною історією. Заявка займає хвилину й ні до чого не зобов'язує.",
            "Это оптика, которую берут на годы: светосильные бинокли для наблюдения в сумерках, прицелы с точной механикой, бинокли со встроенным дальномером, компактные тепловизоры от производителей с многолетней историей. Заявка занимает минуту и ни к чему не обязывает.",
            "This is optics people buy for years: bright binoculars for observation at dusk, riflescopes with precise mechanics, binoculars with a built-in rangefinder, compact thermal imagers from makers with a long history. A request takes a minute and commits you to nothing.",
          )}
        </p>
        <div className="my-5">{toOrder}</div>
      </InfoPanel>

      <InfoPanel>
        <h2>{L("Що можна замовити", "Что можно заказать", "What you can order")}</h2>
        {SECTIONS.map(({ category, catalog }) => {
          const brands = brandsFor(category);
          if (!brands.length) return null;
          return (
            <div key={category}>
              <h3>{CATEGORY_LABEL[category][loc]}</h3>
              <ul>
                {brands.map((b) => (
                  <li key={b.name}>
                    <strong>{b.name}</strong> ({b.country[loc]}) — {b.lines[loc]}
                  </li>
                ))}
              </ul>
              {catalog && (
                <p>
                  {L("У наявності зараз: ", "В наличии сейчас: ", "In stock now: ")}
                  <Link href={catalog.href}>{catalog.label[loc]}</Link>.
                </p>
              )}
            </div>
          );
        })}
        <p>
          {L("Також на запит: ", "Также по запросу: ", "Also on request: ")}
          {PREMIUM_BRANDS_US.join(", ")}
          {L(" (США) та інші бренди.", " (США) и другие бренды.", " (USA) and other brands.")}
        </p>
      </InfoPanel>

      <InfoPanel>
        <h2>{L("Як працює замовлення", "Как работает заказ", "How ordering works")}</h2>
        <ol>
          <li>
            {L(
              "Ви залишаєте заявку: модель або задачу, бажаний бюджет і контакт.",
              "Вы оставляете заявку: модель или задачу, желаемый бюджет и контакт.",
              "You send a request: the model or the task, your budget and how to reach you.",
            )}
          </li>
          <li>
            {L(
              "Консультант уточнює деталі — кратність, об'єктив, комплектацію — і перевіряє наявність у постачальника.",
              "Консультант уточняет детали — кратность, объектив, комплектацию — и проверяет наличие у поставщика.",
              "A consultant clarifies the details — magnification, objective, what comes in the box — and checks the supplier's stock.",
            )}
          </li>
          <li>
            {L(
              "Ви отримуєте ціну, термін постачання та умови гарантії й оплати.",
              "Вы получаете цену, срок поставки и условия гарантии и оплаты.",
              "You get the price, the delivery time and the warranty and payment terms.",
            )}
          </li>
          <li>
            {L(
              "Після вашого підтвердження оформлюємо замовлення та доставку Новою Поштою.",
              "После вашего подтверждения оформляем заказ и доставку Новой Почтой.",
              "Once you confirm, we place the order and arrange Nova Poshta delivery.",
            )}
          </li>
        </ol>

        <h2>{L("Бренди", "Бренды", "Brands")}</h2>
        <ul>
          {PREMIUM_BRANDS.map((b) => (
            <li key={b.name}>
              <strong>{b.name}</strong>, {b.country[loc]}
            </li>
          ))}
        </ul>

        <h2>{L("Питання та відповіді", "Вопросы и ответы", "Questions and answers")}</h2>
        {faq.map((f) => (
          <div key={f.q}>
            <p>
              <strong>{f.q}</strong>
            </p>
            <p>{f.a}</p>
          </div>
        ))}

        <p className="text-sm text-muted-ui">
          {L(
            "Pro-Optics не є офіційним представником зазначених брендів. Назви брендів і моделей — товарні знаки їхніх власників і наведені лише для того, щоб ви могли вказати, що шукаєте.",
            "Pro-Optics не является официальным представителем указанных брендов. Названия брендов и моделей — товарные знаки их владельцев и приведены лишь для того, чтобы вы могли указать, что ищете.",
            "Pro-Optics is not an official representative of the brands named here. Brand and model names are trademarks of their owners and appear only so you can say what you are looking for.",
          )}
        </p>
      </InfoPanel>

      <PremiumOrderForm locale={loc} />
    </InfoPage>
  );
}
