"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Sparkles, WandSparkles } from "lucide-react";
import type { RankSnapshot, SeoPageAudit } from "@/lib/types";
import { cn } from "@/lib/utils";

type IndexStatus = {
  sitemapOk: boolean;
  robotsOk: boolean;
  sitemapUrls: number;
  sitemapPath: string;
  robotsPath: string;
};

type Payload = {
  pages: SeoPageAudit[];
  rankChecks: RankSnapshot[];
  settings: {
    siteDomain: string;
    serperConfigured: boolean;
    googleCseConfigured: boolean;
    homeSeoTitle: string;
    homeSeoDescription: string;
  };
  local: boolean;
  publicOrigin: string;
  index: IndexStatus;
};

const skipCopy = "Site on localhost / Add free Serper API key to check live Google SERP position";

export function SeoManager({ initial }: { initial: Payload }) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [diffs, setDiffs] = useState<Record<string, { from: number; to: number }>>({});
  const [ranks, setRanks] = useState<Record<string, RankSnapshot>>(() => {
    const map: Record<string, RankSnapshot> = {};
    for (const item of initial.rankChecks) map[item.path] = item;
    return map;
  });

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/seo", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as Payload;
    setData(payload);
    setRanks((prev) => {
      const next = { ...prev };
      for (const item of payload.rankChecks) next[item.path] = item;
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const low = useMemo(() => data.pages.filter((page) => page.score < 80), [data.pages]);

  async function optimize(page: SeoPageAudit) {
    setBusy(page.path);
    setError("");
    try {
      const res = await fetch("/api/admin/seo/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: page.path, kind: page.kind, slug: page.slug }),
      });
      const payload = (await res.json()) as {
        before?: SeoPageAudit;
        after?: SeoPageAudit;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error || "Optimize failed");
      if (payload.before && payload.after) {
        setDiffs((current) => ({
          ...current,
          [page.path]: { from: payload.before!.score, to: payload.after!.score },
        }));
        setNotice(
          `${page.name}: score jumped from ${payload.before.score}/100 to ${payload.after.score}/100`,
        );
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimize failed");
    } finally {
      setBusy(null);
    }
  }

  async function boostLow() {
    setError("");
    setNotice(`Boosting ${low.length} low-score pages…`);
    let ok = 0;
    const failures: string[] = [];
    for (const page of low) {
      setBusy(page.path);
      try {
        const res = await fetch("/api/admin/seo/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: page.path, kind: page.kind, slug: page.slug }),
        });
        const payload = (await res.json()) as {
          before?: SeoPageAudit;
          after?: SeoPageAudit;
          error?: string;
        };
        if (!res.ok) throw new Error(payload.error || "Optimize failed");
        if (payload.before && payload.after) {
          setDiffs((current) => ({
            ...current,
            [page.path]: { from: payload.before!.score, to: payload.after!.score },
          }));
        }
        ok += 1;
        setNotice(`Boosted ${ok}/${low.length}: ${page.name}`);
      } catch (err) {
        failures.push(`${page.name}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
    setBusy(null);
    await load();
    if (failures.length) {
      setError(`${failures.length} page(s) failed. ${failures[0]}`);
    }
    setNotice(`Boost finished: ${ok} upgraded, ${failures.length} failed.`);
  }

  async function checkRank(page: SeoPageAudit) {
    setBusy(`rank-${page.path}`);
    setError("");
    try {
      const res = await fetch("/api/admin/seo/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: page.path,
          kind: page.kind,
          slug: page.slug,
          keyword: page.keyword,
        }),
      });
      const snapshot = (await res.json()) as RankSnapshot & { error?: string };
      if (!res.ok) throw new Error(snapshot.error || "Rank check failed");
      setRanks((current) => ({ ...current, [page.path]: snapshot }));
      setNotice(snapshot.message || "Rank check finished");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rank check failed");
    } finally {
      setBusy(null);
    }
  }

  const serpReady = data.settings.serperConfigured || data.settings.googleCseConfigured;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Indexing</p>
          <h1 className="mt-1 font-serif text-3xl">Web SEO</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Scores are calculated from live data/db.json content. Google positions are only shown after a real SERP lookup.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void boostLow()}
          disabled={Boolean(busy) || low.length === 0}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
          Boost All Low-Score Pages ({low.length})
        </button>
      </div>

      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {notice ? <p className="text-sm text-mint">{notice}</p> : null}

      <section className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-3">
        <StatusCard
          label="sitemap.xml"
          ok={data.index.sitemapOk}
          detail={
            data.index.sitemapOk
              ? `${data.index.sitemapUrls} URLs at ${data.index.sitemapPath}`
              : "sitemap.xml not reachable"
          }
          href={data.index.sitemapPath}
        />
        <StatusCard
          label="robots.txt"
          ok={data.index.robotsOk}
          detail={data.index.robotsOk ? `Allow / · disallow /admin` : "robots.txt not reachable"}
          href={data.index.robotsPath}
        />
        <div className="rounded-xl border border-line bg-ink p-3 text-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">SERP</p>
          <p className="mt-1 font-medium">
            {data.local || !serpReady ? "Live ranks locked" : `Tracking ${data.settings.siteDomain}`}
          </p>
          <p className="mt-1 text-xs text-muted">
            {data.local || !serpReady
              ? skipCopy
              : "Check Live Google Rank uses Serper or Google CSE — never mock positions."}
          </p>
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">SEO score</th>
              <th className="px-4 py-3">Missing factors</th>
              <th className="px-4 py-3">Google rank</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.pages.map((page) => {
              const rank = ranks[page.path];
              const diff = diffs[page.path];
              return (
                <tr key={page.path} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{page.name}</p>
                    <p className="font-mono text-[11px] text-blue">{page.path}</p>
                    <p className="mt-1 text-xs text-muted">Keyword: {page.keyword}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ScorePill score={page.score} />
                    {diff ? (
                      <p className="mt-1 text-xs text-mint">
                        {diff.from}/100 → {diff.to}/100
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {page.issues.length === 0 ? (
                      <p className="text-xs text-mint">No blocking issues</p>
                    ) : (
                      <ul className="space-y-1 text-xs text-muted">
                        {page.issues.map((issue) => (
                          <li key={issue}>• {issue}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {rank?.source === "skipped" || (!rank && (data.local || !serpReady)) ? (
                      <p className="text-muted">{rank?.message || skipCopy}</p>
                    ) : rank ? (
                      <div>
                        <p className="font-medium">
                          {rank.inTop100 && rank.position
                            ? `#${rank.position}`
                            : "Not in Top 100 yet"}
                        </p>
                        <p className="text-muted">{rank.message}</p>
                        {rank.top3.length > 0 ? (
                          <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-muted">
                            {rank.top3.map((item) => (
                              <li key={item.url}>
                                <a className="text-blue hover:underline" href={item.url} target="_blank" rel="noreferrer">
                                  {item.title || item.url}
                                </a>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-muted">Not checked</p>
                    )}
                    <button
                      type="button"
                      onClick={() => void checkRank(page)}
                      disabled={Boolean(busy)}
                      className="mt-2 inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted hover:text-white"
                    >
                      {busy === `rank-${page.path}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3" />
                      )}
                      Check Live Google Rank
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void optimize(page)}
                      disabled={Boolean(busy)}
                      className="inline-flex items-center gap-1 rounded-full border border-accent px-3 py-1.5 text-xs font-semibold text-accent disabled:opacity-60"
                    >
                      {busy === page.path ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Rank Higher with AI
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScorePill({ score }: { score: number }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
        score >= 85 ? "bg-mint/15 text-mint" : score >= 60 ? "bg-accent/15 text-accent" : "bg-rose/15 text-rose",
      )}
    >
      {score}/100
    </span>
  );
}

function StatusCard({
  label,
  ok,
  detail,
  href,
}: {
  label: string;
  ok: boolean;
  detail: string;
  href: string;
}) {
  return (
    <a href={href} className="rounded-xl border border-line bg-ink p-3 text-sm hover:border-accent" target="_blank" rel="noreferrer">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={cn("mt-1 font-medium", ok ? "text-mint" : "text-rose")}>{ok ? "Live" : "Missing"}</p>
      <p className="mt-1 text-xs text-muted">{detail}</p>
    </a>
  );
}
