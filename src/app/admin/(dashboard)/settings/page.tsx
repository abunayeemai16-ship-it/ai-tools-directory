import type { Metadata } from "next";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { listGeminiKeys } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "API Keys & Settings",
};

export default async function SettingsPage() {
  await live();
  const keys = await listGeminiKeys();
  return <SettingsManager initialKeys={keys} />;
}
