import { Link } from "@/i18n/routing";
import type { BlogPost } from "@/lib/blog/types";
import { postExcerpt, postTitle } from "@/lib/blog/types";

type Props = {
  posts: BlogPost[];
  locale: string;
  title: string;
  readMore: string;
  viewAll: string;
  emptyHint: string;
};

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(
      locale === "ru" ? "ru-UA" : "uk-UA",
      { day: "numeric", month: "long", year: "numeric" }
    );
  } catch {
    return "";
  }
}

export function HomeBlogSection({
  posts,
  locale,
  title,
  readMore,
  viewAll,
  emptyHint,
}: Props) {
  return (
    <section className="py-10 sm:py-12">
      <div className="container-shop">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h2 className="section-title mb-0">{title}</h2>
          <Link
            href="/blog"
            className="text-sm font-semibold text-[var(--accent)] transition hover:underline"
          >
            {viewAll}
          </Link>
        </div>

        {!posts.length ? (
          <div
            className="rounded-xl border px-6 py-10 text-center text-sm text-secondary"
            style={{
              background: "#16181D",
              borderColor: "rgba(255,255,255,0.08)",
            }}
          >
            {emptyHint}{" "}
            <Link href="/blog" className="font-semibold text-[var(--accent)] hover:underline">
              {viewAll}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((post) => {
              const name = postTitle(post, locale);
              const excerpt = postExcerpt(post, locale);
              const date = formatDate(post.publishedAt, locale);
              const tag = post.category?.trim() || (locale === "ru" ? "Гайды" : "Гайди");

              return (
                <article
                  key={post.id}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border transition duration-300 hover:-translate-y-1 hover:border-[rgba(225,29,42,0.35)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                  style={{
                    background: "#16181D",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="relative block aspect-[16/10] overflow-hidden bg-black/30"
                  >
                    {post.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverUrl}
                        alt={name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-end p-4"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(225,29,42,0.35), rgba(18,20,26,0.95))",
                        }}
                        aria-hidden
                      />
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                        style={{ background: "#E11D2A" }}
                      >
                        {tag}
                      </span>
                      {date ? (
                        <time
                          className="text-[11px] text-muted-ui"
                          dateTime={post.publishedAt || undefined}
                        >
                          {date}
                        </time>
                      ) : null}
                    </div>

                    <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-primary">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="transition hover:text-[var(--accent)]"
                      >
                        {name}
                      </Link>
                    </h3>

                    {excerpt ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">
                        {excerpt}
                      </p>
                    ) : null}

                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-auto inline-flex pt-4 text-sm font-semibold text-[var(--accent)] transition hover:underline"
                    >
                      {readMore}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
