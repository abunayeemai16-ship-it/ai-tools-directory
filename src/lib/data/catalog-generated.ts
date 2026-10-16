import { DEFAULT_CATEGORIES } from "@/lib/categories";
import {
  GENERATED_LEFT as LEFT,
  GENERATED_RIGHT as RIGHT,
  generatedCatalogWebsite,
} from "@/lib/data/catalog-generated-names";
import type { CatalogEntry } from "@/lib/data/catalog-types";
import { packFor } from "@/lib/data/expand-catalog";
import type { PricingModel } from "@/lib/types";
import { slugify } from "@/lib/utils";

const MODELS: PricingModel[] = ["Freemium", "Paid", "Freemium", "Paid", "Free"];

export function generatedCatalogEntries(need: number, taken: Set<string>): CatalogEntry[] {
  if (need <= 0) return [];
  const categories = DEFAULT_CATEGORIES.map((item) => item.slug);
  const out: CatalogEntry[] = [];
  let catIndex = 0;

  for (const left of LEFT) {
    for (const right of RIGHT) {
      if (out.length >= need) return out;
      const name = `${left} ${right}`;
      const slug = slugify(name);
      const nameKey = name.toLowerCase();
      if (!slug || taken.has(slug) || taken.has(nameKey)) continue;
      taken.add(slug);
      taken.add(nameKey);
      const category = categories[catIndex % categories.length];
      catIndex += 1;
      const pack = packFor(category);
      const n = out.length;
      out.push({
        name,
        slug,
        website: generatedCatalogWebsite(name),
        category,
        pricingModel: MODELS[n % MODELS.length],
        founded: String(2014 + (n % 12)),
        shortPitch: `${name} helps ${pack.buyer} ${pack.job}.`,
        bestFor: `${pack.buyer.split(",")[0]} evaluating ${name}`,
        job: pack.job,
        skipIf: pack.skipIf,
        features: pack.features,
      });
    }
  }
  return out;
}
