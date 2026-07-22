"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Головна", icon: "⌂" },
  { href: "/admin/products", label: "Товари", icon: "◫" },
  { href: "/admin/categories", label: "Категорії", icon: "☰" },
  { href: "/admin/brands", label: "Бренди", icon: "◇" },
  { href: "/admin/orders", label: "Замовлення", icon: "▤" },
  { href: "/admin/import", label: "Імпорт Prom", icon: "↓" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="admin-root min-h-screen bg-[#f4f5f7] text-zinc-900">
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
          <div className="border-b border-zinc-200 px-4 py-4">
            <Link href="/admin/dashboard" className="block">
              <span className="text-sm font-bold tracking-tight text-zinc-900">
                Pro-Optics
              </span>
              <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                Адмін-кабінет
              </span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <span className="w-4 text-center text-xs opacity-70">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="space-y-1 border-t border-zinc-200 p-2">
            <Link
              href="/"
              className="block rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              target="_blank"
            >
              ← Відкрити сайт
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              {loggingOut ? "Вихід…" : "Вийти"}
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
            <Link href="/admin/dashboard" className="font-bold text-zinc-900">
              Pro-Optics Admin
            </Link>
            <button
              type="button"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
              onClick={() => setMenuOpen((v) => !v)}
            >
              Меню
            </button>
          </header>
          {menuOpen && (
            <div className="border-b border-zinc-200 bg-white p-2 md:hidden">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive(item.href)
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700"
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={logout}
                className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-600"
              >
                Вийти
              </button>
            </div>
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
