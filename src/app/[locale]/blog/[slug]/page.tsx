import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublishedPostBySlug,
  listRelatedPosts,
} from "@/lib/blog/repo";
import {
  postBody,
  postExcerpt,
  postMetaDescription,
  postMetaTitle,
  postTitle,
} from "@/lib/blog/types";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Blog" };
  const title = postMetaTitle(post, locale);
  const description = postMetaDescription(post, locale);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: post.coverUrl ? [post.coverUrl] : undefined,
      publishedTime: post.publishedAt || undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const loc = locale as "uk" | "ru";
  const title = postTitle(post, loc);
  const body = postBody(post, loc);
  const related = await listRelatedPosts(post, 3);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(
        loc === "ru" ? "ru-UA" : "uk-UA"
      )
    : "";
  const backLabel = loc === "ru" ? "← Все статьи" : "← Усі статті";
  const relatedLabel = loc === "ru" ? "Похожие статьи" : "Схожі статті";

  const paragraphs = body
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <article className="container-shop py-10 sm:py-14">
      <Link
        href="/blog"
        className="mb-6 inline-block text-sm font-medium text-muted-ui hover:text-[var(--accent)]"
      >
        {backLabel}
      </Link>

      <header className="mx-auto max-w-3xl">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {post.category ? (
            <span className="rounded-full bg-[rgba(225,29,42,0.16)] px-2.5 py-0.5 font-semibold uppercase tracking-wide text-[var(--accent)]">
              {post.category}
            </span>
          ) : null}
          {date ? (
            <time className="text-muted-ui" dateTime={post.publishedAt || ""}>
              {date}
            </time>
          ) : null}
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary sm:text-4xl">
          {title}
        </h1>
        {postExcerpt(post, loc) ? (
          <p className="mt-4 text-lg leading-relaxed text-secondary">
            {postExcerpt(post, loc)}
          </p>
        ) : null}
      </header>

      {post.coverUrl ? (
        <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-[var(--radius-card)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverUrl}
            alt=""
            className="aspect-[21/9] w-full object-cover"
          />
        </div>
      ) : null}

      <div className="hero-glass mx-auto mt-8 max-w-3xl rounded-[var(--radius-card)] px-6 py-8 sm:px-10 sm:py-10">
        <div className="space-y-4 text-[0.975rem] leading-relaxed text-secondary">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-secondary">
              {p}
            </p>
          ))}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-14 max-w-4xl">
          <h2 className="mb-5 font-display text-xl font-bold text-primary">
            {relatedLabel}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/blog/${r.slug}`}
                className="hero-glass block overflow-hidden rounded-[var(--radius-card)] transition hover:brightness-110"
              >
                {r.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.coverUrl}
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                  />
                ) : (
                  <div
                    className="aspect-[16/10]"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(225,29,42,0.2), #12141a)",
                    }}
                  />
                )}
                <div className="p-4">
                  <p className="text-sm font-semibold leading-snug text-primary">
                    {postTitle(r, loc)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto mt-10 max-w-3xl text-center">
        <Link
          href="/blog"
          className="inline-flex rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-white/[0.06]"
        >
          {backLabel.replace("← ", "")}
        </Link>
      </div>
    </article>
  );
}
