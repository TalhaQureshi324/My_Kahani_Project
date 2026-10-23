import type { Metadata } from "next";
import Link from "next/link";
import { listPublished } from "@/lib/blog";
import { site } from "@/lib/site";

/**
 * /blog — public listing (spec section 2). Server-rendered from the
 * CMS with ISR; drafts never appear. Pagination via ?page=N.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog — Grounded Guidance & Personal Growth",
  description:
    "Practical articles on personal growth, relationships, parenting, and career — honest guidance from True Self Me coaching.",
  alternates: { canonical: `${site.url}/blog` },
  openGraph: {
    title: "True Self Me Blog",
    description:
      "Practical articles on personal growth, relationships, parenting, and career.",
    url: `${site.url}/blog`,
    siteName: "True Self Me",
    type: "website",
  },
};

const PAGE_SIZE = 9;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  let items: Awaited<ReturnType<typeof listPublished>>["items"] = [];
  let total = 0;
  try {
    ({ items, total } = await listPublished({ page, pageSize: PAGE_SIZE }));
  } catch {
    // CMS not connected yet — render the empty state rather than 500ing.
  }
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-[#F5EFE6] px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A8532B]">
          True Self Me
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[#5D1F13] sm:text-5xl">
          The True Self Me Journal
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#1A1A1A]/70">
          Grounded guidance on personal growth, relationships, parenting,
          and meaningful work — written for real life, not perfection.
        </p>

        {items.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-black/[0.08] bg-white px-6 py-16 text-center">
            <p className="font-display text-2xl text-[#5D1F13]">
              New articles are on the way
            </p>
            <p className="mt-3 text-sm text-[#1A1A1A]/60">
              We&apos;re preparing the first series for this journal. In the
              meantime, explore our coaching programs.
            </p>
            <Link
              href="/#coaching-services"
              className="mt-6 inline-flex rounded-full bg-[#5D1F13] px-6 py-3 text-sm font-bold text-[#F5EFE6] transition-colors hover:bg-[#4A1811]"
            >
              Explore Coaching
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((post) => (
                <article
                  key={post.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_10px_30px_-18px_rgba(93,31,19,0.35)] transition-transform duration-200 hover:-translate-y-1"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    {post.featured_image ? (
                      // CMS images are external URLs by nature — plain img
                      // keeps arbitrary media hosts working without
                      // next.config remotePatterns coupling.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featured_image}
                        alt={post.featured_image_alt ?? post.title}
                        loading="lazy"
                        className="aspect-[16/9] w-full bg-[#F3EDE5] object-cover"
                      />
                    ) : (
                      <div className="aspect-[16/9] w-full bg-[#F3EDE5]" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A8532B]">
                      {post.category ?? "Guidance"}
                      <span className="ml-2 font-medium normal-case tracking-normal text-[#1A1A1A]/45">
                        {formatDate(post.published_at)}
                      </span>
                    </p>
                    <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-[#5D1F13]">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="transition-colors group-hover:text-[#A8532B]"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#1A1A1A]/65">
                      {post.excerpt ?? ""}
                    </p>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="mt-4 inline-flex self-start text-sm font-bold text-[#A8532B] underline-offset-4 hover:underline"
                    >
                      Read article →
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Blog pages"
                className="mt-12 flex items-center justify-center gap-2"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={n === 1 ? "/blog" : `/blog?page=${n}`}
                    aria-current={n === page ? "page" : undefined}
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                      n === page
                        ? "bg-[#A8532B] text-white"
                        : "border border-black/[0.08] bg-white text-[#1A1A1A] hover:bg-[#EAE2D7]"
                    }`}
                  >
                    {n}
                  </Link>
                ))}
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
