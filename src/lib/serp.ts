import { hostnameMatches, isLocalOrUnsetDomain, normalizeDomain } from "@/lib/site";
import type { RankCompetitor, RankSnapshot } from "@/lib/types";

const SKIP_MESSAGE =
  "Site on localhost / Add free Serper API key to check live Google SERP position";

type Organic = { title?: string; link?: string; url?: string };

function organicList(rows: Organic[]): RankCompetitor[] {
  return rows
    .map((row) => ({
      title: row.title || "",
      url: row.link || row.url || "",
    }))
    .filter((row) => row.url);
}

function snapshot(partial: Omit<RankSnapshot, "checkedAt">): RankSnapshot {
  return { ...partial, checkedAt: new Date().toISOString() };
}

export function skippedRank(path: string, keyword: string, reason = SKIP_MESSAGE): RankSnapshot {
  return snapshot({
    path,
    keyword,
    position: null,
    inTop100: false,
    top3: [],
    source: "skipped",
    message: reason,
  });
}

async function serperSearch(apiKey: string, keyword: string): Promise<Organic[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: keyword, gl: "us", hl: "en", num: 100 }),
  });
  const data = (await res.json()) as { organic?: Organic[]; message?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.message || data.error || `Serper ${res.status}`);
  }
  return data.organic ?? [];
}

async function cseSearch(key: string, cx: string, keyword: string): Promise<Organic[]> {
  const rows: Organic[] = [];
  for (let start = 1; start <= 91 && rows.length < 100; start += 10) {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", key);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", keyword);
    url.searchParams.set("num", "10");
    url.searchParams.set("start", String(start));
    url.searchParams.set("gl", "us");
    const res = await fetch(url);
    const data = (await res.json()) as {
      items?: { title?: string; link?: string }[];
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(data.error?.message || `Google CSE ${res.status}`);
    const batch = data.items ?? [];
    if (batch.length === 0) break;
    rows.push(...batch);
  }
  return rows;
}

export async function checkLiveRank(input: {
  path: string;
  keyword: string;
  domain: string;
  serperApiKey?: string;
  googleCseKey?: string;
  googleCseCx?: string;
}): Promise<RankSnapshot> {
  const keyword = input.keyword.trim();
  if (!keyword) {
    return skippedRank(input.path, keyword, "Add a primary target keyword first.");
  }
  if (isLocalOrUnsetDomain(input.domain)) {
    return skippedRank(input.path, keyword);
  }
  if (!input.serperApiKey && !(input.googleCseKey && input.googleCseCx)) {
    return skippedRank(input.path, keyword);
  }

  try {
    let source: RankSnapshot["source"] = "serper";
    let organic: Organic[] = [];
    if (input.serperApiKey) {
      organic = await serperSearch(input.serperApiKey, keyword);
    } else {
      source = "cse";
      organic = await cseSearch(input.googleCseKey || "", input.googleCseCx || "", keyword);
    }
    const list = organicList(organic).slice(0, 100);
    const index = list.findIndex((row) => hostnameMatches(row.url, input.domain));
    return snapshot({
      path: input.path,
      keyword,
      position: index >= 0 ? index + 1 : null,
      inTop100: index >= 0,
      top3: list.slice(0, 3),
      source,
      message:
        index >= 0
          ? `${normalizeDomain(input.domain)} ranks #${index + 1} for “${keyword}”`
          : `Not in Top 100 yet for “${keyword}”`,
    });
  } catch (error) {
    return snapshot({
      path: input.path,
      keyword,
      position: null,
      inTop100: false,
      top3: [],
      source: input.serperApiKey ? "serper" : "cse",
      message: error instanceof Error ? error.message : "SERP lookup failed",
    });
  }
}
