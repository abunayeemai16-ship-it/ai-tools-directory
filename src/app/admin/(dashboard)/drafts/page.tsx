import type { Metadata } from "next";
import { ReadyDrafts } from "@/components/admin/ReadyDrafts";
import { listCategories, listDrafts } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Ready Drafts",
};

export default async function DraftsPage() {
  await live();
  const [initial, categories] = await Promise.all([listDrafts(), listCategories()]);
  return <ReadyDrafts initial={initial} categories={categories} />;
}
