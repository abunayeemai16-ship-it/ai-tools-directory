import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { hasAdminSession } from "@/lib/admin-auth";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin login",
};

export default async function AdminLoginPage() {
  await live();
  if (await hasAdminSession()) {
    redirect("/admin");
  }
  return <AdminLoginForm />;
}
