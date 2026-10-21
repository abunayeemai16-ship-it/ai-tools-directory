import type { Metadata } from "next";
import { AffiliateManager } from "@/components/admin/AffiliateManager";
import { getToolsWithClickStats } from "@/lib/analytics";
import { live } from "@/lib/live";
import { alignToolsWithClearedDeals, readDb } from "@/lib/db";

export const instant = false;

export const metadata: Metadata = {
  title: "Affiliate Links & Tools",
};

export default async function AffiliatesPage() {
  await live();
  const db = await readDb();
  const tools = await alignToolsWithClearedDeals(await getToolsWithClickStats());
  return (
    <AffiliateManager
      initial={{
        tools,
        categories: db.categories,
        settings: { epc: db.settings.epc },
        commissions: db.commissions,
      }}
    />
  );
}
