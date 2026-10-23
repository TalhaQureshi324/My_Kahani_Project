"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
  Save,
} from "lucide-react";
import {
  createBlogAction,
  saveBlogAction,
  transitionBlogAction,
} from "@/app/admin/actions";
import {
  actionsForStatus,
  slugify,
  type AdminRole,
  type StatusAction,
} from "@/lib/blog-shared.mjs";

/**
 * Blog editor (admin). Content stays Markdown — the same source format
 * GLM generates and lib/blog-render sanitizes for the public site.
 * The preview pane applies the same sanitizer client-side. Status
 * changes go through contextual, role-filtered actions with
 * confirmations on sensitive transitions (publish/archive/reject).
 */

export type EditorBlog = {
  id: string;
  created_at: string;
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
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
};

const PILLARS = [
  "Personal Growth & Self-Awareness",
  "Relationships & Communication",
  "Parenting & Family",
  "Teen Development",
  "College & Life Transitions",
  "Career & Professional Growth",
  "Cultural Identity & Belonging",
  "Changing Multigenerational Patterns",
  "Coaching Education",
  "Reflection & Personal Development",
];

const inputCls =
  "w-full rounded-md border border-black/10 bg-[#F3EDE5] px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#1A1A1A]/35 focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]";
const labelCls =
  "mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-[#1A1A1A]/55";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-[#1A1A1A]/45">{hint}</p>}
    </div>
  );
}

