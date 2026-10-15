import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { listAllTools, listCategories } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Categories",
};

export default async function CategoriesPage() {
  await live();
  const [categories, tools] = await Promise.all([listCategories(), listAllTools()]);
  return (
    <CategoriesManager
      initial={categories.map((item) => ({
        ...item,
        toolCount: tools.filter((tool) => tool.category === item.slug).length,
      }))}
    />
  );
}
