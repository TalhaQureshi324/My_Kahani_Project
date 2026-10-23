"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSupabaseAuthClient,
  getAdminSession,
  requireRole,
  supabasePublicConfigured,
} from "@/lib/admin-auth";
import {
  getBlogById,
  getBlogBySlug,
  recordRevision,
  updateBlog,
} from "@/lib/blog";
import { seoWarnings, validateBlogPatch } from "@/lib/blog-shared.mjs";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Admin server actions. Every mutation re-verifies the session and
 * role server-side (middleware only proves authentication). Publish /
 * unpublish revalidate the public blog routes so changes appear
 * without a rebuild (spec section 57).
 */

export type ActionResult<T = undefined> = {
  ok: boolean;
  error?: string;
  warnings?: string[];
  slug?: string;
  id?: string;
  data?: T;
};

function revalidateBlogPaths(slug: string) {
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/blogs");
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!supabasePublicConfigured()) {
    return { ok: false, error: "Admin sign-in is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the environment." };
  }
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Enter your email and password." };
  }

  const supabase = await createSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Single generic message — never reveals whether an account exists.
    return { ok: false, error: "Invalid email or password." };
  }

  const session = await getAdminSession();
  if (!session) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account does not have admin access." };
  }

  redirect(formData.get("next") && String(formData.get("next")).startsWith("/admin")
    ? String(formData.get("next"))
    : "/admin");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function createBlogAction(
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  await requireRole("editor");

  // Always derive the initial slug from the title server-side unless a
  // valid manual slug was supplied; duplicates are rejected, never
  // silently renamed.
  const check = validateBlogPatch(payload);
  if (!check.ok) return { ok: false, error: check.errors.join(" ") };

  const slug = check.value.slug as string | undefined;
  const supabase = getSupabaseAdmin();

  const { data: created, error } = await supabase
    .from("blogs")
    .insert({
      title: check.value.title,
      slug: slug ?? null,
      excerpt: check.value.excerpt ?? null,
      content: check.value.content ?? null,
      status: "draft",
      created_by: "admin",
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      return { ok: false, error: "That slug is already used by another article. Choose a different one." };
    }
    return { ok: false, error: `Could not create the article: ${error.message}` };
  }

  revalidatePath("/admin/blogs");
  return { ok: true, id: created.id, slug: created.slug };
}

export async function saveBlogAction(
  id: string,
  payload: Record<string, unknown>,
): Promise<ActionResult> {
  const session = await requireRole("editor");
  const current = await getBlogById(id);
  if (!current) return { ok: false, error: "Article not found." };

  // Editors may only touch non-published articles; publishing state is
  // ADMIN territory handled by transitions.
  if (session.role !== "admin" && ["published", "scheduled"].includes(current.status)) {
    return { ok: false, error: "Editors cannot modify published or scheduled articles." };
  }

  const check = validateBlogPatch(payload);
  if (!check.ok) return { ok: false, error: check.errors.join(" ") };
  const patch = check.value;

  const slugCandidate =
    typeof patch.slug === "string" ? patch.slug : undefined;
  if (slugCandidate && slugCandidate !== current.slug) {
    const clash = await getBlogBySlug(slugCandidate);
    if (clash && clash.id !== id) {
      return { ok: false, error: "That slug is already used by another article. Choose a different one." };
    }
  }

  try {
    // Meaningful-content save → revision snapshot (spec section 35).
    const contentChanged =
      (patch.content !== undefined && patch.content !== current.content) ||
      (patch.title !== undefined && patch.title !== current.title);
    if (contentChanged) {
      await recordRevision(
        id,
        {
          title: current.title,
          excerpt: current.excerpt,
          content: current.content,
          meta_title: current.meta_title,
          meta_description: current.meta_description,
        },
        session.email ?? session.userId,
        "manual save",
      );
    }

    await updateBlog(id, { ...patch, updated_at: new Date().toISOString() }, session.email ?? "admin");
    const updated = await getBlogById(id);
    const slug = (updated?.slug ?? current.slug) as string;
    revalidatePath(`/admin/blogs/${id}`);
    revalidateBlogPaths(slug);
    return {
      ok: true,
      id,
      slug,
      warnings: seoWarnings(patch),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not save the article.",
    };
  }
}

export async function transitionBlogAction(
  id: string,
  to: string,
  scheduledAt?: string,
): Promise<ActionResult> {
  const session = await requireRole("editor");
  const current = await getBlogById(id);
  if (!current) return { ok: false, error: "Article not found." };

  // Publishing-level transitions are ADMIN-only.
  const adminOnly = ["approved", "scheduled", "published", "archived", "rejected"];
  if (adminOnly.includes(to) && session.role !== "admin") {
    return { ok: false, error: "Administrator role required for this action." };
  }

  try {
    const patch: Record<string, unknown> = { status: to };
    if (to === "scheduled") {
      if (!scheduledAt) return { ok: false, error: "Pick a schedule date and time first." };
      const d = new Date(scheduledAt);
      if (Number.isNaN(d.getTime())) return { ok: false, error: "Schedule date is not valid." };
      patch.scheduled_at = d.toISOString();
    }
    await updateBlog(id, patch, session.email ?? "admin");
    revalidatePath(`/admin/blogs/${id}`);
    revalidateBlogPaths(current.slug);
    return { ok: true, id, slug: current.slug };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Status change failed.",
    };
  }
}
