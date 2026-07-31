import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin/session";

export const metadata: Metadata = {
  title: "Адмін-кабінет · Pro-Optics",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page renders without shell; protected pages get full nav
  // We always wrap with light admin root; shell only when authed
  // Client pages under /admin that need shell are nested; login is bare.
  // Detect via signed session cookie on server.
  const authed = await verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value);

  if (!authed) {
    return (
      <div className="admin-root min-h-screen bg-[#f4f5f7] text-zinc-900">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
          {children}
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
