import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/catalog";

/**
 * loading.tsx in this segment starts streaming before the page runs, so a
 * notFound() in page.tsx came too late and /catalog/<unknown> answered 200
 * (a soft 404 for Google). The layout sits outside that Suspense boundary —
 * checking the category here returns a real 404.
 */
export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!(await getCategoryBySlug(category))) notFound();
  return children;
}
