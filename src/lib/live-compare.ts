import { createHash } from "node:crypto";
import { normalizeToolName, toolFinder, type LiveComparisonResult } from "@/lib/compare";
import {
  hasPublicGeminiKey,
  researchComparisonOnWeb,
  type WebResearchedComparison,
} from "@/lib/gemini";
import type { ComparisonRow, Tool } from "@/lib/types";

const KIND = "live_compare";
const RATE_KIND = "compare_rate";
const CACHE_MS = 7 * 86_400_000;
const PER_IP_PER_HOUR = 5;
const DAILY_LIMIT = 200;

export function liveCompareEnabled() {
  return hasPublicGeminiKey();
}

export type LiveCompareStatus = "new" | "drafted" | "dismissed";

export type LiveComparisonRecord = WebResearchedComparison & {
  key: string;
  askedA: string;
  askedB: string;
  createdAt: string;
  requests: number;
  status: LiveCompareStatus;
};

export class LiveCompareError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function usesPostgres() {
  return Boolean((process.env.DATABASE_URL || process.env.POSTGRES_URL || "").trim());
}

async function pgStore() {
  return import("./postgres-store");
}

/** Local file-store mode keeps these in memory; production always runs on Postgres. */
const memory = new Map<string, { at: string; data: unknown }>();

async function readRecord(key: string) {
  if (usesPostgres()) return (await pgStore()).readRecord<LiveComparisonRecord>(KIND, key);
  return (memory.get(`${KIND}:${key}`)?.data as LiveComparisonRecord | undefined) ?? null;
}

async function writeRecord(record: LiveComparisonRecord) {
  if (usesPostgres()) return (await pgStore()).writeRecord(KIND, record.key, record.createdAt, record);
  memory.set(`${KIND}:${record.key}`, { at: record.createdAt, data: record });
}

async function countRequest(id: string, at: string) {
  if (usesPostgres()) return (await pgStore()).incrementCounter(RATE_KIND, id, at);
  const entry = memory.get(`${RATE_KIND}:${id}`);
  const n = ((entry?.data as { n?: number } | undefined)?.n ?? 0) + 1;
  memory.set(`${RATE_KIND}:${id}`, { at, data: { n } });
  return n;
}

function pairKey(a: string, b: string) {
  return [normalizeToolName(a), normalizeToolName(b)].sort().join(":");
}

function swap(side: "a" | "b" | "tie") {
  return side === "a" ? "b" : side === "b" ? "a" : "tie";
}

/** Records keep the order of the first request; a reversed request gets the columns flipped. */
function orient(record: LiveComparisonRecord, firstName: string): LiveComparisonRecord {
  if (normalizeToolName(firstName) !== normalizeToolName(record.askedB)) return record;
  return {
    ...record,
    toolA: record.toolB,
    toolB: record.toolA,
    websiteA: record.websiteB,
    websiteB: record.websiteA,
    overallWinner: swap(record.overallWinner),
    rows: record.rows.map(
      (row): ComparisonRow => ({ feature: row.feature, a: row.b, b: row.a, winner: swap(row.winner) }),
    ),
  };
}

function toPublic(record: LiveComparisonRecord): LiveComparisonResult {
  return {
    toolA: record.toolA,
    toolB: record.toolB,
    websiteA: record.websiteA,
    websiteB: record.websiteB,
    tagline: record.tagline,
    verdict: record.verdict,
    overallWinner: record.overallWinner,
    rows: record.rows,
    sources: record.sources,
    searchSuggestions: record.searchSuggestions,
    createdAt: record.createdAt,
  };
}

export function clientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function hashIp(ip: string) {
  return createHash("sha256")
    .update(`forge-compare|${process.env.DATABASE_URL || ""}|${ip}`)
    .digest("hex")
    .slice(0, 24);
}

