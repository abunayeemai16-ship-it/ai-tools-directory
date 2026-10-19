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
  maxOfferDays: 365,
} as const;

export type SponsoredOffer = {
  price: number;
  /** ISO time; null starts the offer as soon as it is saved. */
  startsAt: string | null;
  endsAt: string;
};

export type SponsoredPlacement = {
  name: string;
  /** Regular price, shown crossed out while an offer runs. */
  price: number;
  days: number;
  offer: SponsoredOffer | null;
};

type SponsoredSettings = {
  sponsoredName?: unknown;
  sponsoredPrice?: unknown;
  sponsoredDays?: unknown;
  sponsoredOfferPrice?: unknown;
  sponsoredOfferStart?: unknown;
  sponsoredOfferEnd?: unknown;
};

function inRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function hasTwoDecimalsAtMost(value: number) {
  return Math.abs(Math.round(value * 100) - value * 100) <= 1e-6;
}

function isoTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** Offers must undercut the regular price by at least 1% so the badge never reads "0% off". */
function undercuts(offerPrice: number, regular: number) {
  return offerPrice <= regular * 0.99;
}

function storedOffer(settings: SponsoredSettings | null | undefined, regular: number) {
  const price = Math.round(Number(settings?.sponsoredOfferPrice) * 100) / 100;
  const endsAt = isoTime(settings?.sponsoredOfferEnd);
  const startsAt = isoTime(settings?.sponsoredOfferStart);
  if (!inRange(price, SPONSORED_LIMITS.minPrice, SPONSORED_LIMITS.maxPrice)) return null;
  if (!undercuts(price, regular) || !endsAt) return null;
  if (startsAt && Date.parse(startsAt) >= Date.parse(endsAt)) return null;
  return { price, startsAt, endsAt };
}

/** Stored settings with out-of-range or missing values replaced by the defaults. */
export function sponsoredPlacement(settings?: SponsoredSettings | null): SponsoredPlacement {
  const name = typeof settings?.sponsoredName === "string" ? settings.sponsoredName.trim() : "";
  const storedPrice = Math.round(Number(settings?.sponsoredPrice) * 100) / 100;
  const days = Number(settings?.sponsoredDays);
  const price = inRange(storedPrice, SPONSORED_LIMITS.minPrice, SPONSORED_LIMITS.maxPrice)
    ? storedPrice
    : HOMEPAGE_FEATURED.price;
  return {
    name: name.slice(0, SPONSORED_LIMITS.name) || HOMEPAGE_FEATURED.name,
    price,
    days:
      Number.isInteger(days) && inRange(days, SPONSORED_LIMITS.minDays, SPONSORED_LIMITS.maxDays)
        ? days
        : HOMEPAGE_FEATURED.days,
    offer: storedOffer(settings, price),
  };
}

function parseOffer(raw: unknown, regular: number, now: number): SponsoredOffer | string | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const price = Number(body.price);
  if (!inRange(price, SPONSORED_LIMITS.minPrice, SPONSORED_LIMITS.maxPrice)) {
    return `Offer price must be between $${SPONSORED_LIMITS.minPrice} and $${SPONSORED_LIMITS.maxPrice.toLocaleString("en-US")}.`;
  }
  if (!hasTwoDecimalsAtMost(price)) return "Offer price can have at most two decimals.";
  if (!undercuts(price, regular)) {
    return "Offer price must be at least 1% below the regular price.";
  }
  const endsAt = isoTime(body.endsAt);
  if (!endsAt) return "Choose when the offer ends.";
  const end = Date.parse(endsAt);
  if (end <= now) return "The offer end time must be in the future.";
  if (end > now + SPONSORED_LIMITS.maxOfferDays * 86_400_000) {
    return `An offer can end at most ${SPONSORED_LIMITS.maxOfferDays} days from now.`;
  }
  const hasStart = typeof body.startsAt === "string" && body.startsAt.trim() !== "";
  const startsAt = isoTime(body.startsAt);
  if (hasStart && !startsAt) return "The offer start time is not a valid date.";
  if (startsAt && Date.parse(startsAt) >= end) return "The offer must start before it ends.";
  return { price: Math.round(price * 100) / 100, startsAt, endsAt };
}

export function parseSponsoredPlacement(raw: unknown, now = Date.now()): SponsoredPlacement | string {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price);
  const days = Number(body.days);
  if (!inRange(price, SPONSORED_LIMITS.minPrice, SPONSORED_LIMITS.maxPrice)) {
    return `Price must be between $${SPONSORED_LIMITS.minPrice} and $${SPONSORED_LIMITS.maxPrice.toLocaleString("en-US")}.`;
  }
  if (!hasTwoDecimalsAtMost(price)) return "Price can have at most two decimals.";
  if (!Number.isInteger(days) || !inRange(days, SPONSORED_LIMITS.minDays, SPONSORED_LIMITS.maxDays)) {
    return `Duration must be a whole number of days from ${SPONSORED_LIMITS.minDays} to ${SPONSORED_LIMITS.maxDays}.`;
  }
  if (name.length > SPONSORED_LIMITS.name) return "Placement name is too long.";
  const regular = Math.round(price * 100) / 100;
  const offer = parseOffer(body.offer, regular, now);
  if (typeof offer === "string") return offer;
  return { name: name || HOMEPAGE_FEATURED.name, price: regular, days, offer };
}

/** The offer if it is running at `now`, otherwise null. */
export function activeOffer(placement: SponsoredPlacement, now = Date.now()) {
  const { offer } = placement;
  if (!offer) return null;
  if (offer.startsAt && Date.parse(offer.startsAt) > now) return null;
  if (Date.parse(offer.endsAt) <= now) return null;
  return offer;
}

/** What a new order is charged at `now`. */
export function checkoutPrice(placement: SponsoredPlacement, now = Date.now()) {
  return activeOffer(placement, now)?.price ?? placement.price;
}

export function discountPercent(regular: number, offerPrice: number) {
  return Math.round((1 - offerPrice / regular) * 100);
}

/** "2d 05h 12m 40s", or "05h 12m 40s" under a day. */
export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const pad = (value: number) => String(value).padStart(2, "0");
  const clock = `${pad(Math.floor((total % 86_400) / 3600))}h ${pad(Math.floor((total % 3600) / 60))}m ${pad(total % 60)}s`;
  return days > 0 ? `${days}d ${clock}` : clock;
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
