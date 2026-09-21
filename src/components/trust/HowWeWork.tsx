import {
  BadgeCheck,
  Banknote,
  Headphones,
  RotateCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/routing";

type Locale = "uk" | "ru";

type Item = {
  icon: LucideIcon;
  title: Record<Locale, string>;
  text: Record<Locale, string>;
  href?: string;
};

/**
 * Store promises, each backed by an existing page: device check before
 * dispatch and selection help (/about), Nova Poshta + cash on delivery
 * (/delivery), 14-day returns (/returns), manufacturer warranty (/warranty).
 * Online card payment is deliberately absent — it isn't wired up yet.
 */
const ITEMS: Item[] = [
  {
    icon: ShieldCheck,
    title: { uk: "Перевіряємо кожен прилад", ru: "Проверяем каждый прибор" },
    text: {
      uk: "Тестуємо перед відправкою, щоб ви отримали справну техніку.",
      ru: "Тестируем перед отправкой, чтобы вы получили исправную технику.",
    },
    href: "/about",
  },
  {
    icon: Headphones,
    title: { uk: "Підбір під задачу", ru: "Подбор под задачу" },
    text: {
      uk: "Консультант допоможе обрати матрицю, об'єктив і бюджет — для полювання, охорони чи служби.",
      ru: "Консультант поможет выбрать матрицу, объектив и бюджет — для охоты, охраны или службы.",
    },
  },
  {
    icon: Truck,
    title: { uk: "Нова Пошта 1–2 дні", ru: "Новая Почта 1–2 дня" },
    text: {
      uk: "Доставка по всій Україні у відділення або поштомат.",
      ru: "Доставка по всей Украине в отделение или почтомат.",
    },
    href: "/delivery",
  },
  {
    icon: Banknote,
    title: { uk: "Оплата при отриманні", ru: "Оплата при получении" },
    text: {
      uk: "Накладений платіж: оплачуєте, коли забираєте посилку.",
      ru: "Наложенный платёж: оплачиваете, когда забираете посылку.",
    },
    href: "/delivery",
  },
  {
    icon: RotateCcw,
    title: { uk: "Повернення 14 днів", ru: "Возврат 14 дней" },
    text: {
      uk: "Прилад не підійшов — повернення або обмін за законом.",
      ru: "Прибор не подошёл — возврат или обмен по закону.",
    },
    href: "/returns",
  },
  {
    icon: BadgeCheck,
    title: { uk: "Гарантія виробника", ru: "Гарантия производителя" },
    text: {
      uk: "Заводський дефект — ремонт, заміна або повернення коштів.",
      ru: "Заводской дефект — ремонт, замена или возврат денег.",
    },
    href: "/warranty",
  },
];

/** Homepage section: six promises in a grid. */
export function HowWeWork({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <section className="py-12" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="container-shop">
        <h2 className="section-title mb-6">{ru ? "Как мы работаем" : "Як ми працюємо"}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ icon: Icon, title, text, href }) => {
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(225,29,42,0.14)] text-[var(--accent)]">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-primary">{title[locale]}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-secondary">
                    {text[locale]}
                  </span>
                </span>
              </>
            );
            const cls = "card-surface flex h-full items-start gap-3.5 p-4 sm:p-5";
            return (
              <li key={title.uk}>
                {href ? (
                  <Link href={href} className={`${cls} transition hover:border-[var(--accent)]/40`}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Product page: the same promises as a compact list under the buy button. */
export function HowWeWorkCompact({ locale }: { locale: Locale }) {
  // Selection help is the whole consult widget already; skip it here.
  const items = ITEMS.filter((i) => i.icon !== Headphones);
  return (
    <ul className="mt-6 grid gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-sm sm:grid-cols-2">
      {items.map(({ icon: Icon, title, href }) => {
        const label = (
          <>
            <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" strokeWidth={2} />
            <span>{title[locale]}</span>
          </>
        );
        return (
          <li key={title.uk}>
            {href ? (
              <Link
                href={href}
                className="flex items-center gap-2 text-secondary transition hover:text-primary"
              >
                {label}
              </Link>
            ) : (
              <span className="flex items-center gap-2 text-secondary">{label}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
