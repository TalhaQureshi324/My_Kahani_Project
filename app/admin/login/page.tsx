import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { getAdminSession, supabasePublicConfigured } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in with a role → straight to the dashboard.
  const session = await getAdminSession().catch(() => null);
  if (session) redirect("/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-8 shadow-[0_20px_50px_-25px_rgba(93,31,19,0.4)]">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A8532B]">
          True Self Me
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[#5D1F13]">
          Admin Sign In
        </h1>

        {!supabasePublicConfigured() ? (
          <div className="mt-6 rounded-lg border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-4 text-sm leading-relaxed text-[#5D1F13]">
            Admin sign-in is not configured in this environment yet. Add{" "}
            <code className="rounded bg-white/60 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="rounded bg-white/60 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            to the environment file, then reload this page.
          </div>
        ) : (
          <LoginForm nextPath={next?.startsWith("/admin") ? next : undefined} />
        )}

        <p className="mt-6 text-center text-xs text-[#1A1A1A]/45">
          <Link href="/" className="underline underline-offset-4 hover:text-[#A8532B]">
            ← Back to trueselfme.com
          </Link>
        </p>
      </div>
    </main>
  );
}
