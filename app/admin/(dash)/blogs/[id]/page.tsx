import { notFound } from "next/navigation";
import BlogEditor from "@/components/admin/BlogEditor";
import { getAdminSession } from "@/lib/admin-auth";
import { getBlogById } from "@/lib/blog";

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, blog] = await Promise.all([
    getAdminSession(),
    getBlogById(id).catch(() => null),
  ]);
  if (!session) throw new Error("Not authenticated.");
  if (!blog) notFound();

  return (
    <BlogEditor
      blog={{
        id: blog.id,
        created_at: blog.created_at,
        title: blog.title,
        slug: blog.slug,
        excerpt: blog.excerpt,
        content: blog.content,
        featured_image: blog.featured_image,
        featured_image_alt: blog.featured_image_alt,
        author: blog.author,
        category: blog.category,
        tags: blog.tags,
        content_pillar: blog.content_pillar,
        primary_keyword: blog.primary_keyword,
        secondary_keywords: blog.secondary_keywords,
        search_intent: blog.search_intent,
        content_cluster: blog.content_cluster,
        meta_title: blog.meta_title,
        meta_description: blog.meta_description,
        canonical_url: blog.canonical_url,
        og_title: blog.og_title,
        og_description: blog.og_description,
        og_image: blog.og_image,
        status: blog.status,
        scheduled_at: blog.scheduled_at,
        published_at: blog.published_at,
      }}
      role={session.role}
    />
  );
}
