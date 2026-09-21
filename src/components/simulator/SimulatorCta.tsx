import { ScanEye } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Product } from "@/types";
import {
  parseProductThermal,
  type ThermalMatrix,
} from "@/lib/thermal/parse-product-thermal";
import { simulatorHref, specNetdMk } from "@/lib/thermal/simulator-link";

type Locale = "uk" | "ru";

const MATRIX_LABEL: Record<number, string> = {
  256: "256×192",
  384: "384×288",
  640: "640×512",
};

/** Thermal listings whose products the sandbox can model. */
const THERMAL_CATEGORIES = new Set(["teplovizori", "pricili", "nasadky", "binokli"]);

/** Homepage card: the simulator is something no competitor has — show it. */
export function SimulatorPromo({ locale }: { locale: Locale }) {
  const ru = locale === "ru";
  return (
    <section className="pb-12">
      <div className="container-shop">
        <div className="hero-glass flex flex-col gap-5 rounded-[var(--radius-card)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(225,29,42,0.16)] text-[var(--accent)]">
              <ScanEye className="h-6 w-6" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold text-primary sm:text-2xl">
                {ru ? "Симулятор тепловизора" : "Симулятор тепловізора"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
                {ru
                  ? "Посмотрите до покупки, как видят матрицы 256, 384 и 640 с разными объективами: олень на выбранной дистанции и расчёт дальностей обнаружения. Бесплатно, прямо в браузере."
                  : "Подивіться до покупки, як бачать матриці 256, 384 і 640 з різними об'єктивами: олень на обраній дистанції та розрахунок дальностей виявлення. Безкоштовно, прямо в браузері."}
              </p>
            </div>
          </div>
          <Link href="/simulator" className="btn-hero btn-hero-primary shrink-0 self-start sm:self-center">
            {ru ? "Открыть симулятор" : "Відкрити симулятор"}
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Product page: open the simulator pre-set to this device. Shown only when
 * the card states a 256/384/640 matrix — the parser knows only those and
 * would otherwise fall back to 384 (e.g. for a 1280×1024 device).
 */
export function ProductSimulatorCta({
  product,
  locale,
}: {
  product: Pick<Product, "categorySlug" | "resolution" | "specs" | "detectionRangeM" | "nameUk">;
  locale: Locale;
}) {
  if (!product.categorySlug || !THERMAL_CATEGORIES.has(product.categorySlug)) return null;
  const width = parseInt(product.resolution || "", 10);
  if (!(width in MATRIX_LABEL)) return null;
  const params = {
    ...parseProductThermal({
      resolution: product.resolution,
      specs: product.specs,
      detectionRangeM: product.detectionRangeM,
      name: product.nameUk,
    }),
    // parseMatrix() doesn't know e.g. 640×480 and falls back to 384 — the
    // card's own width is authoritative here.
    matrix: width as ThermalMatrix,
    netdMk: specNetdMk(product.specs) ?? 0,
  };
  const ru = locale === "ru";
  const res = (product.resolution || "").trim();
  const matrix = /^\d+\s*[x×]\s*\d+$/i.test(res)
    ? res.replace(/\s*[x×]\s*/i, "×")
    : MATRIX_LABEL[width];
  const lens = params.focalMm
    ? ru
      ? ` и объективом ${params.focalMm} мм`
      : ` та об'єктивом ${params.focalMm} мм`
    : "";
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--accent)]/25 bg-[rgba(225,29,42,0.06)] p-3.5">
      <ScanEye className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={2} />
      <div className="text-sm">
        <p className="font-semibold text-primary">
          {ru ? "Как видит этот прибор?" : "Як бачить цей прилад?"}
        </p>
        <p className="mt-1 text-secondary">
          {ru
            ? `Откройте симулятор с матрицей ${matrix}${lens} и посмотрите, на какой дистанции цель ещё видно.`
            : `Відкрийте симулятор із матрицею ${matrix}${lens} і подивіться, на якій дистанції ціль ще видно.`}
        </p>
        <Link
          href={simulatorHref(params)}
          className="mt-2 inline-block font-semibold text-[var(--accent)] hover:underline"
        >
          {ru ? "Посмотреть в симуляторе →" : "Подивитися в симуляторі →"}
        </Link>
      </div>
    </div>
  );
}
