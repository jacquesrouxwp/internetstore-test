import type { PriceCompareSummary } from "@/lib/price-compare/types";
import { MIN_SAVINGS_UAH } from "@/lib/price-compare/types";
import { formatPrice } from "@/lib/utils";

export function PriceCompareSection({
  compare,
  locale,
}: {
  compare?: PriceCompareSummary | null;
  locale: string;
}) {
  if (!compare?.lines?.length) return null;

  const isRu = locale === "ru";
  const hasSaving = compare.bestSavingUah >= MIN_SAVINGS_UAH;

  return (
    <section
      className="mt-6 rounded-[var(--radius-card)] p-5"
      style={{
        background: "rgba(22, 24, 29, 0.85)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
        {isRu ? "Цена на рынке" : "Ціна на ринку"}
      </h2>
      {hasSaving && (
        <p className="mt-2 text-sm font-semibold text-emerald-300">
          {isRu
            ? `На ${formatPrice(compare.bestSavingUah, locale)} дешевле, чем у ${compare.bestCompetitorName}`
            : `На ${formatPrice(compare.bestSavingUah, locale)} дешевше, ніж у ${compare.bestCompetitorName}`}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-muted-ui">
              <th className="py-2 pr-3 font-medium">
                {isRu ? "Магазин" : "Магазин"}
              </th>
              <th className="py-2 pr-3 font-medium">
                {isRu ? "Цена" : "Ціна"}
              </th>
              <th className="py-2 font-medium">
                {isRu ? "Разница" : "Різниця"}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="py-2.5 pr-3 font-semibold text-primary">
                Pro-Optics
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-primary">
                {formatPrice(compare.ourPrice, locale)}
              </td>
              <td className="py-2.5 text-secondary">—</td>
            </tr>
            {compare.lines.map((l) => (
              <tr key={l.competitorId} className="border-b border-white/5">
                <td className="py-2.5 pr-3 text-secondary">
                  {l.url ? (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary hover:underline"
                    >
                      {l.competitorName}
                    </a>
                  ) : (
                    l.competitorName
                  )}
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-secondary">
                  {formatPrice(l.competitorPrice, locale)}
                </td>
                <td
                  className={`py-2.5 tabular-nums ${
                    l.savingUah > 0
                      ? "text-emerald-400"
                      : l.savingUah < 0
                        ? "text-amber-400"
                        : "text-secondary"
                  }`}
                >
                  {l.savingUah > 0
                    ? `−${formatPrice(l.savingUah, locale)}`
                    : l.savingUah < 0
                      ? `+${formatPrice(-l.savingUah, locale)}`
                      : "≈"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-faint">
        {isRu
          ? "Сравнение справочное. Цены конкурентов на дату проверки; комплектация и условия могут отличаться."
          : "Порівняння довідкове. Ціни конкурентів на дату перевірки; комплектація та умови можуть відрізнятися."}
        {compare.checkedAt
          ? ` ${isRu ? "Данные на" : "Дані на"} ${new Date(
              compare.checkedAt
            ).toLocaleDateString(isRu ? "ru-UA" : "uk-UA")}.`
          : ""}
      </p>
    </section>
  );
}
