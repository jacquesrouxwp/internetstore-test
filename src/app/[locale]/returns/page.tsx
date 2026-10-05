import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import type { Locale } from "@/types";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { absoluteUrl } from "@/lib/site-url";
import { pageAlternates } from "@/lib/seo-alternates";
import {
  STORE_PHONE_DISPLAY,
  STORE_PHONE_TEL,
} from "@/lib/contact";
import { ConsultTrackLink } from "@/components/analytics/ConsultTrackLink";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "ru"
      ? "Возврат и обмен товара | Pro-Optics"
      : locale === "en"
        ? "Returns and exchange | Pro-Optics"
        : "Повернення та обмін товару | Pro-Optics";
  const description =
    locale === "ru"
      ? "Условия возврата и обмена в Pro-Optics: 14 дней для товара надлежащего качества, брак по гарантии, оформление через Новую Почту. Тел. 063 789 76 99."
      : locale === "en"
        ? "Returns and exchange at Pro-Optics: 14 days for products of proper quality, defects covered by the warranty, returns through Nova Poshta. Tel. 063 789 76 99."
        : "Умови повернення та обміну в Pro-Optics: 14 днів для товару належної якості, брак за гарантією, оформлення через Нову Пошту. Тел. 063 789 76 99.";
  const path =
    locale === "ru"
      ? "/ru/returns"
      : locale === "en"
        ? "/en/returns"
        : "/returns";
  return {
    // `absolute`: the title already ends in "| Pro-Optics"; the root template
    // would append it a second time.
    title: { absolute: title },
    description,
    alternates: pageAlternates(locale, "/returns"),
    openGraph: { title, description, url: absoluteUrl(path) },
  };
}

function PhoneLink({ source }: { source: "returns" }) {
  return (
    <ConsultTrackLink
      channel="phone"
      source={source}
      href={STORE_PHONE_TEL}
      className="font-semibold text-[var(--accent)] hover:underline"
    >
      {STORE_PHONE_DISPLAY}
    </ConsultTrackLink>
  );
}

