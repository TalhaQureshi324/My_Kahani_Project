import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { listPublishedForSitemap } from "@/lib/blog";

/**
 * Static routes + published CMS articles (spec section 57). Draft,
 * review, rejected, generated, and failed content NEVER appears here.
 * DB failure degrades to static-only rather than failing the build.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPublishedForSitemap();
    blogEntries = posts.map((p) => ({
      url: `${site.url}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {
    blogEntries = [];
  }

  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    // Temporarily excluded (Dad Block pause) — restore when re-enabled:
    // { url: `${site.url}/the-dad-block`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    // { url: `${site.url}/the-dad-block/events`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    ...["coaching-for-dads", "career-coaching", "relationship-coaching"].map(
      (slug) => ({
        url: `${site.url}/${slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.9,
      }),
    ),
    {
      url: `${site.url}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    ...["privacy", "terms"].map((slug) => ({
      url: `${site.url}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...blogEntries,
  ];
}
