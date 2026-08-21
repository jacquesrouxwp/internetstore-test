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
  stripHtml,
} from "@/lib/blog/types";
import { absoluteUrl, getSiteUrl } from "@/lib/site-url";

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
  const path = locale === "ru" ? `/ru/blog/${slug}` : `/blog/${slug}`;
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
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
  const bodyHtml = postBody(post, loc);
  const related = await listRelatedPosts(post, 3);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(
        loc === "ru" ? "ru-UA" : "uk-UA"
      )
    : "";
  const backLabel = loc === "ru" ? "← Все статьи" : "← Усі статті";
  const relatedLabel = loc === "ru" ? "Похожие статьи" : "Схожі статті";
  const siteUrl = getSiteUrl();
  const pageUrl =
    loc === "ru"
      ? absoluteUrl(`/ru/blog/${post.slug}`)
      : absoluteUrl(`/blog/${post.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: stripHtml(postExcerpt(post, loc) || title),
    image: post.coverUrl ? [post.coverUrl] : undefined,
    datePublished: post.publishedAt || undefined,
    dateModified: post.updatedAt || post.publishedAt || undefined,
    author: {
      "@type": "Organization",
      name: "Pro-Optics",
    },
    publisher: {
      "@type": "Organization",
      name: "Pro-Optics",
      url: siteUrl,
    },
    mainEntityOfPage: pageUrl,
    articleSection: post.category || undefined,
    inLanguage: loc === "ru" ? "ru-UA" : "uk-UA",
  };

  return (
    <article className="container-shop py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="mb-6 inline-block text-sm font-medium text-muted-ui hover:text-[var(--accent)]"
      >
        {backLabel}
      </Link>

      {/* Same horizontal width for title / cover / body — image no wider than text */}
      <div className="mx-auto max-w-3xl">
        <header>
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
          <div className="mt-8 overflow-hidden rounded-[var(--radius-card)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverUrl}
              alt={title}
              className="aspect-[16/9] w-full object-cover"
            />
          </div>
        ) : null}

        <div className="hero-glass mt-8 rounded-[var(--radius-card)] px-6 py-8 sm:px-10 sm:py-10">
          <div
            className="blog-prose space-y-4 text-[0.975rem] leading-relaxed text-secondary"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
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
          {loc === "ru" ? "Все статьи" : "Усі статті"}
        </Link>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .blog-prose h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .blog-prose h3 { font-size: 1.05rem; font-weight: 600; color: var(--text-primary); margin-top: 1.25rem; margin-bottom: 0.4rem; }
        .blog-prose p { margin-bottom: 0.75rem; }
        .blog-prose ul, .blog-prose ol { margin: 0.75rem 0 0.75rem 1.25rem; }
        .blog-prose li { margin-bottom: 0.35rem; }
        .blog-prose a { color: var(--accent); text-decoration: underline; }
        .blog-prose blockquote {
          border-left: 3px solid var(--accent);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--text-muted);
          font-style: italic;
        }
        .blog-prose img { max-width: 100%; border-radius: 0.75rem; margin: 1rem 0; }
        .blog-prose strong { color: var(--text-primary); }
      `,
        }}
      />
    </article>
  );
}
