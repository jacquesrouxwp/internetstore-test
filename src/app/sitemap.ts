import type { MetadataRoute } from "next";
import { SEED_PRODUCTS, SEED_CATEGORIES } from "@/data/seed";

export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://optics-shop-skeleton.vercel.app";
  const now = new Date();

  const staticPages = [
    "",
    "/about",
    "/delivery",
    "/warranty",
    "/contacts",
    "/blog",
    "/cart",
    "/checkout",
  ].flatMap((path) => [
    { url: `${base}${path}`, lastModified: now, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.6 },
    { url: `${base}/ru${path}`, lastModified: now, changeFrequency: "weekly" as const, priority: path === "" ? 0.9 : 0.5 },
  ]);

  const cats = SEED_CATEGORIES.flatMap((c) => [
    {
      url: `${base}/catalog/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${base}/ru/catalog/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    },
  ]);

  const products = SEED_PRODUCTS.flatMap((p) => [
    {
      url: `${base}/product/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${base}/ru/product/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
  ]);

  return [...staticPages, ...cats, ...products];
}
