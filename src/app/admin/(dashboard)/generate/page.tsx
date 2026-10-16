import type { Metadata } from "next";
import { CatalogScaler } from "@/components/admin/CatalogScaler";
import { GeneratorStudio } from "@/components/admin/GeneratorStudio";
import {
  catalogProgress,
  remainingCatalogEntries,
} from "@/lib/data/catalog";
import { listAllTools, listCategories } from "@/lib/db";
import { hasUsableGeminiKey } from "@/lib/gemini";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "AI Auto-Generator Studio",
};

export default async function GeneratePage() {
  await live();
  const [categories, tools, geminiReady] = await Promise.all([
    listCategories().catch(() => []),
    listAllTools().catch(() => []),
    hasUsableGeminiKey().catch(() => false),
  ]);
  const remaining = remainingCatalogEntries(tools);
  const remainingByCategory = Object.fromEntries(
    categories.map((item) => [item.slug, remainingCatalogEntries(tools, item.slug).length]),
  );
  return (
    <div className="space-y-8">
      <GeneratorStudio />
      <CatalogScaler
        categories={categories}
        initialProgress={catalogProgress(tools)}
        initialPreview={remaining.slice(0, 24).map((entry) => ({
          name: entry.name,
          category: entry.category,
          website: entry.website,
        }))}
        initialRemainingByCategory={remainingByCategory}
        initialGeminiReady={geminiReady}
      />
    </div>
  );
}
