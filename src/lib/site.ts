export const DEFAULT_HOME_TITLE = "Forge — AI Tools & Tech Review Directory";
export const DEFAULT_HOME_DESCRIPTION =
  "Independent AI tool reviews, VS comparisons, coupons, and affiliate deals across 20 AI and SaaS categories.";

export function normalizeDomain(value?: string) {
  return (value || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
}

export const SITE_URL = `https://${
  normalizeDomain(process.env.NEXT_PUBLIC_SITE_URL) || "www.aitooldirectory.online"
}`;

export function siteOrigin(domain?: string) {
  const host = normalizeDomain(domain);
  if (!host) return SITE_URL;
  return `https://${host}`;
}

export function isLocalOrUnsetDomain(domain?: string) {
  const host = normalizeDomain(domain);
  return !host || host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1";
}

export function hostnameMatches(resultUrl: string, domain?: string) {
  const host = normalizeDomain(domain);
  if (!host) return false;
  try {
    const url = new URL(resultUrl);
    return url.hostname === host || url.hostname.endsWith(`.${host}`);
  } catch {
    return false;
  }
}

export function wordCount(text?: string) {
  return (text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}
