export type BlogPost = {
  id: string;
  slug: string;
  titleUk: string;
  titleRu: string;
  excerptUk: string | null;
  excerptRu: string | null;
  bodyUk: string | null;
  bodyRu: string | null;
  coverUrl: string | null;
  category: string | null;
  published: boolean;
  publishedAt: string | null;
  metaTitleUk: string | null;
  metaTitleRu: string | null;
  metaDescriptionUk: string | null;
  metaDescriptionRu: string | null;
  createdAt: string | null;
};

export function postTitle(p: BlogPost, locale: string): string {
  return locale === "ru" ? p.titleRu || p.titleUk : p.titleUk;
}

export function postExcerpt(p: BlogPost, locale: string): string {
  const e =
    locale === "ru" ? p.excerptRu || p.excerptUk : p.excerptUk || p.excerptRu;
  return e || "";
}

export function postBody(p: BlogPost, locale: string): string {
  return locale === "ru"
    ? p.bodyRu || p.bodyUk || ""
    : p.bodyUk || p.bodyRu || "";
}

export function postMetaTitle(p: BlogPost, locale: string): string {
  if (locale === "ru") return p.metaTitleRu || p.titleRu || p.titleUk;
  return p.metaTitleUk || p.titleUk;
}

export function postMetaDescription(p: BlogPost, locale: string): string {
  if (locale === "ru")
    return p.metaDescriptionRu || postExcerpt(p, "ru") || p.titleRu;
  return p.metaDescriptionUk || postExcerpt(p, "uk") || p.titleUk;
}

export function mapDbPost(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    titleUk: String(row.title_uk || ""),
    titleRu: String(row.title_ru || ""),
    excerptUk: (row.excerpt_uk as string) || null,
    excerptRu: (row.excerpt_ru as string) || null,
    bodyUk: (row.body_uk as string) || null,
    bodyRu: (row.body_ru as string) || null,
    coverUrl: (row.cover_url as string) || null,
    category: (row.category as string) || null,
    published: row.published !== false,
    publishedAt: (row.published_at as string) || null,
    metaTitleUk: (row.meta_title_uk as string) || null,
    metaTitleRu: (row.meta_title_ru as string) || null,
    metaDescriptionUk: (row.meta_description_uk as string) || null,
    metaDescriptionRu: (row.meta_description_ru as string) || null,
    createdAt: (row.created_at as string) || null,
  };
}

export function postToDbRow(p: Partial<BlogPost> & { slug: string }) {
  return {
    slug: p.slug,
    title_uk: p.titleUk,
    title_ru: p.titleRu,
    excerpt_uk: p.excerptUk ?? null,
    excerpt_ru: p.excerptRu ?? null,
    body_uk: p.bodyUk ?? null,
    body_ru: p.bodyRu ?? null,
    cover_url: p.coverUrl ?? null,
    category: p.category ?? null,
    published: p.published !== false,
    published_at: p.publishedAt ?? new Date().toISOString(),
    meta_title_uk: p.metaTitleUk ?? null,
    meta_title_ru: p.metaTitleRu ?? null,
    meta_description_uk: p.metaDescriptionUk ?? null,
    meta_description_ru: p.metaDescriptionRu ?? null,
    updated_at: new Date().toISOString(),
  };
}
