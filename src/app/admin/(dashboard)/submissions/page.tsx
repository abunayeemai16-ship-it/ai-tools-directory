import type { Metadata } from "next";
import { SubmissionsManager } from "@/components/admin/SubmissionsManager";
import { listSubmissions } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Tool Submissions",
};

export default async function SubmissionsPage() {
  await live();
  const submissions = await listSubmissions();
  return <SubmissionsManager initial={submissions} />;
}
