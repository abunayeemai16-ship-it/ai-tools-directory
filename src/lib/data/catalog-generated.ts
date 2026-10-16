import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { CatalogEntry } from "@/lib/data/catalog-types";
import { packFor } from "@/lib/data/expand-catalog";
import type { PricingModel } from "@/lib/types";
import { slugify } from "@/lib/utils";

const LEFT = [
  "Aether", "Amber", "Apex", "Arbor", "Beacon", "Boreal", "Bright", "Cedar",
  "Cinder", "Cobalt", "Copper", "Cove", "Crimson", "Delta", "Dune", "Echo",
  "Ember", "Fable", "Fern", "Flare", "Flint", "Flux", "Forge", "Frost",
  "Gale", "Glint", "Grove", "Harbor", "Haven", "Helio", "Hollow", "Ivory",
  "Jade", "Keel", "Kite", "Lagoon", "Lumen", "Maple", "Mesa", "Mirth",
  "Moss", "Nimbus", "North", "Nova", "Oak", "Orbit", "Onyx", "Opal",
  "Pine", "Pixel", "Plain", "Prism", "Quarry", "Quill", "Ridge", "River",
  "Sage", "Sand", "Sable", "Shale", "Sierra", "Sol", "Spark", "Spruce",
  "Summit", "Tide", "Torch", "Vale", "Vela", "Verdant", "Volt", "Willow",
  "Wind", "Yield", "Zenith", "Zephyr", "Alloy", "Arc", "Bloom", "Bramble",
];

const RIGHT = [
  "Stack", "Pulse", "Grid", "Nest", "Lane", "Studio", "Desk", "Craft",
  "Works", "Labs", "Logic", "Metric", "Pilot", "Relay", "Scope", "Signal",
  "Sketch", "Span", "Spark", "Ledger", "Layer", "Memo", "Node", "Orbit",
  "Panel", "Path", "Port", "Quest", "Radar", "Range", "Route", "Scale",
  "Shift", "Site", "Slope", "Sparkle", "Sprite", "Stage", "Stamp", "State",
  "Swift", "Task", "Trail", "Vault", "Vector", "Venue", "Verse", "Vista",
  "Wave", "Width", "Wire", "Yard", "Yields", "Agent", "Atlas", "Bridge",
  "Canvas", "Cast", "Chain", "Chart", "Click", "Cloud", "Cluster", "Coach",
  "Column", "Compass", "Console", "Core", "Crew", "Cube", "Current", "Deck",
];

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
        website: `https://${slug}.ai`,
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
