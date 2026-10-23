import type { ReactNode } from "react";

/**
 * /admin base layout — branding shell only. Protection lives in
 * middleware.ts and the (dash) layout; /admin/login renders here too
 * and must stay outside the authenticated chrome.
 */
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#F5EFE6]">{children}</div>;
}
