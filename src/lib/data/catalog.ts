import { CORE_CATALOG } from "@/lib/data/catalog-core";
import { EXTENDED_CATALOG } from "@/lib/data/catalog-extended";
import { generatedCatalogEntries } from "@/lib/data/catalog-generated";
import type { CatalogEntry, CatalogProgress } from "@/lib/data/catalog-types";
import { catalogSlug, leanToEntry } from "@/lib/data/expand-catalog";
import type { Tool } from "@/lib/types";

export const CATALOG_CAP = 5000;

export function allCatalogEntries(): CatalogEntry[] {
  const seen = new Set<string>();
  const out: CatalogEntry[] = [];
  const push = (entry: CatalogEntry) => {
    const slug = catalogSlug(entry);
    const nameKey = entry.name.trim().toLowerCase();
    if (!slug || seen.has(slug) || seen.has(nameKey)) return;
    seen.add(slug);
    seen.add(nameKey);
    out.push(entry);
  };
  for (const entry of CORE_CATALOG) push(entry);
  for (const row of EXTENDED_CATALOG) push(leanToEntry(row));
  if (out.length < CATALOG_CAP) {
    out.push(...generatedCatalogEntries(CATALOG_CAP - out.length, seen));
  }
  return out;
}

export function remainingCatalogEntries(
  tools: Pick<Tool, "slug" | "name">[],
  category?: string,
): CatalogEntry[] {
  const taken = new Set(
    tools.flatMap((tool) => [tool.slug, tool.name.trim().toLowerCase()]),
  );
  return allCatalogEntries().filter((entry) => {
    if (category && category !== "all" && entry.category !== category) return false;
    const slug = catalogSlug(entry);
    if (taken.has(slug) || taken.has(entry.name.trim().toLowerCase())) return false;
    return true;
  });
}

export function catalogProgress(
  tools: Pick<Tool, "slug" | "name" | "status">[],
): CatalogProgress {
  const librarySize = allCatalogEntries().length;
  const remaining = remainingCatalogEntries(tools).length;
  return {
    librarySize,
    inDatabase: tools.length,
    remaining,
    published: tools.filter((tool) => tool.status !== "draft").length,
    drafts: tools.filter((tool) => tool.status === "draft").length,
    cap: CATALOG_CAP,
  };
}

export { CORE_CATALOG, EXTENDED_CATALOG };
export { expandCatalogEntry, catalogSlug, leanToEntry } from "@/lib/data/expand-catalog";
export type { CatalogEntry, CatalogProgress } from "@/lib/data/catalog-types";
