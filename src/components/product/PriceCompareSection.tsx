import type { PriceCompareSummary } from "@/lib/price-compare/types";
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
  const saving = compare.bestSavingUah;
  const cheaper = saving >= 100;
  const expensive = saving <= -100;

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

      {cheaper && (
        <p className="mt-2 font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-emerald-300 sm:text-base">
          {isRu ? (
            <>
              На{" "}
              <span className="tabular-nums">
                {formatPrice(saving, locale)}
              </span>{" "}
              дешевле, чем у {compare.bestCompetitorName}
            </>
          ) : (
            <>
              На{" "}
              <span className="tabular-nums">
                {formatPrice(saving, locale)}
              </span>{" "}
              дешевше, ніж у {compare.bestCompetitorName}
            </>
          )}
        </p>
      )}
      {expensive && (
        <p className="mt-2 font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-amber-300 sm:text-base">
          {isRu ? (
            <>
              На{" "}
              <span className="tabular-nums">
                {formatPrice(-saving, locale)}
              </span>{" "}
              дороже, чем у {compare.bestCompetitorName}
            </>
          ) : (
            <>
              На{" "}
              <span className="tabular-nums">
                {formatPrice(-saving, locale)}
              </span>{" "}
              дорожче, ніж у {compare.bestCompetitorName}
            </>
          )}
        </p>
      )}
      {!cheaper && !expensive && (
        <p className="mt-2 font-display text-[0.9375rem] font-semibold leading-snug tracking-tight text-slate-300 sm:text-base">
          {isRu
            ? `Цена сопоставима с ${compare.bestCompetitorName}`
            : `Ціна співставна з ${compare.bestCompetitorName}`}
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[40%]" />
            <col className="w-[32%]" />
            <col className="w-[28%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-muted-ui">
              <th className="py-2 pr-3 text-left font-medium">
                {isRu ? "Магазин" : "Магазин"}
              </th>
              <th className="py-2 px-2 text-right font-medium">
                {isRu ? "Цена" : "Ціна"}
              </th>
              <th className="py-2 pl-2 text-right font-medium">
                {isRu ? "Разница" : "Різниця"}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/5">
              <td className="truncate py-2.5 pr-3 text-left font-semibold text-primary align-middle">
                Pro-Optics
              </td>
              <td className="py-2.5 px-2 text-right tabular-nums text-primary align-middle whitespace-nowrap text-emerald-400">
                {formatPrice(compare.ourPrice, locale)}
              </td>
              <td className="py-2.5 pl-2 text-right text-secondary align-middle">
                —
              </td>
            </tr>
            {compare.lines.map((l) => (
              <tr key={l.competitorId} className="border-b border-white/5">
                <td className="truncate py-2.5 pr-3 text-left text-secondary align-middle">
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
                <td className="py-2.5 px-2 text-right tabular-nums text-secondary align-middle whitespace-nowrap text-emerald-400/90">
                  {formatPrice(l.competitorPrice, locale)}
                </td>
                <td
                  className={`py-2.5 pl-2 text-right tabular-nums align-middle whitespace-nowrap ${
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

      <p className="price-compare-disclaimer mt-4 text-[11px] leading-relaxed">
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
