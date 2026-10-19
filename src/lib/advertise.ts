/** Defaults until the admin saves Sponsored placement settings. */
export const HOMEPAGE_FEATURED = {
  id: "homepage-featured-1",
  name: "Homepage Featured – Position 1",
  price: 149,
  currency: "USD",
  days: 30,
} as const;

export const SPONSORED_LIMITS = {
  minPrice: 1,
  maxPrice: 10_000,
  minDays: 1,
  maxDays: 365,
  name: 80,
} as const;

export type SponsoredPlacement = { name: string; price: number; days: number };

type SponsoredSettings = {
  sponsoredName?: unknown;
  sponsoredPrice?: unknown;
  sponsoredDays?: unknown;
};

function inRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

/** Stored settings with out-of-range or missing values replaced by the defaults. */
export function sponsoredPlacement(settings?: SponsoredSettings | null): SponsoredPlacement {
  const name = typeof settings?.sponsoredName === "string" ? settings.sponsoredName.trim() : "";
  const price = Math.round(Number(settings?.sponsoredPrice) * 100) / 100;
  const days = Number(settings?.sponsoredDays);
  return {
    name: name.slice(0, SPONSORED_LIMITS.name) || HOMEPAGE_FEATURED.name,
    price: inRange(price, SPONSORED_LIMITS.minPrice, SPONSORED_LIMITS.maxPrice)
      ? price
      : HOMEPAGE_FEATURED.price,
    days:
      Number.isInteger(days) && inRange(days, SPONSORED_LIMITS.minDays, SPONSORED_LIMITS.maxDays)
        ? days
        : HOMEPAGE_FEATURED.days,
  };
}

export function parseSponsoredPlacement(raw: unknown): SponsoredPlacement | string {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price);
  const days = Number(body.days);
  if (!inRange(price, SPONSORED_LIMITS.minPrice, SPONSORED_LIMITS.maxPrice)) {
    return `Price must be between $${SPONSORED_LIMITS.minPrice} and $${SPONSORED_LIMITS.maxPrice.toLocaleString("en-US")}.`;
  }
  if (Math.abs(Math.round(price * 100) - price * 100) > 1e-6) {
    return "Price can have at most two decimals.";
  }
  if (!Number.isInteger(days) || !inRange(days, SPONSORED_LIMITS.minDays, SPONSORED_LIMITS.maxDays)) {
    return `Duration must be a whole number of days from ${SPONSORED_LIMITS.minDays} to ${SPONSORED_LIMITS.maxDays}.`;
  }
  if (name.length > SPONSORED_LIMITS.name) return "Placement name is too long.";
  return { name: name || HOMEPAGE_FEATURED.name, price: Math.round(price * 100) / 100, days };
}

/** "$149" or "$149.50". */
export function formatUsd(price: number) {
  return `$${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

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
