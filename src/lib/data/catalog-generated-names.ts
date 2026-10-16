import { slugify } from "@/lib/utils";

export const GENERATED_LEFT = [
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

export const GENERATED_RIGHT = [
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

const LEFT_SET = new Set(GENERATED_LEFT);
const RIGHT_SET = new Set(GENERATED_RIGHT);

export function generatedCatalogWebsite(name: string) {
  return `https://${slugify(name)}.ai`;
}

/** Generated library rows point at placeholder `.ai` domains, not real vendor sites. */
export function isGeneratedCatalogTool(name: string, website: string) {
  const [left, right, ...rest] = name.trim().split(/\s+/);
  if (!left || !right || rest.length) return false;
  if (!LEFT_SET.has(left) || !RIGHT_SET.has(right)) return false;
  return website.replace(/\/+$/, "") === generatedCatalogWebsite(name);
}
