import type { Metadata } from "next";
import { OverviewDashboard } from "@/components/admin/OverviewDashboard";
import { getAnalyticsOverview } from "@/lib/analytics";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Admin Overview",
};

export default async function AdminOverviewPage() {
  await live();
  try {
    const initial = await getAnalyticsOverview();
    return <OverviewDashboard initial={initial} />;
  } catch (error) {
    console.error("[forge] admin overview failed", error);
    return (
      <OverviewDashboard
        initial={{
          liveVisitors: 0,
          clicksToday: 0,
          clicksMonth: 0,
          epc: 0,
          commissionsToday: 0,
          commissionsMonth: 0,
          estimatedRevenueToday: 0,
          estimatedRevenueMonth: 0,
          topCountry: null,
          countries: [],
          traffic: { daily: [], weekly: [], monthly: [] },
        }}
      />
    );
  }
}
