import Link from "next/link";
import { listBlogs } from "@/lib/blog";
import { BLOG_STATUSES } from "@/lib/blog-shared.mjs";

/**
 * /admin/blogs — management list with status/pillar filters, search
 * over title/slug/keyword, and sort. Intentionally a plain table.
 */

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

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function AdminBlogsList({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    pillar?: string;
    q?: string;
    sort?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = BLOG_STATUSES.includes(sp.status ?? "")
    ? (sp.status as never)
    : undefined;

  let items: Awaited<ReturnType<typeof listBlogs>> = [];
  let dbError: string | null = null;
  try {
    items = await listBlogs({
      status,
      pillar: sp.pillar || undefined,
      search: sp.q || undefined,
      sort: (["updated", "created", "scheduled"].includes(sp.sort ?? "")
        ? sp.sort
        : "updated") as "updated" | "created" | "scheduled",
    });
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database unavailable.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-[#5D1F13]">Blogs</h1>
        <Link
          href="/admin/blogs/new"
          className="rounded-full bg-[#5D1F13] px-5 py-2.5 text-sm font-bold text-[#F5EFE6] transition-colors hover:bg-[#4A1811]"
        >
          + New Article
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="f-q" className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/55">Search</label>
          <input
            id="f-q"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Title, slug, or keyword"
            className="w-56 rounded-md border border-black/10 bg-white px-3 py-2 text-sm focus:border-[#A8532B] focus:outline-none focus:ring-1 focus:ring-[#A8532B]"
          />
        </div>
        <div>
          <label htmlFor="f-status" className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/55">Status</label>
          <select id="f-status" name="status" defaultValue={sp.status ?? ""} className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
            <option value="">All</option>
            {BLOG_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-pillar" className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/55">Pillar</label>
          <select id="f-pillar" name="pillar" defaultValue={sp.pillar ?? ""} className="max-w-52 rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
            <option value="">All</option>
            {PILLARS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-sort" className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/55">Sort</label>
          <select id="f-sort" name="sort" defaultValue={sp.sort ?? "updated"} className="rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
            <option value="updated">Newest update</option>
            <option value="created">Newest created</option>
            <option value="scheduled">Scheduled date</option>
          </select>
        </div>
        <button type="submit" className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-[#F3EDE5]">
          Apply
        </button>
      </form>

      {dbError ? (
        <p className="mt-6 rounded-lg border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm text-[#5D1F13]">
          Database unavailable: {dbError}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-black/[0.08] bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.08] text-xs font-bold uppercase tracking-wide text-[#1A1A1A]/50">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pillar</th>
                <th className="px-4 py-3">Keyword</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[#1A1A1A]/55">No articles match these filters.</td></tr>
              )}
              {items.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-[#F3EDE5]">
                  <td className="max-w-72 px-4 py-3">
                    <Link href={`/admin/blogs/${b.id}`} className="font-semibold text-[#5D1F13] hover:text-[#A8532B]">
                      {b.title}
                    </Link>
                    <span className="block text-xs text-[#1A1A1A]/45">/{b.slug}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#5D1F13]/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#5D1F13]">
                      {b.status}
                    </span>
                  </td>
                  <td className="max-w-40 truncate px-4 py-3 text-[#1A1A1A]/70">{b.content_pillar ?? "—"}</td>
                  <td className="max-w-40 truncate px-4 py-3 text-[#1A1A1A]/70">{b.primary_keyword ?? "—"}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]/60">{fmt(b.updated_at)}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]/60">{fmt(b.scheduled_at)}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]/60">{fmt(b.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
