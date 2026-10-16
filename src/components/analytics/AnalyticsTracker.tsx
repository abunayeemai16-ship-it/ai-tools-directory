"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function sessionId() {
  const key = "forge_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

function hints() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
  };
}

function shouldRecordPageview(sessionIdValue: string, path: string) {
  const key = "forge_last_pv_path";
  const token = `${sessionIdValue}:${path}`;
  try {
    if (sessionStorage.getItem(key) === token) return false;
    sessionStorage.setItem(key, token);
  } catch {
    // private mode / blocked storage
  }
  return true;
}

async function ping(url: string, body: unknown) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    // Compiling, slow DB, or aborted keepalive must not surface a Next overlay.
  } finally {
    window.clearTimeout(timer);
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    idRef.current = sessionId();
    let inFlight = false;
    const beat = () => {
      if (inFlight) return;
      inFlight = true;
      void ping("/api/analytics/heartbeat", {
        sessionId: idRef.current,
        ...hints(),
      }).finally(() => {
        inFlight = false;
      });
    };

    beat();
    const timer = window.setInterval(beat, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") beat();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (!idRef.current) idRef.current = sessionId();
    if (!shouldRecordPageview(idRef.current, pathname)) return;
    void ping("/api/analytics/pageview", {
      sessionId: idRef.current,
      path: pathname,
      ...hints(),
    });
  }, [pathname]);

  return null;
}
