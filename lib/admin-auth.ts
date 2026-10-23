import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Admin authentication via Supabase Auth (server-only).
 *
 * Identity: Supabase Auth sessions carried in HttpOnly cookies by
 * @supabase/ssr — no custom password handling, no hand-rolled JWTs.
 * Authorization: role from the admin_users table (service-role lookup;
 * the table's RLS lets users read only their own row). All admin
 * writes still flow through service-role server code — RLS for writes
 * stays closed to clients.
 */

export type AdminRole = "admin" | "editor";

export function supabasePublicConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Cookie-based Supabase client for Server Components / Actions. */
export async function createSupabaseAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            for (const { name, value, options } of list) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — safe to ignore;
            // session refresh happens in middleware instead.
          }
        },
      },
    },
  );
}

export type AdminSession = {
  userId: string;
  email: string | null;
  role: AdminRole;
};

/** Resolves the current session + admin role, or null. */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!supabasePublicConfigured()) return null;
  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data: row } = await supabaseAdmin
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row || (row.role !== "admin" && row.role !== "editor")) return null;
  return {
    userId: user.id,
    email: user.email ?? null,
    role: row.role,
  };
}

/** Role gate for server actions — throws on missing/insufficient role. */
export async function requireRole(minimum: AdminRole): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated.");
  if (minimum === "admin" && session.role !== "admin") {
    throw new Error("Administrator role required for this action.");
  }
  return session;
}
