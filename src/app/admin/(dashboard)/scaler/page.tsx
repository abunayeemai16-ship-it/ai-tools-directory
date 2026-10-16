import type { Metadata } from "next";
import { CatalogScaler } from "@/components/admin/CatalogScaler";
import {
  catalogProgress,
  remainingCatalogEntries,
} from "@/lib/data/catalog";
import { listAllTools, listCategories } from "@/lib/db";
import { hasUsableGeminiKey } from "@/lib/gemini";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Bulk Catalog Scaler",
};

export default async function ScalerPage() {
  await live();
  const [categories, tools, geminiReady] = await Promise.all([
    listCategories(),
    listAllTools(),
    hasUsableGeminiKey(),
  ]);
  const remaining = remainingCatalogEntries(tools);
  const remainingByCategory = Object.fromEntries(
    categories.map((item) => [item.slug, remainingCatalogEntries(tools, item.slug).length]),
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Catalog</p>
        <h1 className="mt-1 font-serif text-3xl">5000-Tool Catalog Scaler</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Seed the next 25, 50, 500, or remaining tools up to 5000 from the product
          library. Choose Ready Drafts or publish live.
        </p>
      </div>
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
