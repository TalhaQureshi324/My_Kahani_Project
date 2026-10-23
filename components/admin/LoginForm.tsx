"use client";

import { useActionState } from "react";
import { Loader2, Lock } from "lucide-react";
import { loginAction, type ActionResult } from "@/app/admin/actions";

/**
 * Admin login form. Uses a server action (Supabase Auth
 * signInWithPassword) — credentials never touch client-side auth code
 * and the session rides HttpOnly cookies.
 */
export default function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      if (nextPath) fd.set("next", nextPath);
      return loginAction(prev, fd);
    },
    null,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="admin-email"
          className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
        >
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
          placeholder="you@trueselfme.com"
        />
      </div>
      <div>
        <label
          htmlFor="admin-password"
          className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#1A1A1A]/60"
        >
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-black/10 bg-[#F3EDE5] px-4 py-3 text-[#1A1A1A] focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm font-medium text-[#5D1F13]">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] transition-colors hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Lock className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
