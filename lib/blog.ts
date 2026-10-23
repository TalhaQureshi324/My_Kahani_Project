import { getSupabaseAdmin } from "@/lib/supabase";
import {
  BLOG_STATUS_TRANSITIONS as SHARED_TRANSITIONS,
  canTransition as sharedCanTransition,
  slugify as sharedSlugify,
} from "./blog-shared.mjs";

/**
 * Blog CMS data access (spec section 2 / 34).
 *
 * The `blogs` table is the canonical content registry: every workflow
 * (human or n8n) reads and writes through this module. All queries use
 * the service-role client — writes are server-only, and the public
 * pages additionally benefit from the RLS published-read policy.
 * Domain rules (transitions, slugify) live in lib/blog-shared.mjs so
 * the admin UI and node tests share the exact same implementation.
 */

export type BlogStatus =
  | "draft"
  | "generated"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "archived"
  | "rejected"
  | "failed";

/** Allowed status transitions — mirrors the DB trigger in migration 0010. */
export const BLOG_STATUS_TRANSITIONS: Record<BlogStatus, BlogStatus[]> =
  SHARED_TRANSITIONS as Record<BlogStatus, BlogStatus[]>;

export function canTransition(from: BlogStatus, to: BlogStatus): boolean {
  return sharedCanTransition(from, to);
}

export function slugify(input: string): string {
  return sharedSlugify(input);
}

export type BlogRecord = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  featured_image_alt: string | null;
  author: string;
  category: string | null;
  tags: string[];
  content_pillar: string | null;
  primary_keyword: string | null;
  secondary_keywords: string[];
  search_intent: string | null;
  content_cluster: string | null;
  parent_pillar_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  schema_type: string;
  status: BlogStatus;
  needs_human_review: boolean;
  revision: number;
  created_at: string;
  updated_at: string;
  generated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  generation_model: string | null;
  prompt_version: string | null;
  source_references: unknown;
  internal_links: unknown;
  quality_score: number | null;
  seo_review: unknown;
  social_post_id: string | null;
  instagram_media_id: string | null;
  instagram_status: string | null;
};

const PUBLISHED_COLUMNS =
  "id, title, slug, excerpt, featured_image, featured_image_alt, author, category, tags, " +
  "content_cluster, content_pillar, published_at, updated_at, meta_title, meta_description";

/** Published listing (public blog + sitemap). Never exposes drafts. */
export async function listPublished(options?: {
  page?: number;
  pageSize?: number;
  category?: string;
}): Promise<{ items: BlogRecord[]; total: number }> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(24, Math.max(1, options?.pageSize ?? 9));
  const supabase = getSupabaseAdmin();

  let countQuery = supabase
    .from("blogs")
    .select("id", { count: "exact", head: true })
    .eq("status", "published");
  if (options?.category) countQuery = countQuery.eq("category", options.category);
  const { count } = await countQuery;

  let listQuery = supabase
    .from("blogs")
    .select(PUBLISHED_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (options?.category) listQuery = listQuery.eq("category", options.category);

  const { data, error } = await listQuery;
  if (error) throw new Error(`listPublished failed: ${error.message}`);
  return { items: (data ?? []) as unknown as BlogRecord[], total: count ?? 0 };
}

/** Single published article by slug. Drafts are never rendered. */
export async function getPublishedBySlug(
  slug: string,
): Promise<BlogRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as BlogRecord) ?? null;
}

/** Related published articles in the same cluster (internal linking). */
export async function getRelated(
  blog: Pick<BlogRecord, "id" | "content_cluster">,
  limit = 3,
): Promise<BlogRecord[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("blogs")
    .select(PUBLISHED_COLUMNS)
    .eq("status", "published")
    .neq("id", blog.id)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (blog.content_cluster) query = query.eq("content_cluster", blog.content_cluster);
  const { data } = await query;
  return (data ?? []) as unknown as BlogRecord[];
}

