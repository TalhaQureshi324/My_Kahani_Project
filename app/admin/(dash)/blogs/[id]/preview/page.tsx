import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogById } from "@/lib/blog";
import { markdownToHtml } from "@/lib/blog-render";

/**
 * Protected draft preview — renders the article exactly as the public
 * page will, but lives under /admin (middleware + role gated), so
 * unpublished content is never exposed at a guessable public URL.
 */
export default async function BlogPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const blog = await getBlogById(id).catch(() => null);
  if (!blog) notFound();

  const html = markdownToHtml(blog.content);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/admin/blogs/${id}`}
        className="text-sm font-semibold text-[#A8532B] hover:underline"
      >
        ← Back to editor
      </Link>
      <p className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
        Preview — status: {blog.status} (not public)
      </p>

      <article className="mt-6 rounded-2xl border border-black/[0.08] bg-white p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A8532B]">
          {blog.category ?? "Guidance"}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-[#5D1F13]">
          {blog.title}
        </h1>
        {blog.featured_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blog.featured_image}
            alt={blog.featured_image_alt ?? blog.title}
            className="mt-6 aspect-[16/9] w-full rounded-xl bg-[#F3EDE5] object-cover"
          />
        )}
        <div
          className="prose-blog mt-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </div>
  );
}
