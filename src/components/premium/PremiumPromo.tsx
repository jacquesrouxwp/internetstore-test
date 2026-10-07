import { Gem } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/types";

/** Homepage card: premium European optics the catalogue does not stock, sourced to order. */
export function PremiumPromo({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  const en = locale === "en";
  return (
    <section className="pb-12">
      <div className="container-shop">
        <div className="hero-glass flex flex-col gap-5 rounded-[var(--radius-card)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(225,29,42,0.16)] text-[var(--accent)]">
              <Gem className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-primary sm:text-2xl">
                {ru
                  ? "Тепловизоры и люкс-оптика европейских брендов под заказ"
                  : en
                    ? "Thermal imagers and premium optics from top European brands, to order"
                    : "Тепловізори та люкс-оптика топових європейських брендів під замовлення"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
                {ru
                  ? "Swarovski, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender — бинокли, прицелы, дальномеры и тепловизоры, которых редко найдёшь в наличии. Напишите модель — наш сотрудник свяжется с вами."
                  : en
                    ? "Swarovski, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender — binoculars, riflescopes, rangefinders and thermal imagers that are rarely in stock. Name the model — a colleague will get back to you."
                    : "Swarovski, ZEISS, Leica, Steiner, Kahles, Schmidt & Bender — біноклі, приціли, далекоміри й тепловізори, яких рідко знайдеш у наявності. Напишіть модель — наш співробітник зв'яжеться з вами."}
              </p>
            </div>
          </div>
          <Link href="/premium-optyka" className="btn-hero btn-hero-primary shrink-0 self-start sm:self-center">
            {ru ? "Заказать" : en ? "Order" : "Замовити"}
          </Link>
        </div>
      </div>
    </section>
  );
}
