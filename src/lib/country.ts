const TIMEZONE_COUNTRY: Record<string, string> = {
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Bogota": "CO",
  "America/Caracas": "VE",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Mexico_City": "MX",
  "America/New_York": "US",
  "America/Phoenix": "US",
  "America/Santiago": "CL",
  "America/Sao_Paulo": "BR",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Asia/Bangkok": "TH",
  "Asia/Colombo": "LK",
  "Asia/Dhaka": "BD",
  "Asia/Dubai": "AE",
  "Asia/Hong_Kong": "HK",
  "Asia/Jakarta": "ID",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Manila": "PH",
  "Asia/Riyadh": "SA",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Singapore": "SG",
  "Asia/Taipei": "TW",
  "Asia/Tokyo": "JP",
  "Australia/Melbourne": "AU",
  "Australia/Perth": "AU",
  "Australia/Sydney": "AU",
  "Europe/Amsterdam": "NL",
  "Europe/Berlin": "DE",
  "Europe/Brussels": "BE",
  "Europe/Dublin": "IE",
  "Europe/Istanbul": "TR",
  "Europe/Lisbon": "PT",
  "Europe/London": "GB",
  "Europe/Madrid": "ES",
  "Europe/Moscow": "RU",
  "Europe/Paris": "FR",
  "Europe/Rome": "IT",
  "Europe/Stockholm": "SE",
  "Europe/Warsaw": "PL",
  "Pacific/Auckland": "NZ",
};

const COUNTRY_NAMES: Record<string, string> = {
  AE: "United Arab Emirates",
  AR: "Argentina",
  AU: "Australia",
  BD: "Bangladesh",
  BE: "Belgium",
  BR: "Brazil",
  CA: "Canada",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  DE: "Germany",
  EG: "Egypt",
  ES: "Spain",
  FR: "France",
  GB: "United Kingdom",
  HK: "Hong Kong",
  ID: "Indonesia",
  IE: "Ireland",
  IN: "India",
  IT: "Italy",
  JP: "Japan",
  KE: "Kenya",
  KR: "South Korea",
  LK: "Sri Lanka",
  MX: "Mexico",
  MY: "Malaysia",
  NG: "Nigeria",
  NL: "Netherlands",
  NZ: "New Zealand",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PT: "Portugal",
  RU: "Russia",
  SA: "Saudi Arabia",
  SE: "Sweden",
  SG: "Singapore",
  TH: "Thailand",
  TR: "Turkey",
  TW: "Taiwan",
  US: "United States",
  VE: "Venezuela",
  ZA: "South Africa",
  UN: "Unknown",
};

export function countryName(code: string) {
  return COUNTRY_NAMES[code] ?? code;
}

export function countryFromLocale(locale?: string | null) {
  if (!locale) return null;
  const parts = locale.replace("_", "-").split("-");
  const region = parts.find((part) => /^[A-Za-z]{2}$/.test(part) && part === part.toUpperCase())
    ?? parts[1];
  if (region && region.length === 2) return region.toUpperCase();
  return null;
}

export function countryFromTimezone(timezone?: string | null) {
  if (!timezone) return null;
  if (TIMEZONE_COUNTRY[timezone]) return TIMEZONE_COUNTRY[timezone];
  if (timezone.startsWith("America/")) return "US";
  if (timezone.startsWith("Europe/London")) return "GB";
  if (timezone.startsWith("Europe/")) return null;
  if (timezone.startsWith("Asia/Dhaka")) return "BD";
  return null;
}

export function resolveCountry(
  request: Request,
  hints?: { timezone?: string; locale?: string; country?: string },
) {
  const header =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code") ||
    request.headers.get("cloudfront-viewer-country") ||
    request.headers.get("x-appengine-country");

  if (header && header !== "XX" && header !== "T1") {
    return header.toUpperCase().slice(0, 2);
  }

  if (hints?.country && hints.country.length === 2) {
    return hints.country.toUpperCase();
  }

  return (
    countryFromTimezone(hints?.timezone) ||
    countryFromLocale(hints?.locale) ||
    "UN"
  );
}
