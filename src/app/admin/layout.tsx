import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin/AdminShell";
import { ADMIN_COOKIE } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "Адмін-кабінет · Pro-Optics",
  robots: { index: false, follow: false },
};

function isAuthed() {
  const value = cookies().get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  if (value === "1") return true;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return Boolean(secret && value === secret);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page renders without shell; protected pages get full nav
  // We always wrap with light admin root; shell only when authed
  // Client pages under /admin that need shell are nested; login is bare.
  // Detect via cookie on server.
  const authed = isAuthed();

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
