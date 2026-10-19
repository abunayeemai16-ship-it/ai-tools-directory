import type { ComparisonRow } from "@/lib/types";

export const COMPARE_LIMITS = { nameMin: 2, nameMax: 60 } as const;

export type WebSource = { title: string; url: string };

/** What visitors see for a live web-researched comparison. */
export type LiveComparisonResult = {
  toolA: string;
  toolB: string;
  websiteA: string;
  websiteB: string;
  tagline: string;
  verdict: string;
  overallWinner: "a" | "b" | "tie";
  rows: ComparisonRow[];
  sources: WebSource[];
  /** Google Search suggestions HTML that grounded Gemini answers must be shown with. */
  searchSuggestions: string;
  createdAt: string;
};

/** Case, spacing, and punctuation-insensitive key: "Jasper AI", "jasper-ai", "JasperAI" match. */
export function normalizeToolName(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/** Lookup keys for a name: "Perplexity AI" also answers to "Perplexity", and vice versa. */
function nameKeys(value: string) {
  const key = normalizeToolName(value);
  return key.endsWith("ai") && key.length > 4 ? [key, key.slice(0, -2)] : [key];
}

/** Finds a tool by name or slug; exact matches win over "AI"-suffix matches. */
export function toolFinder<T extends { name: string; slug: string }>(tools: T[]) {
  const exact = new Map<string, T>();
  const loose = new Map<string, T>();
  for (const tool of tools) {
    for (const value of [tool.slug, tool.name]) {
      const [key, short] = nameKeys(value);
      exact.set(key, tool);
      if (short && !loose.has(short)) loose.set(short, tool);
    }
  }
  return (query: string) => {
    const keys = nameKeys(query);
    for (const key of keys) {
      const hit = exact.get(key);
      if (hit) return hit;
    }
    return keys.map((key) => loose.get(key)).find(Boolean);
  };
}

function cleanName(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function parseCompareNames(rawA: unknown, rawB: unknown): { a: string; b: string } | string {
  const a = cleanName(rawA);
  const b = cleanName(rawB);
  if (!a || !b) return "Enter two AI tool names.";
  for (const name of [a, b]) {
    if (name.length < COMPARE_LIMITS.nameMin || name.length > COMPARE_LIMITS.nameMax) {
      return `Tool names must be ${COMPARE_LIMITS.nameMin} to ${COMPARE_LIMITS.nameMax} characters.`;
    }
    if (!/^[\p{L}\p{N} .,&+'’()!-]+$/u.test(name) || !normalizeToolName(name)) {
      return `"${name}" contains characters we can't search for.`;
    }
  }
  if (normalizeToolName(a) === normalizeToolName(b)) return "Pick two different tools.";
  return { a, b };
}
