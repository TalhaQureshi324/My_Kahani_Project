/**
 * Blog domain rules shared by server code, admin UI, and tests.
 * Plain ESM JavaScript (allowJs) so `node --test` can import it
 * without a TS compile step.
 */

export const BLOG_STATUSES = [
  "draft", "generated", "review", "approved", "scheduled",
  "published", "archived", "rejected", "failed",
];

/** Legal status transitions — mirrors the migration-0010 DB trigger. */
export const BLOG_STATUS_TRANSITIONS = {
  draft: ["generated", "review"],
  generated: ["review", "rejected", "failed"],
  review: ["approved", "rejected", "draft", "failed"],
  approved: ["scheduled", "published", "rejected"],
  scheduled: ["published", "approved"],
  published: ["archived", "draft"],
  archived: ["draft"],
  rejected: ["draft"],
  failed: ["draft", "review"],
};

export function canTransition(from, to) {
  if (from === to) return true;
  return BLOG_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Actions each role may perform; publish-level actions are ADMIN-only. */
export const STATUS_ACTIONS = {
  draft: [{ to: "review", label: "Submit for Review", roles: ["admin", "editor"], confirm: false }],
  generated: [{ to: "review", label: "Submit for Review", roles: ["admin", "editor"], confirm: false }],
  review: [
    { to: "approved", label: "Approve", roles: ["admin"], confirm: false },
    { to: "rejected", label: "Reject", roles: ["admin"], confirm: true },
    { to: "draft", label: "Return to Draft", roles: ["admin", "editor"], confirm: false },
  ],
  approved: [
    { to: "scheduled", label: "Schedule", roles: ["admin"], confirm: false, needsDate: true },
    { to: "published", label: "Publish Now", roles: ["admin"], confirm: true },
    { to: "rejected", label: "Reject", roles: ["admin"], confirm: true },
  ],
  scheduled: [
    { to: "published", label: "Publish Now", roles: ["admin"], confirm: true },
    { to: "approved", label: "Unschedule", roles: ["admin"], confirm: false },
  ],
  published: [
    { to: "archived", label: "Archive", roles: ["admin"], confirm: true },
    { to: "draft", label: "Unpublish to Draft", roles: ["admin"], confirm: true },
  ],
  archived: [{ to: "draft", label: "Restore to Draft", roles: ["admin"], confirm: false }],
  rejected: [{ to: "draft", label: "Return to Draft", roles: ["admin", "editor"], confirm: false }],
  failed: [{ to: "draft", label: "Return to Draft", roles: ["admin"], confirm: false }],
};

export function actionsForStatus(status, role) {
  return (STATUS_ACTIONS[status] ?? []).filter((a) => a.roles.includes(role));
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(input) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function asString(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.length > max) return undefined; // undefined signals "too long"
  return s;
}

function asStringArray(v, maxItems, maxLen) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return undefined;
  const items = v.map((x) => String(x).trim()).filter(Boolean);
  if (items.length > maxItems) return undefined;
  if (items.some((x) => x.length > maxLen)) return undefined;
  return items;
}

/**
 * Validates an admin-submitted blog payload. Returns
 * { ok: true, value } or { ok: false, errors: string[] }.
 * SEO lengths produce soft warnings via seoWarnings(), never hard fails.
 */
export function validateBlogPatch(input) {
  const errors = [];
  const value = {};

  const title = asString(input.title, 200);
  if (title === undefined) errors.push("Title must be 200 characters or fewer.");
  else if (title === null) errors.push("Title is required.");
  else value.title = title;

  if (input.slug !== undefined) {
    const slug = asString(input.slug, 80);
    if (slug === undefined) errors.push("Slug must be 80 characters or fewer.");
    else if (slug && !SLUG_RE.test(slug)) {
      errors.push("Slug must be lowercase, URL-safe, and hyphen-separated (e.g. my-article-title).");
    } else if (slug) {
      value.slug = slug;
    }
  }

  const excerpt = asString(input.excerpt, 500);
  if (excerpt === undefined) errors.push("Excerpt must be 500 characters or fewer.");
  else value.excerpt = excerpt;

  if (input.content !== undefined) {
    if (typeof input.content !== "string") errors.push("Content must be text.");
    else value.content = input.content;
  }

  for (const [key, max] of [
    ["category", 80], ["content_pillar", 80], ["primary_keyword", 120],
    ["search_intent", 200], ["content_cluster", 80], ["author", 120],
    ["featured_image_alt", 300], ["meta_title", 100], ["meta_description", 300],
    ["og_title", 100], ["og_description", 300],
  ]) {
    if (input[key] !== undefined) {
      const v = asString(input[key], max);
      if (v === undefined) errors.push(`${key.replace(/_/g, " ")} is too long (max ${max}).`);
      else value[key] = v;
    }
  }

  for (const key of ["featured_image", "og_image", "canonical_url"]) {
    if (input[key] !== undefined) {
      const v = asString(input[key], 500);
      if (v === undefined) errors.push(`${key.replace(/_/g, " ")} is too long.`);
      else if (v && !isHttpUrl(v)) errors.push(`${key.replace(/_/g, " ")} must be a valid http(s) URL.`);
      else value[key] = v;
    }
  }

  const tags = asStringArray(input.tags, 20, 40);
  if (tags === undefined) errors.push("Tags: max 20 tags, 40 characters each.");
  else value.tags = tags;

  const secondary = asStringArray(input.secondary_keywords, 20, 120);
  if (secondary === undefined) errors.push("Secondary keywords: max 20, 120 characters each.");
  else value.secondary_keywords = secondary;

  if (input.scheduled_at !== undefined && input.scheduled_at !== null && input.scheduled_at !== "") {
    const d = new Date(input.scheduled_at);
    if (Number.isNaN(d.getTime())) errors.push("Scheduled date is not a valid date.");
    else value.scheduled_at = d.toISOString();
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value };
}

/** Soft SEO guidance — warnings only, never blocks (spec: warn, don't fail). */
export function seoWarnings(patch) {
  const warnings = [];
  const mt = patch.meta_title;
  if (mt && mt.length > 60) warnings.push(`Meta title is ${mt.length} chars — search results truncate around 60.`);
  const md = patch.meta_description;
  if (md && md.length > 160) warnings.push(`Meta description is ${md.length} chars — search results truncate around 160.`);
  if (mt && md && !md) warnings.push("Meta description is empty — a summary improves click-through.");
  return warnings;
}
