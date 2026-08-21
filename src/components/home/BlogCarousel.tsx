"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BlogPost } from "@/lib/blog/types";
import { postTeaser, postTitle } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

const AUTO_MS = 6000;

export function BlogCarousel({
  posts,
  locale,
}: {
  posts: BlogPost[];
  locale: string;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = posts.length;

  const next = useCallback(() => {
    if (!n) return;
    setI((x) => (x + 1) % n);
  }, [n]);

  const prev = useCallback(() => {
    if (!n) return;
    setI((x) => (x - 1 + n) % n);
  }, [n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(next, AUTO_MS);
    return () => clearInterval(t);
  }, [n, paused, next]);

  if (!n) {
    return (
      <div className="hero-glass flex h-full min-h-[280px] flex-col justify-center rounded-[var(--radius-card)] px-6 py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-ui">
          {locale === "ru" ? "Блог" : "Блог"}
        </p>
        <p className="mt-3 text-sm text-secondary">
          {locale === "ru"
            ? "Скоро здесь появятся статьи."
            : "Незабаром тут з’являться статті."}
        </p>
        <Link
          href="/blog"
          className="mt-4 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          {locale === "ru" ? "Все статьи →" : "Всі статті →"}
        </Link>
      </div>
    );
  }

  const post = posts[i];
  const title = postTitle(post, locale);
  const teaser = postTeaser(post, locale, 320);
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(
        locale === "ru" ? "ru-UA" : "uk-UA"
      )
    : "";

  return (
    <div
      className="hero-glass relative flex h-full min-h-[320px] flex-col overflow-hidden rounded-[var(--radius-card)] sm:min-h-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {post.coverUrl ? (
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden sm:aspect-[2/1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(12,14,20,0.92)] via-transparent to-transparent" />
        </div>
      ) : (
        <div
          className="aspect-[16/10] w-full shrink-0 sm:aspect-[2/1]"
          style={{
            background:
              "linear-gradient(135deg, rgba(225,29,42,0.25), rgba(18,20,26,0.9))",
          }}
        />
      )}

      <div className="flex flex-1 flex-col px-5 pb-5 pt-3.5 sm:px-6 sm:pb-6 sm:pt-4">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
          {post.category ? (
            <span className="rounded-full bg-[rgba(225,29,42,0.18)] px-2 py-0.5 font-semibold uppercase tracking-wide text-[var(--accent)]">
              {post.category}
            </span>
          ) : null}
          {date ? (
            <time className="text-muted-ui" dateTime={post.publishedAt || ""}>
              {date}
            </time>
          ) : null}
        </div>

        <h2 className="font-display text-lg font-bold leading-snug tracking-tight text-primary sm:text-xl">
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-[var(--accent)]"
          >
            {title}
          </Link>
        </h2>

        {teaser ? (
          <p className="mt-2.5 flex-1 text-sm leading-relaxed text-secondary sm:mt-3 sm:text-[0.9375rem] sm:leading-[1.55] line-clamp-5 sm:line-clamp-6">
            {teaser}
          </p>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3.5">
          <Link
            href={`/blog/${post.slug}`}
            className="text-sm font-semibold text-[var(--accent)] hover:underline"
          >
            {locale === "ru" ? "Читать далее →" : "Читати далі →"}
          </Link>
          <Link
            href="/blog"
            className="text-xs font-medium text-muted-ui hover:text-primary"
          >
            {locale === "ru" ? "Все статьи →" : "Всі статті →"}
          </Link>
        </div>

        {n > 1 && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {posts.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === i
                      ? "w-5 bg-[var(--accent)]"
                      : "w-1.5 bg-white/25 hover:bg-white/40"
                  )}
                />
              ))}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={prev}
                className="rounded-lg border border-white/15 p-1.5 text-primary hover:bg-white/[0.06]"
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={next}
                className="rounded-lg border border-white/15 p-1.5 text-primary hover:bg-white/[0.06]"
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
