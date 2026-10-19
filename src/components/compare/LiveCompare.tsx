"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Crown, Globe2, Loader2, Search } from "lucide-react";
import { AffiliateButton } from "@/components/tools/AffiliateButton";
import type { LiveComparisonResult } from "@/lib/compare";
import { cn } from "@/lib/utils";

type Turnstile = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "dark" | "light" | "auto";
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile() {
  return new Promise<Turnstile>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile failed to load.")),
    );
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load.")));
  });
}

type Outcome = { result: LiveComparisonResult; cached: boolean } | { error: string };

async function requestLive(a: string, b: string, token: string): Promise<Outcome> {
  try {
    const res = await fetch("/api/compare/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a, b, token }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      result?: LiveComparisonResult;
      cached?: boolean;
      error?: string;
    };
    if (!res.ok || !data.result) return { error: data.error || "Live comparison failed." };
    return { result: data.result, cached: Boolean(data.cached) };
  } catch {
    return { error: "Network error. Check your connection and try again." };
  }
}

type Phase = "idle" | "loading" | "done" | "error";

export function LiveCompare({
  a,
  b,
  autoStart,
  enabled,
  slugA,
  slugB,
}: {
  a: string;
  b: string;
  autoStart: boolean;
  enabled: boolean;
  slugA?: string;
  slugB?: string;
}) {
  const [phase, setPhase] = useState<Phase>(enabled && autoStart ? "loading" : "idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const pending = useRef(enabled && autoStart);
  const token = useRef("");
  const widget = useRef<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const send = useCallback(() => {
    void requestLive(a, b, token.current).then((next) => {
      setOutcome(next);
      setPhase("error" in next ? "error" : "done");
      token.current = "";
      if (widget.current) window.turnstile?.reset(widget.current);
    });
  }, [a, b]);

  useEffect(() => {
    if (!enabled) return;
    if (!TURNSTILE_SITE_KEY) {
      if (pending.current) {
        pending.current = false;
        send();
      }
      return;
    }
    let cancelled = false;
    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !box.current) return;
        widget.current = turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (value) => {
            token.current = value;
            if (pending.current) {
              pending.current = false;
              send();
            }
          },
          "expired-callback": () => {
            token.current = "";
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setOutcome({ error: "The human check could not load. Disable blockers and reload the page." });
        setPhase("error");
      });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [enabled, send]);

  function start() {
    setPhase("loading");
    setOutcome(null);
    if (TURNSTILE_SITE_KEY && !token.current) {
      pending.current = true;
      return;
    }
    send();
  }

  return (
    <section className="mt-10 rounded-2xl border border-line bg-ink-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent">
            <Globe2 className="h-3.5 w-3.5" /> Live web comparison
          </p>
          <h2 className="mt-1 font-serif text-2xl">
            {a} vs {b}, researched on the web
          </h2>
        </div>
        {enabled && phase !== "loading" ? (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-full border border-accent/50 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10"
          >
            <Search className="h-4 w-4" />
            {phase === "done" ? "Refresh" : phase === "error" ? "Try again" : "Research live on the web"}
          </button>
        ) : null}
      </div>

      {!enabled ? (
        <p className="mt-4 text-sm text-muted">
          Live web research is not switched on yet. Try a matchup between tools listed in the
          directory, or check back soon.
        </p>
      ) : null}
      {enabled && phase === "idle" ? (
        <p className="mt-4 text-sm text-muted">
          Want the latest pricing and features? We can search the web and build a fresh comparison
          in about 10 to 30 seconds.
        </p>
      ) : null}

      <div ref={box} className={cn("mt-4", !TURNSTILE_SITE_KEY && "hidden")} />

      {phase === "loading" ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Searching the web and comparing {a} and {b}. This usually takes 10 to 30 seconds.
        </p>
      ) : null}

      {outcome && "error" in outcome ? (
        <p className="mt-4 rounded-xl border border-rose/30 bg-rose/10 px-4 py-3 text-sm text-rose">
          {outcome.error}
        </p>
      ) : null}

      {outcome && "result" in outcome ? (
        <LiveResult result={outcome.result} cached={outcome.cached} slugA={slugA} slugB={slugB} />
      ) : null}
    </section>
  );
}

function ToolLink({ name, slug, website }: { name: string; slug?: string; website: string }) {
  if (slug) return <AffiliateButton slug={slug} label={`Try ${name}`} />;
  if (!website) return null;
  return (
    <a
      href={website}
      target="_blank"
      rel="nofollow noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-white"
    >
      Visit {name}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}

function LiveResult({
  result,
  cached,
  slugA,
  slugB,
}: {
  result: LiveComparisonResult;
  cached: boolean;
  slugA?: string;
  slugB?: string;
}) {
  const overall =
    result.overallWinner === "a"
      ? result.toolA
      : result.overallWinner === "b"
        ? result.toolB
        : "It depends";
  const researched = new Date(result.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mt-5">
      {result.tagline ? <p className="max-w-3xl text-muted">{result.tagline}</p> : null}
      <p className="mt-2 text-xs text-muted">
        Researched {researched}
        {cached ? " (saved result, refreshed weekly)" : ""}
      </p>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface-2 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Feature</th>
              <th className="px-4 py-3 font-medium">{result.toolA}</th>
              <th className="px-4 py-3 font-medium">{result.toolB}</th>
              <th className="px-4 py-3 font-medium">Winner</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.feature} className="border-t border-line align-top">
                <td className="px-4 py-3">{row.feature}</td>
                <td className={cn("px-4 py-3", row.winner === "a" && "text-mint")}>{row.a}</td>
                <td className={cn("px-4 py-3", row.winner === "b" && "text-mint")}>{row.b}</td>
                <td className="px-4 py-3">
                  <span className="whitespace-nowrap rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    {row.winner === "tie" ? "Tie" : row.winner === "a" ? result.toolA : result.toolB}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-serif text-xl">Verdict</h3>
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-accent">
          <Crown className="h-4 w-4" /> Overall: {overall}
        </p>
        {result.verdict ? <p className="mt-3 max-w-3xl leading-7 text-muted">{result.verdict}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <ToolLink name={result.toolA} slug={slugA} website={result.websiteA} />
          <ToolLink name={result.toolB} slug={slugB} website={result.websiteB} />
        </div>
      </div>

      {result.sources.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium">Sources</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {result.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs text-muted hover:text-white"
                >
                  {source.title}
                  <ArrowUpRight className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.searchSuggestions ? (
        <iframe
          title="Google Search suggestions"
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          srcDoc={`<base target="_blank">${result.searchSuggestions}`}
          className="mt-4 h-16 w-full rounded-xl border-0"
        />
      ) : null}

      <p className="mt-4 text-xs text-muted">
        AI-generated from live web results. Prices and features change often, so check each
        vendor&apos;s site before you buy.
      </p>
    </div>
  );
}