/** Sitemap entries — published slugs + publish dates only. */
export async function listPublishedForSitemap(): Promise<
  { slug: string; published_at: string | null; updated_at: string }[]
> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("blogs")
    .select("slug, published_at, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5000);
  return data ?? [];
}

/** Admin listing (all statuses) with optional search + sort. */
export async function listBlogs(options?: {
  status?: BlogStatus;
  pillar?: string;
  search?: string;
  sort?: "updated" | "created" | "scheduled" | "published";
  limit?: number;
}): Promise<BlogRecord[]> {
  const supabase = getSupabaseAdmin();
  const sortColumn =
    options?.sort === "created"
      ? "created_at"
      : options?.sort === "scheduled"
        ? "scheduled_at"
        : options?.sort === "published"
          ? "published_at"
          : "updated_at";
  let query = supabase
    .from("blogs")
    .select("*")
    .order(sortColumn, { ascending: false, nullsFirst: false })
    .limit(Math.min(200, options?.limit ?? 50));
  if (options?.status) query = query.eq("status", options.status);
  if (options?.pillar) query = query.eq("content_pillar", options.pillar);
  if (options?.search) {
    const term = options.search.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        [`title.ilike.%${term}%`, `slug.ilike.%${term}%`, `primary_keyword.ilike.%${term}%`].join(","),
      );
    }
  }
  const { data, error } = await query;
  if (error) throw new Error(`listBlogs failed: ${error.message}`);
  return (data ?? []) as unknown as BlogRecord[];
}

export async function getBlogById(id: string): Promise<BlogRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("blogs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as BlogRecord) ?? null;
}

export async function getBlogBySlug(slug: string): Promise<BlogRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as BlogRecord) ?? null;
}

/**
 * Update a blog, enforcing the status transition map server-side
 * (the DB trigger is the hard backstop; this gives friendly errors).
 */
export async function updateBlog(
  id: string,
  patch: Partial<BlogRecord> & { status?: BlogStatus },
  editor: string,
): Promise<BlogRecord> {
  const supabase = getSupabaseAdmin();
  const current = await getBlogById(id);
  if (!current) throw new Error("Blog not found.");

  if (patch.status && !canTransition(current.status, patch.status)) {
    throw new Error(
      `Illegal status transition ${current.status} → ${patch.status}.`,
    );
  }

  const now = new Date().toISOString();
  const stamp: Record<string, string> = {
    generated: "generated_at",
    reviewed: "reviewed_at",
    approved: "approved_at",
    scheduled: "scheduled_at",
    published: "published_at",
    archived: "archived_at",
  };
  const update: Record<string, unknown> = {
    ...patch,
    updated_at: now,
    ...(patch.status && stamp[patch.status]
      ? { [stamp[patch.status]]: now }
      : {}),
  };
  if (patch.status === "review") {
    update.reviewed_by = editor;
  }
  if (patch.status === "approved") {
    update.approved_by = editor;
  }

  const { data, error } = await supabase
    .from("blogs")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`updateBlog failed: ${error.message}`);
  return data as BlogRecord;
}

/** Content snapshots for revision history (spec section 35). */
export async function recordRevision(
  blogId: string,
  snapshot: {
    title: string;
    excerpt: string | null;
    content: string | null;
    meta_title: string | null;
    meta_description: string | null;
  },
  editor: string,
  reason?: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const current = await getBlogById(blogId);
  if (!current) return;
  await supabase.from("blog_revisions").insert({
    blog_id: blogId,
    version: current.revision + 1,
    title: snapshot.title,
    excerpt: snapshot.excerpt,
    content: snapshot.content,
    meta_title: snapshot.meta_title,
    meta_description: snapshot.meta_description,
    edited_by: editor,
    reason: reason ?? null,
  });
  await supabase
    .from("blogs")
    .update({ revision: current.revision + 1 })
    .eq("id", blogId);
}

/** Marketing settings (key → parsed JSON value). */
export async function getMarketingSetting<T>(key: string): Promise<T | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("marketing_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T) ?? null;
}