function dailyLimit() {
  const configured = Number(process.env.LIVE_COMPARE_DAILY_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? configured : DAILY_LIMIT;
}

async function enforceLimits(ip: string) {
  const now = new Date();
  const at = now.toISOString();
  const perIp = await countRequest(`ip:${hashIp(ip)}:${at.slice(0, 13)}`, at);
  if (perIp > PER_IP_PER_HOUR) {
    throw new LiveCompareError(
      `You've run ${PER_IP_PER_HOUR} live comparisons this hour. Please try again later, or pick a matchup from the comparison hub.`,
      429,
    );
  }
  const today = await countRequest(`day:${at.slice(0, 10)}`, at);
  if (today > dailyLimit()) {
    throw new LiveCompareError(
      "Live comparisons have reached today's limit. Please try again tomorrow.",
      429,
    );
  }
  if (usesPostgres() && Math.random() < 0.05) {
    const cutoff = new Date(now.getTime() - 2 * 86_400_000).toISOString();
    await (await pgStore()).deleteRecordsBefore(RATE_KIND, cutoff).catch(() => undefined);
  }
}

export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstile(token: string, ip: string) {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY?.trim() || "",
      response: token,
      remoteip: ip,
    }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  const data = (await res?.json().catch(() => ({}))) as { success?: boolean } | undefined;
  return Boolean(data?.success);
}

/**
 * Cached for a week per pair (either order). Only cache misses count against the limits,
 * and rejected names are cached too so repeats cost nothing.
 */
export async function liveComparison(a: string, b: string, ip: string) {
  const key = pairKey(a, b);
  const existing = await readRecord(key);
  if (existing && Date.now() - Date.parse(existing.createdAt) < CACHE_MS) {
    if (!existing.valid) throw new LiveCompareError(existing.reason, 422);
    return { result: toPublic(orient(existing, a)), cached: true, key };
  }
  if (!liveCompareEnabled()) {
    throw new LiveCompareError("Live web comparisons are not available yet.", 503);
  }
  await enforceLimits(ip);
  let researched: WebResearchedComparison;
  try {
    researched = await researchComparisonOnWeb(a, b);
  } catch (error) {
    console.error("[compare] web research failed", error);
    throw new LiveCompareError(
      "We couldn't research this matchup right now. Please try again in a few minutes.",
      502,
    );
  }
  const record: LiveComparisonRecord = {
    ...researched,
    key,
    askedA: a,
    askedB: b,
    createdAt: new Date().toISOString(),
    requests: (existing?.requests ?? 0) + 1,
    status: existing?.status === "dismissed" ? "dismissed" : "new",
  };
  await writeRecord(record);
  if (!record.valid) throw new LiveCompareError(record.reason, 422);
  return { result: toPublic(orient(record, a)), cached: false, key };
}

/** Repeat requests served from cache, shown to the admin as demand. */
export async function countRepeatRequest(key: string) {
  if (usesPostgres()) {
    await (await pgStore()).incrementRecordField(KIND, key, "requests");
    return;
  }
  const record = await readRecord(key);
  if (record) await writeRecord({ ...record, requests: record.requests + 1 });
}

export async function listLiveComparisons(limit = 200) {
  if (usesPostgres()) return (await pgStore()).listRecords<LiveComparisonRecord>(KIND, limit);
  return [...memory.entries()]
    .filter(([id]) => id.startsWith(`${KIND}:`))
    .map(([, entry]) => entry.data as LiveComparisonRecord)
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    .slice(0, limit);
}

export async function getLiveComparison(key: string) {
  return readRecord(key);
}

export async function setLiveComparisonStatus(key: string, status: LiveCompareStatus) {
  if (usesPostgres()) {
    return (await pgStore()).mergeRecord<LiveComparisonRecord>(KIND, key, { status });
  }
  const record = await readRecord(key);
  if (!record) return null;
  const next = { ...record, status };
  await writeRecord(next);
  return next;
}

export async function deleteLiveComparison(key: string) {
  if (usesPostgres()) return (await pgStore()).deleteRecord(KIND, key);
  memory.delete(`${KIND}:${key}`);
}

type DirectoryTool = Pick<Tool, "slug" | "name">;

/** Directory tools matching each side of a record, by the researched or the typed name. */
export function directoryMatches(record: LiveComparisonRecord, tools: DirectoryTool[]) {
  const findTool = toolFinder(tools);
  const find = (...names: string[]) => names.map(findTool).find(Boolean) ?? null;
  return { a: find(record.toolA, record.askedA), b: find(record.toolB, record.askedB) };
}
