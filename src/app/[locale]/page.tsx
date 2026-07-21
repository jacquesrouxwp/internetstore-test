import { Hero } from "@/components/home/Hero";
import { ProductRail } from "@/components/ui/ProductRail";
import {
  getProductsByFlag,
  getReviews,
  getBrands,
} from "@/lib/catalog";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Star } from "lucide-react";
import { Link } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tc = await getTranslations("catalog");

  const [top, hits, news, sale, reviews, brands] = await Promise.all([
    getProductsByFlag("top", 8),
    getProductsByFlag("hit", 8),
    getProductsByFlag("new", 8),
    getProductsByFlag("sale", 8),
    Promise.resolve(getReviews()),
    getBrands(),
  ]);

  return (
    <>
      <Hero />

      <ProductRail
        title={t("bestsellers")}
        products={top}
        href="/catalog/teplovizori"
        viewAllLabel={t("viewAll")}
      />

      <section className="border-y border-line bg-white py-10">
        <div className="container-shop">
          <h2 className="section-title mb-6">{t("whyTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[t("why1"), t("why2"), t("why3"), t("why4")].map((text, i) => (
              <div key={text} className="card-surface p-5">
                <span className="mb-3 block font-display text-2xl font-semibold text-accent/80">
                  0{i + 1}
                </span>
                <p className="text-sm font-medium leading-snug text-ink">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductRail
        title={t("hits")}
        products={hits}
        href="/catalog/teplovizori"
        viewAllLabel={t("viewAll")}
      />
      <ProductRail
        title={t("new")}
        products={news}
        href="/catalog/teplovizori?sort=newest"
        viewAllLabel={t("viewAll")}
      />
      <ProductRail
        title={t("sale")}
        products={sale}
        href="/catalog/teplovizori"
        viewAllLabel={t("viewAll")}
      />

      <section className="border-t border-line bg-white py-12">
        <div className="container-shop">
          <h2 className="section-title mb-6">{tc("brandsBlock")}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/catalog/teplovizori?brand=${b.slug}`}
                className="flex items-center justify-center rounded-xl border border-line bg-canvas px-3 py-5 text-center text-sm font-semibold text-ink transition hover:border-ink/20 hover:bg-white"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-shop">
          <h2 className="section-title mb-6">{t("reviews")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 6).map((r) => (
              <article key={r.id} className="card-surface p-5">
                <div className="mb-2 flex gap-0.5 text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mb-3 text-xs font-medium text-muted">{r.productName}</p>
                <p className="text-sm leading-relaxed text-ink">{r.text}</p>
                <p className="mt-4 text-xs text-muted">
                  {r.author} · {r.date}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
