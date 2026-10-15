import { countryName } from "@/lib/country";
import { LIVE_WINDOW_MS, readDb, startOfMonth, startOfToday } from "@/lib/db";
import type { AnalyticsOverview, CountryStat, TrafficPoint } from "@/lib/types";

function inRange(iso: string, start: Date, end = new Date()) {
  const time = new Date(iso).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function bucketLabel(date: Date, range: "daily" | "weekly" | "monthly") {
  if (range === "monthly") {
    return date.toLocaleString("en-US", { month: "short", year: "2-digit" });
  }
  if (range === "weekly") {
    return date.toLocaleString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function startOfIsoWeek(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const offset = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function trafficBuckets(
  timestamps: string[],
  range: "daily" | "weekly" | "monthly",
): TrafficPoint[] {
  const now = new Date();
  const points: TrafficPoint[] = [];

  for (let i = 13; i >= 0; i -= 1) {
    let start: Date;
    let end: Date;
    if (range === "daily") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    } else if (range === "weekly") {
      const weekStart = startOfIsoWeek(now);
      start = new Date(weekStart);
      start.setDate(weekStart.getDate() - i * 7);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    }
    const value = timestamps.filter((stamp) => {
      const time = new Date(stamp).getTime();
      return time >= start.getTime() && time < end.getTime();
    }).length;
    points.push({ label: bucketLabel(start, range), value });
  }

  return points;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const db = await readDb();
  const now = Date.now();
  const today = startOfToday();
  const month = startOfMonth();

  const liveVisitors = db.sessions.filter(
    (session) => now - new Date(session.lastSeen).getTime() <= LIVE_WINDOW_MS,
  ).length;

  const clicksToday = db.clicks.filter((click) =>
    inRange(click.timestamp, today),
  ).length;
  const clicksMonth = db.clicks.filter((click) =>
    inRange(click.timestamp, month),
  ).length;

  const commissionsToday = db.commissions
    .filter((item) => inRange(item.timestamp, today))
    .reduce((sum, item) => sum + item.amount, 0);
  const commissionsMonth = db.commissions
    .filter((item) => inRange(item.timestamp, month))
    .reduce((sum, item) => sum + item.amount, 0);

  const epc = db.settings.epc;
  const counts = new Map<string, number>();
  for (const session of db.sessions) {
    const code = session.country || "UN";
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  const totalSessions = db.sessions.length;
  const countries: CountryStat[] = [...counts.entries()]
    .map(([code, visitors]) => ({
      code,
      country: countryName(code),
      visitors,
      share: totalSessions ? Math.round((visitors / totalSessions) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.visitors - a.visitors);

  const timestamps = db.pageviews.map((item) => item.timestamp);

  return {
    liveVisitors,
    clicksToday,
    clicksMonth,
    epc,
    commissionsToday,
    commissionsMonth,
    estimatedRevenueToday: clicksToday * epc + commissionsToday,
    estimatedRevenueMonth: clicksMonth * epc + commissionsMonth,
    topCountry: countries[0] ?? null,
    countries,
    traffic: {
      daily: trafficBuckets(timestamps, "daily"),
      weekly: trafficBuckets(timestamps, "weekly"),
      monthly: trafficBuckets(timestamps, "monthly"),
    },
  };
}

export async function getToolsWithClickStats() {
  const db = await readDb();
  const today = startOfToday();
  const month = startOfMonth();
  return db.tools.map((tool) => {
    const events = db.clicks.filter((click) => click.slug === tool.slug);
    return {
      ...tool,
      clicksToday: events.filter((click) => inRange(click.timestamp, today)).length,
      clicksMonth: events.filter((click) => inRange(click.timestamp, month)).length,
      clicksTotal: events.length,
    };
  });
}
