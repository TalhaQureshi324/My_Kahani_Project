import Link from "next/link";
import { listBlogs } from "@/lib/blog";

/**
 * /admin — overview: article counts by status + the most recently
 * touched articles. Deliberately minimal in this phase.
 */
export default async function AdminOverview() {
  let recent: Awaited<ReturnType<typeof listBlogs>> = [];
  let counts: Record<string, number> = {};
  let dbError: string | null = null;
  try {
    const all = await listBlogs({ limit: 200 });
    counts = all.reduce<Record<string, number>>((acc, b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1;
      return acc;
    }, {});
    recent = all.slice(0, 8);
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database unavailable.";
  }

  const statuses = [
    "draft", "generated", "review", "approved", "scheduled",
    "published", "archived", "rejected", "failed",
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-[#5D1F13]">
          Overview
        </h1>
        <Link
          href="/admin/blogs/new"
          className="rounded-full bg-[#5D1F13] px-5 py-2.5 text-sm font-bold text-[#F5EFE6] transition-colors hover:bg-[#4A1811]"
        >
          + New Article
        </Link>
      </div>

      {dbError ? (
        <p className="mt-6 rounded-lg border border-[#A8532B]/40 bg-[#A8532B]/10 px-4 py-3 text-sm text-[#5D1F13]">
          Database unavailable: {dbError}
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {statuses.map((s) => (
              <Link
                key={s}
                href={`/admin/blogs?status=${s}`}
                className="rounded-xl border border-black/[0.08] bg-white px-3 py-4 text-center transition-colors hover:border-[#A8532B]/40"
              >
                <p className="font-display text-2xl font-semibold text-[#5D1F13]">
                  {counts[s] ?? 0}
                </p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#1A1A1A]/50">
                  {s}
                </p>
              </Link>
            ))}
          </div>

          <h2 className="mt-10 font-display text-xl font-semibold text-[#5D1F13]">
            Recently updated
          </h2>
          <ul className="mt-4 divide-y divide-black/[0.06] rounded-xl border border-black/[0.08] bg-white">
            {recent.length === 0 && (
              <li className="px-4 py-6 text-sm text-[#1A1A1A]/55">
                No articles yet — create the first one.
              </li>
            )}
            {recent.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/blogs/${b.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-[#F3EDE5]"
                >
                  <span className="font-semibold text-[#1A1A1A]">{b.title}</span>
                  <span className="shrink-0 rounded-full bg-[#5D1F13]/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#5D1F13]">
                    {b.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