export default async function ReturnsPage({ params }: Props) {
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

  return (
    <InfoPage
      title={
        ru
          ? "Возврат и обмен товара"
          : en
            ? "Returns and exchange"
            : "Повернення та обмін товару"
      }
    >
      <InfoPanel>
        <h2>
          {L(
            "Повернення товару належної якості",
            "Возврат товара надлежащего качества",
            "Returning a product of proper quality",
          )}
        </h2>

        <p>
          {L(
            <>
              Відповідно до Закону України «Про захист прав споживачів», ви
              маєте право повернути або обміняти товар належної якості протягом{" "}
              <strong>14 днів</strong> з моменту отримання (не рахуючи дня
              купівлі), якщо він вам не підійшов.
            </>,
            <>
              Согласно Закону Украины «О защите прав потребителей», вы имеете
              право вернуть или обменять товар надлежащего качества в течение{" "}
              <strong>14 дней</strong> с момента получения (не считая дня
              покупки), если он вам не подошёл.
            </>,
            <>
              Under the Law of Ukraine “On Consumer Rights Protection”, you have the right to return or exchange a product of proper quality within{" "}
              <strong>14 days</strong> of receiving it (not counting the day of purchase) if it does not suit you.
            </>,
          )}
        </p>

        <p>
          {L(
            "Повернення можливе за умови, що товар:",
            "Возврат возможен при условии, что товар:",
            "A return is possible provided that the product:",
          )}
        </p>

        <ul>
          <li>
            {L(
              "не був у використанні;",
              "не был в использовании;",
              "has not been used;",
            )}
          </li>
          <li>
            {L(
              "збережено його товарний вигляд, споживчі властивості, пломби та заводське маркування;",
              "сохранены товарный вид, потребительские свойства, пломбы и заводская маркировка;",
              "has kept its marketable appearance, consumer properties, seals and factory markings;",
            )}
          </li>
          <li>
            {L(
              "збережено повну комплектацію та упаковку;",
              "сохранена полная комплектация и упаковка;",
              "has its full set of contents and packaging intact;",
            )}
          </li>
          <li>
            {L(
              "наявний документ, що підтверджує покупку (чек, накладна).",
              "имеется документ, подтверждающий покупку (чек, накладная).",
              "comes with a document proving the purchase (receipt, invoice).",
            )}
          </li>
        </ul>

        <h2>
          {L(
            "Обмін товару",
            "Обмен товара",
            "Exchanging a product",
          )}
        </h2>

        <p>
          {L(
            "Ви можете обміняти товар належної якості на аналогічний або інший протягом 14 днів за тих самих умов. Якщо на момент звернення потрібного товару немає в наявності — ви можете повернути кошти або дочекатися надходження.",
            "Вы можете обменять товар надлежащего качества на аналогичный или другой в течение 14 дней на тех же условиях. Если на момент обращения нужного товара нет в наличии — вы можете вернуть средства или дождаться поступления.",
            "You can exchange a product of proper quality for a similar or a different one within 14 days on the same terms. If the product you need is out of stock when you contact us, you can take a refund or wait for it to arrive.",
          )}
        </p>

        <h2>
          {L(
            "Повернення товару неналежної якості (брак)",
            "Возврат товара ненадлежащего качества (брак)",
            "Returning a product of improper quality (defect)",
          )}
        </h2>

        <p>
          {L(
            "Якщо ви виявили заводський дефект, звертайтеся до нас протягом гарантійного строку. Залежно від випадку ми забезпечимо ремонт, заміну товару або повернення коштів згідно з чинним законодавством та умовами гарантії виробника.",
            "Если вы обнаружили заводской дефект, обращайтесь к нам в течение гарантийного срока. В зависимости от случая мы обеспечим ремонт, замену товара или возврат средств согласно действующему законодательству и условиям гарантии производителя.",
            "If you find a factory defect, contact us within the warranty period. Depending on the case, we will arrange a repair, a replacement or a refund in line with current legislation and the manufacturer's warranty terms.",
          )}
        </p>

        <h2>
          {L(
            "Як оформити повернення",
            "Как оформить возврат",
            "How to arrange a return",
          )}
        </h2>

        <ol>
          <li>
            {L(
              <>
                Зв&apos;яжіться з нами за телефоном{" "}
                <PhoneLink source="returns" /> або в месенджерах.
              </>,
              <>
                Свяжитесь с нами по телефону <PhoneLink source="returns" />{" "}
                или в мессенджерах.
              </>,
              <>
                Contact us by phone <PhoneLink source="returns" />{" "}
                or through messaging apps.
              </>,
            )}
          </li>
          <li>
            {L(
              "Узгодьте повернення та отримайте інструкції.",
              "Согласуйте возврат и получите инструкции.",
              "Agree the return with us and get instructions.",
            )}
          </li>
          <li>
            {L(
              "Надішліть товар Новою Поштою на нашу адресу.",
              "Отправьте товар Новой Почтой на наш адрес.",
              "Send the product to our address by Nova Poshta.",
            )}
          </li>
          <li>
            {L(
              <>
                Після перевірки ми повертаємо кошти протягом{" "}
                <strong>7 робочих днів</strong> тим самим способом, яким була
                здійснена оплата.
              </>,
              <>
                После проверки мы возвращаем средства в течение{" "}
                <strong>7 рабочих дней</strong> тем же способом, которым была
                произведена оплата.
              </>,
              <>
                After inspection we refund the money within{" "}
                <strong>7 working days</strong>, by the same method that was used to pay.
              </>,
            )}
          </li>
        </ol>

        <h2>
          {L(
            "Що не підлягає поверненню",
            "Что не подлежит возврату",
            "What cannot be returned",
          )}
        </h2>

        <p>
          {L(
            "Не підлягають поверненню товари, що були у використанні, з порушеною комплектацією, пошкодженою упаковкою чи маркуванням, а також товари з переліку, затвердженого законодавством України.",
            "Не подлежат возврату товары, которые были в использовании, с нарушенной комплектацией, повреждённой упаковкой или маркировкой, а также товары из перечня, утверждённого законодательством Украины.",
            "Products that have been used, that are incomplete, or that have damaged packaging or markings cannot be returned, nor can products on the list set by Ukrainian legislation.",
          )}
        </p>

        <p>
          {L(
            <>
              Із питань повернення та обміну звертайтеся:{" "}
              <PhoneLink source="returns" />.
            </>,
            <>
              По вопросам возврата и обмена обращайтесь:{" "}
              <PhoneLink source="returns" />.
            </>,
            <>
              For questions about returns and exchanges, please contact us:{" "}
              <PhoneLink source="returns" />.
            </>,
          )}
        </p>
      </InfoPanel>
    </InfoPage>
  );
}