export default function BlogEditor({
  blog,
  role,
}: {
  blog: EditorBlog | null;
  role: AdminRole;
}) {
  const isNew = blog === null;
  const [id, setId] = useState(blog?.id ?? null);
  const [status, setStatus] = useState(blog?.status ?? "draft");
  const [title, setTitle] = useState(blog?.title ?? "");
  const [slug, setSlug] = useState(blog?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(blog?.slug));
  const [excerpt, setExcerpt] = useState(blog?.excerpt ?? "");
  const [content, setContent] = useState(blog?.content ?? "");
  const [featuredImage, setFeaturedImage] = useState(blog?.featured_image ?? "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState(blog?.featured_image_alt ?? "");
  const [author, setAuthor] = useState(blog?.author ?? "Fahd Alam");
  const [category, setCategory] = useState(blog?.category ?? "");
  const [tags, setTags] = useState((blog?.tags ?? []).join(", "));
  const [pillar, setPillar] = useState(blog?.content_pillar ?? "");
  const [primaryKey, setPrimaryKey] = useState(blog?.primary_keyword ?? "");
  const [secondary, setSecondary] = useState((blog?.secondary_keywords ?? []).join(", "));
  const [searchIntent, setSearchIntent] = useState(blog?.search_intent ?? "");
  const [cluster, setCluster] = useState(blog?.content_cluster ?? "");
  const [metaTitle, setMetaTitle] = useState(blog?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(blog?.meta_description ?? "");
  const [canonicalUrl, setCanonicalUrl] = useState(blog?.canonical_url ?? "");
  const [ogTitle, setOgTitle] = useState(blog?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(blog?.og_description ?? "");
  const [ogImage, setOgImage] = useState(blog?.og_image ?? "");
  const [showPreview, setShowPreview] = useState(false);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  /** Sanitized client preview — same allowlist approach as the server. */
  const previewHtml = useMemo(() => {
    if (!showPreview) return "";
    const raw = marked.parse(content || "*Nothing written yet.*", { async: false }) as string;
    return DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: [
        "h2", "h3", "h4", "p", "br", "hr", "ul", "ol", "li", "blockquote",
        "strong", "em", "s", "code", "pre", "a", "img",
        "table", "thead", "tbody", "tr", "th", "td",
      ],
      ALLOWED_ATTR: ["href", "title", "target", "rel", "src", "alt", "loading"],
    });
  }, [content, showPreview]);

  function payload() {
    return {
      title,
      slug: slug || undefined,
      excerpt,
      content,
      featured_image: featuredImage,
      featured_image_alt: featuredImageAlt,
      author,
      category,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      content_pillar: pillar,
      primary_keyword: primaryKey,
      secondary_keywords: secondary.split(",").map((t) => t.trim()).filter(Boolean),
      search_intent: searchIntent,
      content_cluster: cluster,
      meta_title: metaTitle,
      meta_description: metaDescription,
      canonical_url: canonicalUrl,
      og_title: ogTitle,
      og_description: ogDescription,
      og_image: ogImage,
    };
  }

  function save() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      if (isNew) {
        const res = await createBlogAction(payload());
        if (!res.ok || !res.id) {
          setError(res.error ?? "Could not create the article.");
          return;
        }
        // Redirect to the full editor URL for the created record.
        window.location.href = `/admin/blogs/${res.id}`;
        return;
      }
      const res = await saveBlogAction(id as string, payload());
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      if (res.slug) setSlug(res.slug);
      setWarnings(res.warnings ?? []);
      setNotice("Saved.");
    });
  }

  function runAction(action: StatusAction) {
    const doIt = () => {
      setError(null);
      setNotice(null);
      startTransition(async () => {
        // Persist current edits first so a transition never loses work.
        if (!isNew) {
          const saved = await saveBlogAction(id as string, payload());
          if (!saved.ok) {
            setError(saved.error ?? "Could not save before the status change.");
            return;
          }
        }
        const res = await transitionBlogAction(
          id as string,
          action.to,
          action.needsDate ? scheduleValue : undefined,
        );
        if (!res.ok) {
          setError(res.error ?? "Status change failed.");
          return;
        }
        setStatus(action.to);
        setNotice(`Status changed to ${action.to}.`);
      });
    };
    if (action.confirm && !window.confirm(`${action.label} — are you sure?`)) return;
    doIt();
  }

  const [scheduleValue, setScheduleValue] = useState(
    blog?.scheduled_at ? new Date(blog.scheduled_at).toISOString().slice(0, 16) : "",
  );

  const actions = isNew ? [] : actionsForStatus(status, role);
  const canEditContent = role === "admin" || !["published", "scheduled"].includes(status);

  function appendSnippet(snippet: string) {
    setContent((c) => `${c}${c && !c.endsWith("\n") ? "\n\n" : ""}${snippet}`);
  }

  const toolbarItems: [string, string][] = [
    ["H2", "## Heading\n"],
    ["H3", "### Subheading\n"],
    ["B", "**bold text**"],
    ["I", "*italic text*"],
    ["• List", "- list item\n"],
    ["1. List", "1. list item\n"],
    ["Link", "[link text](https://example.com)"],
    ["Image", "![alt text](https://example.com/image.jpg)"],
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/blogs" className="text-sm font-semibold text-[#A8532B] hover:underline">
            ← All articles
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-[#5D1F13]">
            {isNew ? "New Article" : title || "Untitled"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Link
              href={`/admin/blogs/${id}/preview`}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-[#F3EDE5]"
            >
              <Eye className="h-4 w-4" aria-hidden="true" /> Preview
            </Link>
          )}
          <button
            type="button"
            onClick={save}
            disabled={pending || !canEditContent}
            className="inline-flex items-center gap-2 rounded-full bg-[#5D1F13] px-5 py-2.5 text-sm font-bold text-[#F5EFE6] transition-colors hover:bg-[#4A1811] disabled:pointer-events-none disabled:opacity-40"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
            {isNew ? "Create Draft" : "Save"}
          </button>
        </div>
      </div>

      {/* Status + contextual workflow actions */}
      {!isNew && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-4 py-3">
          <span className="rounded-full bg-[#5D1F13]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#5D1F13]">
            {status}
          </span>
          {status === "scheduled" && (
            <input
              type="datetime-local"
              aria-label="Schedule date and time"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              className="rounded-md border border-black/10 bg-[#F3EDE5] px-3 py-1.5 text-sm"
            />
          )}
          {actions.map((a) => (
            <button
              key={a.to + a.label}
              type="button"
              disabled={pending}
              onClick={() => runAction(a)}
              className="rounded-full border border-[#A8532B]/40 bg-white px-4 py-1.5 text-sm font-bold text-[#A8532B] transition-colors hover:bg-[#A8532B]/10 disabled:opacity-40"
            >
              {a.label}
            </button>
          ))}
          {role === "editor" && ["review", "approved", "scheduled", "published"].includes(status) && (
            <span className="text-xs text-[#1A1A1A]/45">
              Publish-level actions require an administrator.
            </span>
          )}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm font-medium text-[#5D1F13]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-green-700/25 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {notice}
        </p>
      )}
      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warnings.map((w) => <p key={w}>⚠ {w}</p>)}
        </div>
      )}

      {/* Content */}
      <fieldset disabled={!canEditContent} className="mt-6 grid gap-6 lg:grid-cols-2 disabled:opacity-60">
        <section className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-[#5D1F13]">Content</h2>
          <div className="mt-4 space-y-4">
            <Field label="Title">
              <input
                className={inputCls}
                value={title}
                maxLength={200}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Slug" hint="Lowercase, hyphen-separated. Auto-generated from the title; edit freely.">
              <input
                className={inputCls}
                value={slug}
                maxLength={80}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="how-to-communicate-without-becoming-defensive"
              />
            </Field>
            <Field label="Excerpt" hint={`${excerpt.length}/500 — used on cards and as the meta fallback.`}>
              <textarea className={`${inputCls} min-h-20`} value={excerpt} maxLength={500} onChange={(e) => setExcerpt(e.target.value)} />
            </Field>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className={labelCls + " mb-0"}>Content (Markdown)</span>
                <span className="flex flex-wrap gap-1">
                  {toolbarItems.map(([label, snippet]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => appendSnippet(snippet)}
                      className="rounded border border-black/10 px-2 py-0.5 text-xs font-bold text-[#1A1A1A]/70 hover:bg-[#F3EDE5]"
                    >
                      {label}
                    </button>
                  ))}
                </span>
              </div>
              <textarea
                className={`${inputCls} min-h-[420px] font-mono text-[13px] leading-relaxed`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"Write in Markdown…\n\n## Section heading\n\nParagraph text with **bold** and [links](https://example.com)."}
              />
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="mt-2 text-xs font-bold text-[#A8532B] hover:underline"
              >
                {showPreview ? "Hide preview" : "Show preview"}
              </button>
              {showPreview && (
                <div
                  className="prose-blog mt-2 max-h-96 overflow-y-auto rounded-lg border border-black/[0.08] bg-[#FDFBF7] p-4 text-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Featured Image URL">
                <input className={inputCls} value={featuredImage} onChange={(e) => setFeaturedImage(e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="Featured Image Alt Text">
                <input className={inputCls} value={featuredImageAlt} onChange={(e) => setFeaturedImageAlt(e.target.value)} />
              </Field>
              <Field label="Category">
                <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} />
              </Field>
              <Field label="Author">
                <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} />
              </Field>
              <Field label="Tags" hint="Comma-separated.">
                <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
              </Field>
            </div>
          </div>
        </section>

        {/* SEO + workflow */}
        <section className="space-y-6">
          <div className="rounded-xl border border-black/[0.08] bg-white p-5">
            <h2 className="font-display text-lg font-semibold text-[#5D1F13]">SEO</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Primary Keyword">
                <input className={inputCls} value={primaryKey} onChange={(e) => setPrimaryKey(e.target.value)} />
              </Field>
              <Field label="Content Cluster">
                <input className={inputCls} value={cluster} onChange={(e) => setCluster(e.target.value)} />
              </Field>
              <Field label="Secondary Keywords" hint="Comma-separated.">
                <input className={inputCls} value={secondary} onChange={(e) => setSecondary(e.target.value)} />
              </Field>
              <Field label="Search Intent">
                <input className={inputCls} value={searchIntent} onChange={(e) => setSearchIntent(e.target.value)} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Content Pillar">
                  <select className={inputCls} value={pillar} onChange={(e) => setPillar(e.target.value)}>
                    <option value="">— Select pillar —</option>
                    {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Meta Title" hint={`${metaTitle.length}/60 recommended`}>
                <input className={inputCls} value={metaTitle} maxLength={100} onChange={(e) => setMetaTitle(e.target.value)} />
              </Field>
              <Field label="Canonical URL">
                <input className={inputCls} value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://trueselfme.com/blog/…" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Meta Description" hint={`${metaDescription.length}/160 recommended`}>
                  <textarea className={`${inputCls} min-h-20`} value={metaDescription} maxLength={300} onChange={(e) => setMetaDescription(e.target.value)} />
                </Field>
              </div>
              <Field label="OG Title">
                <input className={inputCls} value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} />
              </Field>
              <Field label="OG Image URL">
                <input className={inputCls} value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://…" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="OG Description">
                  <textarea className={`${inputCls} min-h-16`} value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {!isNew && (
            <div className="rounded-xl border border-black/[0.08] bg-white p-5 text-sm text-[#1A1A1A]/70">
              <h2 className="font-display text-lg font-semibold text-[#5D1F13]">Workflow</h2>
              <dl className="mt-3 grid grid-cols-2 gap-y-2">
                <dt className="text-[#1A1A1A]/50">Created</dt>
                <dd>{new Date(blog.created_at).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}</dd>
                <dt className="text-[#1A1A1A]/50">Scheduled at</dt>
                <dd>{blog?.scheduled_at ? new Date(blog.scheduled_at).toLocaleString("en-US", { timeZone: "America/Chicago" }) : "—"}</dd>
                <dt className="text-[#1A1A1A]/50">Published at</dt>
                <dd>{blog?.published_at ? new Date(blog.published_at).toLocaleString("en-US", { timeZone: "America/Chicago" }) : "—"}</dd>
              </dl>
            </div>
          )}
        </section>
      </fieldset>
    </div>
  );
}
