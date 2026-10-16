export const HOMEPAGE_FEATURED = {
  id: "homepage-featured-1",
  name: "Homepage Featured – Position 1",
  price: 149,
  currency: "USD",
  days: 30,
} as const;

export const ADVERTISE_LIMITS = {
  toolName: 60,
  headline: 80,
  description: 160,
} as const;

export type AdvertiseOrderInput = {
  toolName: string;
  website: string;
  headline: string;
  description: string;
  email: string;
};

export type AdvertiseAvailability = {
  available: boolean;
  /** ISO date the current booking ends, when known. */
  nextOpening: string | null;
};

export type AdvertiseStats = {
  publishedTools: number;
  categories: number;
  pageviews30d: number;
  visitors30d: number;
  topCountries: string[];
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function parseAdvertiseOrder(raw: unknown): AdvertiseOrderInput | string {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string).trim() : "");
  const input = {
    toolName: text("toolName"),
    website: text("website"),
    headline: text("headline"),
    description: text("description"),
    email: text("email"),
  };
  if (!input.toolName) return "Tool name is required.";
  if (input.toolName.length > ADVERTISE_LIMITS.toolName) return "Tool name is too long.";
  if (!isHttpUrl(input.website)) return "Enter a valid website URL starting with https://.";
  if (!input.headline) return "Headline is required.";
  if (input.headline.length > ADVERTISE_LIMITS.headline) return "Headline is too long.";
  if (input.description.length > ADVERTISE_LIMITS.description) return "Description is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "Enter a valid contact email.";
  return input;
}
