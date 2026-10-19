import type { Metadata } from "next";
import { LiveCompareManager } from "@/components/admin/LiveCompareManager";
import { listAllTools } from "@/lib/db";
import { directoryMatches, listLiveComparisons, liveCompareEnabled } from "@/lib/live-compare";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Visitor Compares",
};

export default async function CompareRequestsPage() {
  await live();
  const [records, tools] = await Promise.all([listLiveComparisons(), listAllTools()]);
  const items = records.map((record) => {
    const match = directoryMatches(record, tools);
    return { ...record, directory: { a: match.a?.slug ?? null, b: match.b?.slug ?? null } };
  });
  return <LiveCompareManager initial={items} enabled={liveCompareEnabled()} />;
}
