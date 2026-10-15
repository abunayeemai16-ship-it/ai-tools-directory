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
  const initial = await getAnalyticsOverview();
  return <OverviewDashboard initial={initial} />;
}
