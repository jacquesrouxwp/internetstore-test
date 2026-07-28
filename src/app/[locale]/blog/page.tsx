import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/routing";
import {
  listPostCategories,
  listPublishedPosts,
} from "@/lib/blog/repo";
import { postExcerpt, postTitle } from "@/lib/blog/types";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; category?: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === "ru";
  return {
    title: isRu ? "Блог и новости" : "Блог і новини",
    description: isRu
      ? "Статьи о тепловизорах, выборе оптики и сервисе Pro-Optics."
      : "Статті про тепловізори, вибір оптики та сервіс Pro-Optics.",
  };
}

export const revalidate = 60;

export default async function BlogPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  const loc = locale as "uk" | "ru";
  const page = Math.max(1, Number(sp.page || 1));
  const category = sp.category || undefined;

  const [{ posts, total, limit }, categories] = await Promise.all([
    listPublishedPosts({ page, limit: 12, category }),
    listPostCategories(),
  ]);

  const pages = Math.max(1, Math.ceil(total / limit));
  const readMore = loc === "ru" ? "Читать →" : "Читати →";
  const allLabel = loc === "ru" ? "Все" : "Усі";

  return (
    <div className="container-shop py-10 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-ui">
          Blog
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          {t("blogTitle")}
        </h1>
        <p className="mt-3 text-secondary">
          {loc === "ru"
            ? "Гайды, обзоры и сервис — от команды Pro-Optics."
            : "Гайди, огляди та сервіс — від команди Pro-Optics."}
        </p>
      </header>

      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            href="/blog"
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              !category
                ? "bg-[var(--accent)] text-white"
                : "border border-white/15 text-secondary hover:text-primary"
            }`}
          >
            {allLabel}
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/blog?category=${encodeURIComponent(c)}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                category === c
                  ? "bg-[var(--accent)] text-white"
                  : "border border-white/15 text-secondary hover:text-primary"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {!posts.length ? (
        <div className="hero-glass rounded-[var(--radius-card)] p-12 text-center text-secondary">
          {loc === "ru" ? "Статей пока нет." : "Статей поки немає."}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const date = p.publishedAt
              ? new Date(p.publishedAt).toLocaleDateString(
                  loc === "ru" ? "ru-UA" : "uk-UA"
                )
              : "";
            return (
              <article
                key={p.id}
                className="hero-glass flex flex-col overflow-hidden rounded-[var(--radius-card)]"
              >
                <Link href={`/blog/${p.slug}`} className="block">
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.coverUrl}
                      alt=""
                      className="aspect-[16/10] w-full object-cover"
                    />
                  ) : (
                    <div
                      className="aspect-[16/10] w-full"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(225,29,42,0.22), rgba(18,20,26,0.95))",
                      }}
                    />
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
                    {p.category ? (
                      <span className="font-semibold uppercase tracking-wide text-[var(--accent)]">
                        {p.category}
                      </span>
                    ) : null}
                    {date ? (
                      <time className="text-muted-ui" dateTime={p.publishedAt || ""}>
                        {date}
                      </time>
                    ) : null}
                  </div>
                  <h2 className="font-display text-lg font-bold leading-snug text-primary">
                    <Link
                      href={`/blog/${p.slug}`}
                      className="hover:text-[var(--accent)]"
                    >
                      {postTitle(p, loc)}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-secondary">
                    {postExcerpt(p, loc)}
                  </p>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="mt-4 text-sm font-semibold text-[var(--accent)] hover:underline"
                  >
                    {readMore}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link
              href={`/blog?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-primary hover:bg-white/[0.06]"
            >
              ←
            </Link>
          )}
          <span className="text-sm text-muted-ui">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link
              href={`/blog?page=${page + 1}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-primary hover:bg-white/[0.06]"
            >
              →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
