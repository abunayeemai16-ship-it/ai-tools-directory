import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { hasAdminSession } from "@/lib/admin-auth";
import { listDrafts } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await live();
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
  const drafts = await listDrafts();

  return (
    <div className="flex min-h-full flex-col bg-ink lg:flex-row">
      <AdminSidebar initialDraftCount={drafts.count} />
      <div className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</div>
    </div>
  );
}
