import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/types";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import { InfoPage, InfoPanel } from "@/components/layout/InfoPage";
import { SellerDetails } from "@/components/legal/SellerDetails";
import { pageAlternates } from "@/lib/seo-alternates";
import { legalUpdatedLabel, SELLER } from "@/lib/legal";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "ru"
        ? "Публичная оферта и условия покупки"
        : locale === "en"
          ? "Public offer and terms of purchase"
          : "Публічна оферта та умови купівлі",
    description:
      locale === "ru"
        ? "Условия покупки в интернет-магазине Pro-Optics: оформление заказа, цены и оплата, доставка Новой Почтой, возврат 14 дней, гарантия."
        : locale === "en"
          ? "Terms of purchase at the Pro-Optics online shop: placing an order, prices and payment, Nova Poshta delivery, 14-day returns and the manufacturer's warranty."
          : "Умови купівлі в інтернет-магазині Pro-Optics: оформлення замовлення, ціни та оплата, доставка Новою Поштою, повернення 14 днів, гарантія.",
    alternates: pageAlternates(locale, "/oferta"),
  };
}

export default async function OfertaPage({ params }: Props) {
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
          ? "Публичная оферта и условия покупки"
          : en
            ? "Public offer and terms of purchase"
            : "Публічна оферта та умови купівлі"
      }
    >
      <InfoPanel>
        <p className="text-sm text-muted-ui">{legalUpdatedLabel(loc)}</p>

        <h2>{L("1. Загальні положення", "1. Общие положения", "1. General provisions")}</h2>
        <p>
          {L(
            <>
              Цей документ є публічною пропозицією (офертою) інтернет-магазину {SELLER.brand} на
              сайті {SELLER.site} (далі — Продавець) укласти договір купівлі-продажу товарів
              відповідно до статей 633, 641 і 642 Цивільного кодексу України та Закону України
              «Про електронну комерцію».
            </>,
            <>
              Этот документ является публичным предложением (офертой) интернет-магазина{" "}
              {SELLER.brand} на сайте {SELLER.site} (далее — Продавец) заключить договор
              купли-продажи товаров в соответствии со статьями 633, 641 и 642 Гражданского
              кодекса Украины и Закона Украины «Об электронной коммерции».
            </>,
            <>
              This document is a public offer of the online shop {SELLER.brand} on the website{" "}
              {SELLER.site} (hereinafter — the Seller) to enter into a contract of sale of goods
              in accordance with Articles 633, 641 and 642 of the Civil Code of Ukraine and the Law
              of Ukraine “On Electronic Commerce”.
            </>
          )}
        </p>
        <p>
          {L(
            "Оформлюючи замовлення на сайті, покупець підтверджує, що ознайомився з цими умовами та приймає їх. Договір вважається укладеним з моменту підтвердження замовлення Продавцем.",
            "Оформляя заказ на сайте, покупатель подтверждает, что ознакомился с этими условиями и принимает их. Договор считается заключённым с момента подтверждения заказа Продавцом.",
            "By placing an order on the website, the Buyer confirms that they have read these terms and accept them. The contract is deemed concluded when the Seller confirms the order."
          )}
        </p>
        <SellerDetails locale={loc} />

        <h2>{L("2. Товари та інформація про них", "2. Товары и информация о них", "2. Products and information about them")}</h2>
        <p>
          {L(
            "Продавець пропонує тепловізори, тепловізійні приціли, прилади нічного бачення, біноклі, аксесуари та іншу оптику — нові та вживані (Б/У). Стан товару вказано в його назві або описі.",
            "Продавец предлагает тепловизоры, тепловизионные прицелы, приборы ночного видения, бинокли, аксессуары и другую оптику — новые и б/у. Состояние товара указано в его названии или описании.",
            "The Seller offers thermal imagers, thermal sights, night vision devices, binoculars, accessories and other optics — both new and used. The condition of a product is stated in its name or description."
          )}
        </p>
        <p>
          {L(
            "Характеристики товарів наведено за даними виробників. Виробник може змінювати комплектацію, зовнішній вигляд і характеристики без попередження, тому фото на сайті можуть відрізнятися від товару. Перед купівлею ви можете уточнити деталі в консультанта. Симулятор тепловізора на сайті має ілюстративний характер і не є точним відтворенням зображення конкретного приладу.",
            "Характеристики товаров приведены по данным производителей. Производитель может менять комплектацию, внешний вид и характеристики без предупреждения, поэтому фото на сайте могут отличаться от товара. Перед покупкой вы можете уточнить детали у консультанта. Симулятор тепловизора на сайте носит иллюстративный характер и не является точным воспроизведением изображения конкретного прибора.",
            "Product specifications are given according to the manufacturers' data. A manufacturer may change the contents of the set, the appearance and the specifications without notice, so photos on the website may differ from the product. Before buying, you can clarify the details with a consultant. The thermal imager simulator on the website is illustrative and is not an exact reproduction of the image of a specific device."
          )}
        </p>

        <h2>{L("3. Оформлення замовлення", "3. Оформление заказа", "3. Placing an order")}</h2>
        <p>
          {L(
            "Замовлення оформлюється через кошик на сайті. Покупець вказує ім'я, телефон, місто та відділення Нової Пошти, за бажанням — email і коментар. Після оформлення консультант може зателефонувати, щоб підтвердити замовлення, наявність і терміни.",
            "Заказ оформляется через корзину на сайте. Покупатель указывает имя, телефон, город и отделение Новой Почты, по желанию — email и комментарий. После оформления консультант может позвонить, чтобы подтвердить заказ, наличие и сроки.",
            "An order is placed through the cart on the website. The Buyer provides a name, phone number, city and Nova Poshta branch and, optionally, an email address and a comment. After the order is placed, a consultant may call to confirm the order, availability and timing."
          )}
        </p>
        <p>
          {L(
            "Якщо товару немає в наявності, Продавець повідомляє покупця та пропонує аналог або скасування замовлення. Якщо замовлення вже оплачене, кошти повертаються в повному обсязі.",
            "Если товара нет в наличии, Продавец сообщает об этом покупателю и предлагает аналог или отмену заказа. Если заказ уже оплачен, деньги возвращаются в полном объёме.",
            "If a product is out of stock, the Seller informs the Buyer and offers an equivalent product or cancellation of the order. If the order has already been paid for, the money is refunded in full."
          )}
        </p>

        <h2>{L("4. Ціни та оплата", "4. Цены и оплата", "4. Prices and payment")}</h2>
        <p>
          {L(
            "Ціни на сайті вказано в гривнях. Ціна фіксується на момент підтвердження замовлення і надалі не змінюється.",
            "Цены на сайте указаны в гривнах. Цена фиксируется на момент подтверждения заказа и в дальнейшем не меняется.",
            "Prices on the website are given in hryvnias. The price is fixed at the moment the order is confirmed and does not change afterwards."
          )}
        </p>
        <p>
          {L(
            <>
              Оплатити замовлення можна при отриманні (накладений платіж) або онлайн — способи
              оплати, доступні при оформленні, наведено на сторінці{" "}
              <Link href="/delivery">«Доставка і оплата»</Link>. Дані банківської картки
              вводяться на стороні платіжного сервісу, Продавець їх не отримує і не зберігає.
            </>,
            <>
              Оплатить заказ можно при получении (наложенный платёж) или онлайн — способы оплаты,
              доступные при оформлении, приведены на странице{" "}
              <Link href="/delivery">«Доставка и оплата»</Link>. Данные банковской карты вводятся
              на стороне платёжного сервиса, Продавец их не получает и не хранит.
            </>,
            <>
              You can pay for an order on receipt (cash on delivery) or online — the payment methods available
              at checkout are listed on the{" "}
              <Link href="/delivery">“Delivery and payment”</Link> page. Bank card details are entered
              on the side of the payment service; the Seller does not receive or store them.
            </>
          )}
        </p>
        <p>
          {L(
            <>
              Для військовослужбовців діють спеціальні умови — за підтвердженням статусу до
              оформлення замовлення. Детальніше — на сторінці{" "}
              <Link href="/viyskovym">«Умови для військових»</Link>.
            </>,
            <>
              Для военнослужащих действуют специальные условия — при подтверждении статуса до
              оформления заказа. Подробнее — на странице{" "}
              <Link href="/viyskovym">«Условия для военных»</Link>.
            </>,
            <>
              Special terms apply to military personnel — subject to confirmation of status before the order
              is placed. More details are on the{" "}
              <Link href="/viyskovym">“Terms for the military”</Link> page.
            </>
          )}
        </p>

        <h2>{L("5. Доставка", "5. Доставка", "5. Delivery")}</h2>
        <p>
          {L(
            <>
              Товари доставляються Новою Поштою по всій Україні — у відділення або поштомат.
              Вартість, орієнтовні терміни та умови безкоштовної доставки наведено на сторінці{" "}
              <Link href="/delivery">«Доставка і оплата»</Link>. Під час отримання радимо
              оглянути посилку та перевірити комплектність у відділенні.
            </>,
            <>
              Товары доставляются Новой Почтой по всей Украине — в отделение или почтомат.
              Стоимость, ориентировочные сроки и условия бесплатной доставки приведены на странице{" "}
              <Link href="/delivery">«Доставка и оплата»</Link>. При получении рекомендуем
              осмотреть посылку и проверить комплектность в отделении.
            </>,
            <>
              Goods are delivered by Nova Poshta across Ukraine — to a branch or a parcel locker.
              The cost, estimated delivery times and the terms of free delivery are listed on the{" "}
              <Link href="/delivery">“Delivery and payment”</Link> page. When you receive the parcel, we recommend
              inspecting it and checking that the contents are complete at the branch.
            </>
          )}
        </p>

        <h2>{L("6. Повернення та обмін", "6. Возврат и обмен", "6. Returns and exchange")}</h2>
        <p>
          {L(
            <>
              Відповідно до Закону України «Про захист прав споживачів» товар належної якості
              можна повернути або обміняти протягом 14 днів з моменту отримання, якщо він не був
              у використанні та збережено його товарний вигляд, комплектацію й упаковку. Кошти
              повертаються протягом 7 робочих днів після перевірки товару тим самим способом,
              яким було здійснено оплату. Порядок оформлення — на сторінці{" "}
              <Link href="/returns">«Повернення та обмін»</Link>.
            </>,
            <>
              В соответствии с Законом Украины «О защите прав потребителей» товар надлежащего
              качества можно вернуть или обменять в течение 14 дней с момента получения, если он
              не был в использовании и сохранены его товарный вид, комплектация и упаковка.
              Деньги возвращаются в течение 7 рабочих дней после проверки товара тем же способом,
              которым была произведена оплата. Порядок оформления — на странице{" "}
              <Link href="/returns">«Возврат и обмен»</Link>.
            </>,
            <>
              In accordance with the Law of Ukraine “On Consumer Rights Protection”, a product of proper quality
              can be returned or exchanged within 14 days of receipt, provided that it has not been used
              and that its marketable appearance, contents and packaging have been preserved. The money is
              refunded within 7 working days after the product is checked, by the same method that was
              used for the payment. The procedure is described on the{" "}
              <Link href="/returns">“Returns and exchange”</Link> page.
            </>
          )}
        </p>

        <h2>{L("7. Гарантія", "7. Гарантия", "7. Warranty")}</h2>
        <p>
          {L(
            <>
              На товари діє гарантія виробника. У разі виявлення заводського дефекту протягом
              гарантійного строку Продавець забезпечує ремонт, заміну товару або повернення
              коштів згідно із законодавством та умовами гарантії. Детальніше — на сторінці{" "}
              <Link href="/warranty">«Сервіс і гарантія»</Link>.
            </>,
            <>
              На товары действует гарантия производителя. При обнаружении заводского дефекта в
              течение гарантийного срока Продавец обеспечивает ремонт, замену товара или возврат
              денег в соответствии с законодательством и условиями гарантии. Подробнее — на
              странице <Link href="/warranty">«Сервис и гарантия»</Link>.
            </>,
            <>
              Products come with the manufacturer&apos;s warranty. If a factory defect is found within the
              warranty period, the Seller arranges a repair, a replacement of the product or a refund
              in accordance with the legislation and the warranty terms. More details are on the{" "}
              <Link href="/warranty">“Service and warranty”</Link> page.
            </>
          )}
        </p>

        <h2>{L("8. Відповідальність і спори", "8. Ответственность и споры", "8. Liability and disputes")}</h2>
        <p>
          {L(
            "Покупець відповідає за законне використання придбаних товарів. Спори вирішуються шляхом переговорів, а якщо згоди не досягнуто — відповідно до законодавства України.",
            "Покупатель отвечает за законное использование приобретённых товаров. Споры решаются путём переговоров, а если согласие не достигнуто — в соответствии с законодательством Украины.",
            "The Buyer is responsible for the lawful use of the goods purchased. Disputes are resolved through negotiation and, if no agreement is reached, in accordance with the legislation of Ukraine."
          )}
        </p>

        <h2>{L("9. Персональні дані", "9. Персональные данные", "9. Personal data")}</h2>
        <p>
          {L(
            <>
              Порядок обробки персональних даних описано в{" "}
              <Link href="/privacy">Політиці конфіденційності</Link>.
            </>,
            <>
              Порядок обработки персональных данных описан в{" "}
              <Link href="/privacy">Политике конфиденциальности</Link>.
            </>,
            <>
              The procedure for processing personal data is described in the{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </>
          )}
        </p>

        <h2>{L("10. Контакти", "10. Контакты", "10. Contacts")}</h2>
        <p>
          {L("З усіх питань телефонуйте:", "По всем вопросам звоните:", "For any questions, call:")}{" "}
          <a href={STORE_PHONE_TEL}>{STORE_PHONE_DISPLAY}</a>.{" "}
          {L("Продавець може оновлювати ці умови; чинна редакція завжди опублікована на цій сторінці. Замовлення, підтверджені раніше, виконуються на умовах, що діяли на момент підтвердження.",
            "Продавец может обновлять эти условия; действующая редакция всегда опубликована на этой странице. Заказы, подтверждённые ранее, выполняются на условиях, действовавших на момент подтверждения.", "The Seller may update these terms; the current version is always published on this page. Orders confirmed earlier are fulfilled on the terms that applied at the time of confirmation.")}
        </p>
        {en && (
          <p className="text-sm text-muted-ui">
            This English text is provided for convenience only. The Ukrainian version of this
            document is the legally binding one; in case of any discrepancy, the Ukrainian text
            prevails.
          </p>
        )}
      </InfoPanel>
    </InfoPage>
  );
}
