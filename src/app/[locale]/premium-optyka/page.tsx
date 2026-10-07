import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/types";
import { Link } from "@/i18n/routing";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { PremiumOrderForm } from "@/components/premium/PremiumOrderForm";
import { PremiumBrandGrid } from "@/components/premium/PremiumBrandGrid";
import { localizedPath, pageAlternates } from "@/lib/seo-alternates";
import { absoluteUrl } from "@/lib/site-url";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/breadcrumbs";
import { faqPageJsonLd } from "@/lib/faq-json-ld";

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
        ? "Премиальные тепловизоры, бинокли, прицелы, дальномеры и подзорные трубы Swarovski, ZEISS, Leica, Steiner, Kahles под заказ. Напишите модель — мы свяжемся с вами."
        : locale === "en"
          ? "Premium thermal imagers, binoculars, riflescopes, rangefinders and spotting scopes from Swarovski, ZEISS, Leica, Steiner, Kahles, to order. Name the model."
          : "Преміальні тепловізори, біноклі, приціли, далекоміри й підзорні труби Swarovski, ZEISS, Leica, Steiner, Kahles під замовлення. Напишіть модель — ми зв'яжемося.",
    alternates: pageAlternates(locale, PATH),
  };
}

/**
 * Premium optics to order. The form comes first and asks for one thing — the
 * model — then the brands follow as a compact grid whose cards open to their
 * models; a click on a model fills the form. See lib/premium-order for what
 * the page must not claim.
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

  const title = S("Люкс-оптика під замовлення", "Люкс-оптика под заказ", "Premium optics to order");

  const faq = [
    {
      q: S(
        "Чи можна замовити модель, якої немає у списку?",
        "Можно ли заказать модель, которой нет в списке?",
        "Can I order a model that is not on the list?",
      ),
      a: S(
        "Так. Список — лише приклади. Напишіть у формі будь-яку модель, і наш співробітник зв'яжеться з вами.",
        "Да. Список — лишь примеры. Напишите в форме любую модель, и наш сотрудник свяжется с вами.",
        "Yes. The list only shows examples. Write any model in the form and a colleague will get back to you.",
      ),
    },
    {
      q: S("Чи зобов'язує мене заявка?", "Обязывает ли меня заявка?", "Does a request commit me to anything?"),
      a: S(
        "Ні. Заявка — це лише запит. Усі деталі наш співробітник обговорить з вами особисто.",
        "Нет. Заявка — это лишь запрос. Все детали наш сотрудник обсудит с вами лично.",
        "No. A request is just a request. A colleague will talk the details through with you in person.",
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

      <p className="mb-5 max-w-3xl text-[0.9375rem] leading-relaxed text-secondary">
        {L(
          "Тепловізори, біноклі, приціли, далекоміри та підзорні труби топових європейських брендів — Swarovski Optik, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender — яких рідко знайдеш у наявності в Україні. А також менш відомих у нас європейських марок: Liemke, NOBLEX (Docter), Eschenbach, DDoptics, Vectronix, Hawke, Meopta, GPO. Привеземо під замовлення.",
          "Тепловизоры, бинокли, прицелы, дальномеры и подзорные трубы топовых европейских брендов — Swarovski Optik, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender — которых редко найдёшь в наличии в Украине. А также менее известных у нас европейских марок: Liemke, NOBLEX (Docter), Eschenbach, DDoptics, Vectronix, Hawke, Meopta, GPO. Привезём под заказ.",
          "Thermal imagers, binoculars, riflescopes, rangefinders and spotting scopes from top European brands — Swarovski Optik, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender — rarely in stock in Ukraine. And from European makers few here know: Liemke, NOBLEX (Docter), Eschenbach, DDoptics, Vectronix, Hawke, Meopta, GPO. We bring them in to order.",
        )}
      </p>

      <PremiumOrderForm locale={loc} />

      {/* Outside InfoPanel on purpose: its prose styles would put list
          bullets and margins on the model chips. */}
      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-primary">
          {L("Бренди та моделі", "Бренды и модели", "Brands and models")}
        </h2>
        <p className="mb-4 mt-2 text-sm leading-relaxed text-secondary">
          {L(
            "Натисніть на бренд, щоб побачити моделі, а потім на модель — вона з'явиться у формі вгорі.",
            "Нажмите на бренд, чтобы увидеть модели, а затем на модель — она появится в форме вверху.",
            "Tap a brand to see its models, then tap a model — it goes into the form at the top.",
          )}
        </p>
        <PremiumBrandGrid locale={loc} />
      </section>

      <InfoPanel className="mt-8">
        <p>
          {L("Не знаєте, що обрати? Читайте огляд ", "Не знаете, что выбрать? Читайте обзор ", "Not sure which to pick? Read our overview ")}
          <Link href="/blog/liuks-brendy-swarovski-zeiss-leica">
            {L(
              "«Біноклі Swarovski, ZEISS і Leica: як обрати люкс-оптику»",
              "«Бинокли Swarovski, ZEISS и Leica: что выбрать»",
              "“Swarovski, ZEISS and Leica binoculars: how to choose”",
            )}
          </Link>
          .
        </p>
        <p>
          {L("Шукаєте прилад у наявності? Дивіться ", "Ищете прибор в наличии? Смотрите ", "Looking for something in stock? See ")}
          <Link href="/catalog/teplovizori">{L("тепловізори", "тепловизоры", "thermal imagers")}</Link>,{" "}
          <Link href="/catalog/binokli">{L("тепловізійні біноклі", "тепловизионные бинокли", "thermal binoculars")}</Link>{" "}
          {L("та", "и", "and")}{" "}
          <Link href="/catalog/pricili">{L("тепловізійні приціли", "тепловизионные прицелы", "thermal sights")}</Link>
          {L(" у нашому каталозі.", " в нашем каталоге.", " in our catalogue.")}
        </p>

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
    </InfoPage>
  );
}
