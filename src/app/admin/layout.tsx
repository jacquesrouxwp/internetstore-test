import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin · Pro-Optics",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold tracking-tight">
            Pro-Optics <span className="text-muted">Admin</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/products" className="text-muted hover:text-ink">
              Products
            </Link>
            <Link href="/admin/orders" className="text-muted hover:text-ink">
              Orders
            </Link>
            <Link href="/admin/import" className="text-muted hover:text-ink">
              Import
            </Link>
            <Link href="/" className="text-muted hover:text-ink">
              ← Site
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
