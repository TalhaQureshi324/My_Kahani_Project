import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { LogOut, Newspaper, Settings } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/admin-auth";

/**
 * Authenticated admin shell. Middleware proves the session; THIS layer
 * proves authorization (role in admin_users) — unauthenticated and
 * unauthorized users never receive protected data or markup.
 */

export const metadata: Metadata = {
  title: { default: "True Self Me Admin", template: "%s | TSM Admin" },
  robots: { index: false, follow: false },
};

// Admin pages are per-request: auth state comes from cookies, and the
// build must never prerender protected data.
export const dynamic = "force-dynamic";

export default async function DashLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession().catch(() => null);
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/[0.08] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A8532B]">
            True Self Me <span className="text-[#1A1A1A]/40">Admin</span>
          </p>
          <nav className="flex items-center gap-4 text-sm font-semibold text-[#1A1A1A]/70">
            <Link href="/admin" className="hover:text-[#A8532B]">Overview</Link>
            <Link href="/admin/blogs" className="inline-flex items-center gap-1.5 hover:text-[#A8532B]">
              <Newspaper className="h-4 w-4" aria-hidden="true" /> Blogs
            </Link>
            <span className="inline-flex cursor-not-allowed items-center gap-1.5 text-[#1A1A1A]/30" title="Coming in a later phase">
              <Settings className="h-4 w-4" aria-hidden="true" /> Marketing
            </span>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-[#1A1A1A]/55">
              {session.email} <span className="ml-1 rounded-full bg-[#5D1F13]/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[#5D1F13]">{session.role}</span>
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 font-bold text-[#1A1A1A]/70 transition-colors hover:bg-[#F3EDE5]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
