import BlogEditor from "@/components/admin/BlogEditor";
import { getAdminSession } from "@/lib/admin-auth";

export default async function NewBlogPage() {
  const session = await requireSession();
  return <BlogEditor blog={null} role={session.role} />;
}

async function requireSession() {
  const session = await getAdminSession();
  if (!session) throw new Error("Not authenticated.");
  return session;
}
