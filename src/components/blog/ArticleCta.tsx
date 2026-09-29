import { ShieldCheck, Truck, Repeat, Wallet } from "lucide-react";
import { Link } from "@/i18n/routing";
import { articleCatalogLinks } from "@/lib/article-cta";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";
import type { Locale } from "@/types";

/**
 * Closing block of a blog post: where to buy what the article just explained,
 * on what terms. Links are derived from the article itself — see lib/article-cta.
 */
export function ArticleCta({
  bodyHtml,
  locale,
}: {
  bodyHtml: string;
  locale: Locale;
}) {
  const ru = locale === "ru";
  const links = articleCatalogLinks(bodyHtml, locale);

  const terms = [
    {
      icon: Truck,
      text: ru
        ? "Доставка Новой Почтой по всей Украине, 1–2 дня"
        : "Доставка Новою Поштою по всій Україні, 1–2 дні",
    },
    {
      icon: Wallet,
      text: ru ? "Оплата при получении" : "Оплата при отриманні",
    },
    {
      icon: ShieldCheck,
      text: ru
        ? "Проверяем каждый прибор перед отправкой, гарантия"
        : "Перевіряємо кожен прилад перед відправкою, гарантія",
    },
    {
      icon: Repeat,
      text: ru
        ? "Выкуп и трейд-ин бывших в употреблении приборов"
        : "Викуп і трейд-ін вживаних приладів",
    },
  ];

  const chip =
    "rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-primary transition hover:border-[var(--accent)] hover:text-[var(--accent)]";

  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-white/10 bg-white/[0.02] px-6 py-7 sm:px-8">
      <h2 className="font-display text-lg font-bold text-primary">
        {ru ? "Подобрать прибор" : "Підібрати прилад"}
      </h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={chip}>
            {l.label}
          </Link>
        ))}
        <Link href="/simulator" className={chip}>
          {ru ? "Симулятор тепловизора" : "Симулятор тепловізора"}
        </Link>
      </div>

      <ul className="mt-5 grid gap-2 text-sm text-secondary sm:grid-cols-2">
        {terms.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2">
            <Icon
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]"
              strokeWidth={2}
            />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-sm leading-relaxed text-secondary">
        {ru
          ? "Не уверены, что подойдёт? Звоните "
          : "Не впевнені, що підійде? Телефонуйте "}
        <a
          href={STORE_PHONE_TEL}
          className="font-semibold text-[var(--accent)] hover:underline"
        >
          {STORE_PHONE_DISPLAY}
        </a>
        {ru
          ? " — подскажем по задаче и бюджету. Есть "
          : " — підкажемо за задачею та бюджетом. Є "}
        <Link href="/viyskovym" className="text-[var(--accent)] hover:underline">
          {ru ? "условия для военных" : "умови для військових"}
        </Link>
        {ru ? " и " : " та "}
        <Link href="/vykup" className="text-[var(--accent)] hover:underline">
          {ru ? "выкуп вашего прибора" : "викуп вашого приладу"}
        </Link>
        .
      </p>
    </section>
  );
}
