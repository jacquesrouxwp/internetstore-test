import { notFound } from "next/navigation";

/**
 * UI demos — blocked on production unless ALLOW_DEMO=1.
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO !== "1"
  ) {
    notFound();
  }
  return children;
}
