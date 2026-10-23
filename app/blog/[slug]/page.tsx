import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedBySlug, getRelated } from "@/lib/blog";
import { markdownExcerpt, markdownToHtml } from "@/lib/blog-render";
import { site } from "@/lib/site";

/**
 * /blog/[slug] — public article page (spec sections 2-3). Server-
 * rendered from the CMS with ISR; one H1, semantic structure,
 * Article + BreadcrumbList JSON-LD, canonical, OpenGraph, related
 * articles, and the standard True Self Me booking CTA.
 */

export const revalidate = 300;
export const dynamicParams = true;

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug).catch(() => null);
  if (!post) return { title: "Article not found" };

  const title = post.meta_title ?? post.title;
  const description =
    post.meta_description ?? post.excerpt ?? markdownExcerpt(post.content);
  const canonical = post.canonical_url ?? `${site.url}/blog/${post.slug}`;
  const ogImage = post.og_image ?? post.featured_image ?? undefined;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.og_title ?? title,
      description: post.og_description ?? description,
      url: canonical,
      siteName: "True Self Me",
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: post.author ? [post.author] : undefined,
      tags: post.tags.length ? post.tags : undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.og_title ?? title,
      description: post.og_description ?? description,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedBySlug(slug).catch(() => null);
  if (!post) notFound();

  const related = await getRelated(post).catch(() => []);
  const html = markdownToHtml(post.content);
  const canonical = post.canonical_url ?? `${site.url}/blog/${post.slug}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": post.schema_type || "Article",
    headline: post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    image: post.og_image ?? post.featured_image ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "True Self Me",
      url: site.url,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    keywords: [post.primary_keyword, ...post.secondary_keywords]
      .filter(Boolean)
      .join(", "),
    articleSection: post.category ?? undefined,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${site.url}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F5EFE6] px-4 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <article className="mx-auto max-w-3xl">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1A1A1A]/50">
          <Link href="/" className="hover:text-[#A8532B]">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-[#A8532B]">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-[#A8532B]">{post.category ?? "Article"}</span>
        </nav>

        <header className="mt-6">
          <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-[#5D1F13] sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#1A1A1A]/55">
            {post.author && <span className="font-semibold text-[#1A1A1A]/75">{post.author}</span>}
            {post.published_at && (
              <span>
                Published {formatDate(post.published_at)}
              </span>
            )}
            {post.updated_at && post.published_at &&
              new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86400000 && (
                <span>· Updated {formatDate(post.updated_at)}</span>
              )}
          </p>
        </header>

        {post.featured_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featured_image}
            alt={post.featured_image_alt ?? post.title}
            className="mt-8 aspect-[16/9] w-full rounded-2xl bg-[#F3EDE5] object-cover"
          />
        )}

        {/* Article body — markdown sanitized in lib/blog-render */}
        <div
          className="prose-blog mt-10"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Booking CTA (site identity, not a generic blog box) */}
        <aside className="mt-14 rounded-2xl bg-[#5D1F13] px-6 py-8 text-center sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#E8C9A0]">
            True Self Me
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-[#F5EFE6] sm:text-3xl">
            Ready to talk it through with someone?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#F5EFE6]/75">
            Book a private virtual session — grounded, pressure-free
            coaching built around your goals.
          </p>
          <Link
            href="/#book"
            className="mt-6 inline-flex rounded-full bg-[#A8532B] px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#8F4423]"
          >
            Book a Session
          </Link>
        </aside>

        {/* Related articles (internal linking, spec section 6/58) */}
        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold text-[#5D1F13]">
              Keep reading
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {related.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/blog/${rel.slug}`}
                  className="group rounded-xl border border-black/[0.08] bg-white p-4 transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(93,31,19,0.4)]"
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A8532B]">
                    {rel.category ?? "Guidance"}
                  </p>
                  <p className="mt-2 font-display text-base font-semibold leading-snug text-[#5D1F13] group-hover:text-[#A8532B]">
                    {rel.title}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#1A1A1A]/60">
                    {rel.excerpt ?? ""}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
