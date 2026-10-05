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
        ? "Политика конфиденциальности"
        : locale === "en"
          ? "Privacy policy"
          : "Політика конфіденційності",
    description:
      locale === "ru"
        ? "Какие персональные данные собирает интернет-магазин Pro-Optics, зачем, кому передаёт и как их удалить."
        : locale === "en"
          ? "Privacy policy: what personal data the Pro-Optics online shop collects, why, who receives it and how to have it deleted, under Ukrainian data protection law."
          : "Які персональні дані збирає інтернет-магазин Pro-Optics, навіщо, кому передає і як їх видалити.",
    alternates: pageAlternates(locale, "/privacy"),
  };
}

/**
 * Describes what the site actually does with data: orders are stored in our
 * database and announced to managers in Telegram, delivery data goes to Nova
 * Poshta, card data stays with the payment provider, the cart lives in
 * localStorage, page views go to cookieless Vercel Web Analytics, and no ad
 * trackers are loaded. Update this page if any of that changes (e.g. the GA /
 * Meta pixel env vars get set).
 */
export default async function PrivacyPage({ params }: Props) {
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
          ? "Политика конфиденциальности"
          : en
            ? "Privacy policy"
            : "Політика конфіденційності"
      }
    >
      <InfoPanel>
        <p className="text-sm text-muted-ui">{legalUpdatedLabel(loc)}</p>

        <h2>{L("1. Хто обробляє ваші дані", "1. Кто обрабатывает ваши данные", "1. Who processes your data")}</h2>
        <p>
          {L(
            `Ця політика пояснює, як інтернет-магазин ${SELLER.brand} (${SELLER.site}) збирає, використовує та захищає персональні дані відповідно до Закону України «Про захист персональних даних».`,
            `Эта политика объясняет, как интернет-магазин ${SELLER.brand} (${SELLER.site}) собирает, использует и защищает персональные данные в соответствии с Законом Украины «О защите персональных данных».`,
            `This policy explains how the online shop ${SELLER.brand} (${SELLER.site}) collects, uses and protects personal data in accordance with the Law of Ukraine “On Personal Data Protection”.`
          )}
        </p>
        <SellerDetails locale={loc} />

        <h2>{L("2. Які дані ми збираємо", "2. Какие данные мы собираем", "2. What data we collect")}</h2>
        <ul>
          <li>
            {L(
              "Під час оформлення замовлення: ім'я, номер телефону, місто та відділення Нової Пошти, склад замовлення, а також email і коментар, якщо ви їх вказали.",
              "При оформлении заказа: имя, номер телефона, город и отделение Новой Почты, состав заказа, а также email и комментарий, если вы их указали.",
              "When you place an order: name, phone number, city and Nova Poshta branch, the contents of the order, and an email address and a comment if you provided them."
            )}
          </li>
          <li>
            {L(
              "Коли ви звертаєтеся до нас телефоном чи в месенджерах: дані, які ви самі повідомляєте, — ім'я, номер телефону, суть запиту.",
              "Когда вы обращаетесь к нам по телефону или в мессенджерах: данные, которые вы сами сообщаете, — имя, номер телефона, суть запроса.",
              "When you contact us by phone or in messaging apps: the data you share yourself — name, phone number, the nature of your enquiry."
            )}
          </li>
          <li>
            {L(
              "Технічні дані: IP-адреса, тип браузера та відвідані сторінки — у журналах сервера для безпеки сайту й захисту від зловживань; знеособлена статистика відвідувань (Vercel Web Analytics, без cookie) і натискань на кнопки консультації.",
              "Технические данные: IP-адрес, тип браузера и посещённые страницы — в журналах сервера для безопасности сайта и защиты от злоупотреблений; обезличенная статистика посещений (Vercel Web Analytics, без cookie) и нажатий на кнопки консультации.",
              "Technical data: IP address, browser type and pages visited — in server logs, for the security of the site and protection against abuse; anonymised visit statistics (Vercel Web Analytics, no cookies) and clicks on the consultation buttons."
            )}
          </li>
        </ul>
        <p>
          {L(
            "Дані банківської картки ми не отримуємо і не зберігаємо: під час онлайн-оплати їх вводять на сторінці платіжного сервісу.",
            "Данные банковской карты мы не получаем и не храним: при онлайн-оплате их вводят на странице платёжного сервиса.",
            "We do not receive or store bank card details: when you pay online, you enter them on the page of the payment service."
          )}
        </p>

        <h2>{L("3. Навіщо ми їх використовуємо", "3. Зачем мы их используем", "3. Why we use your data")}</h2>
        <ul>
          <li>{L("оформити, підтвердити та доставити замовлення;", "оформить, подтвердить и доставить заказ;", "to place, confirm and deliver the order;")}</li>
          <li>{L("зв'язатися з вами щодо замовлення, повернення або гарантії;", "связаться с вами по заказу, возврату или гарантии;", "to contact you about an order, a return or the warranty;")}</li>
          <li>{L("виконати вимоги законодавства щодо обліку продажів;", "выполнить требования законодательства по учёту продаж;", "to comply with legal requirements on sales accounting;")}</li>
          <li>{L("забезпечити безпеку та стабільну роботу сайту.", "обеспечить безопасность и стабильную работу сайта.", "to keep the site secure and running reliably.")}</li>
        </ul>
        <p>
          {L(
            "Ми не надсилаємо рекламних розсилок без вашої окремої згоди і не продаємо персональні дані третім особам.",
            "Мы не отправляем рекламные рассылки без вашего отдельного согласия и не продаём персональные данные третьим лицам.",
            "We do not send advertising mailings without your separate consent and do not sell personal data to third parties."
          )}
        </p>

        <h2>{L("4. Кому ми передаємо дані", "4. Кому мы передаём данные", "4. Who we share data with")}</h2>
        <p>{L("Лише в обсязі, потрібному для виконання замовлення:", "Только в объёме, необходимом для выполнения заказа:", "Only to the extent needed to fulfil the order:")}</p>
        <ul>
          <li>
            {L(
              "Новій Пошті — ім'я, телефон і відділення для доставки;",
              "Новой Почте — имя, телефон и отделение для доставки;",
              "Nova Poshta — name, phone number and branch for delivery;"
            )}
          </li>
          <li>
            {L(
              "платіжним сервісам — дані замовлення для онлайн-оплати, якщо ви її обрали;",
              "платёжным сервисам — данные заказа для онлайн-оплаты, если вы её выбрали;",
              "payment services — order data for online payment, if you chose it;"
            )}
          </li>
          <li>
            {L(
              "технічним сервісам, на яких працює сайт: хостингу, базі даних, де зберігаються замовлення, та Telegram, через який менеджери отримують сповіщення про нові замовлення.",
              "техническим сервисам, на которых работает сайт: хостингу, базе данных, где хранятся заказы, и Telegram, через который менеджеры получают уведомления о новых заказах.",
              "the technical services the site runs on: hosting, the database where orders are stored, and Telegram, through which managers receive notifications about new orders."
            )}
          </li>
        </ul>
        <p>
          {L(
            "Також дані можуть бути надані державним органам, якщо цього вимагає закон.",
            "Также данные могут быть предоставлены государственным органам, если этого требует закон.",
            "Data may also be provided to government bodies if the law requires it."
          )}
        </p>

        <h2>{L("5. Cookie та дані в браузері", "5. Cookie и данные в браузере", "5. Cookies and data in the browser")}</h2>
        <p>
          {L(
            "Кошик і налаштування сайту (наприклад, мова та вигляд каталогу) зберігаються у вашому браузері, щоб вони не зникали між візитами. Рекламні трекери сторонніх компаній на сайті зараз не використовуються; якщо це зміниться, ми оновимо цю сторінку. Очистити збережені дані можна в налаштуваннях браузера.",
            "Корзина и настройки сайта (например, язык и вид каталога) хранятся в вашем браузере, чтобы они не пропадали между визитами. Рекламные трекеры сторонних компаний на сайте сейчас не используются; если это изменится, мы обновим эту страницу. Очистить сохранённые данные можно в настройках браузера.",
            "The cart and site settings (for example, language and catalogue view) are stored in your browser so that they do not disappear between visits. Third-party advertising trackers are not currently used on the site; if that changes, we will update this page. You can clear the stored data in your browser settings."
          )}
        </p>

        <h2>{L("6. Скільки ми зберігаємо дані", "6. Сколько мы храним данные", "6. How long we keep data")}</h2>
        <p>
          {L(
            "Дані замовлень зберігаються стільки, скільки потрібно для виконання замовлення, гарантійних зобов'язань і вимог законодавства щодо обліку, після чого видаляються або знеособлюються.",
            "Данные заказов хранятся столько, сколько нужно для выполнения заказа, гарантийных обязательств и требований законодательства по учёту, после чего удаляются или обезличиваются.",
            "Order data is kept for as long as needed to fulfil the order, warranty obligations and accounting requirements of the law, after which it is deleted or anonymised."
          )}
        </p>

        <h2>{L("7. Ваші права", "7. Ваши права", "7. Your rights")}</h2>
        <p>
          {L(
            "Відповідно до статті 8 Закону України «Про захист персональних даних» ви можете дізнатися, які дані про вас ми зберігаємо, вимагати їх виправлення чи видалення, відкликати згоду на обробку та звернутися зі скаргою до Уповноваженого Верховної Ради України з прав людини.",
            "В соответствии со статьёй 8 Закона Украины «О защите персональных данных» вы можете узнать, какие данные о вас мы храним, потребовать их исправления или удаления, отозвать согласие на обработку и обратиться с жалобой к Уполномоченному Верховной Рады Украины по правам человека.",
            "In accordance with Article 8 of the Law of Ukraine “On Personal Data Protection”, you can find out what data about you we hold, demand that it be corrected or deleted, withdraw your consent to processing and lodge a complaint with the Ukrainian Parliament Commissioner for Human Rights."
          )}
        </p>
        <p>
          {L("Щоб скористатися цими правами, зателефонуйте нам:", "Чтобы воспользоваться этими правами, позвоните нам:", "To exercise these rights, call us:")}{" "}
          <a href={STORE_PHONE_TEL}>{STORE_PHONE_DISPLAY}</a>.
        </p>

        <h2>{L("8. Захист даних", "8. Защита данных", "8. Data protection")}</h2>
        <p>
          {L(
            "Сайт працює через захищене з'єднання HTTPS, доступ до даних замовлень мають лише працівники, яким він потрібен для роботи.",
            "Сайт работает через защищённое соединение HTTPS, доступ к данным заказов есть только у сотрудников, которым он нужен для работы.",
            "The site runs over a secure HTTPS connection; access to order data is limited to employees who need it for their work."
          )}
        </p>

        <h2>{L("9. Зміни політики", "9. Изменения политики", "9. Changes to this policy")}</h2>
        <p>
          {L(
            <>
              Ми можемо оновлювати цю політику; чинна редакція завжди опублікована на цій
              сторінці. Умови купівлі описано в{" "}
              <Link href="/oferta">Публічній оферті</Link>.
            </>,
            <>
              Мы можем обновлять эту политику; действующая редакция всегда опубликована на этой
              странице. Условия покупки описаны в <Link href="/oferta">Публичной оферте</Link>.
            </>,
            <>
              We may update this policy; the current version is always published on this
              page. The terms of purchase are described in the{" "}
              <Link href="/oferta">Public Offer</Link>.
            </>
          )}
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
