import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { live } from "@/lib/live";

export const instant = false;

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await live();
  return (
    <>
      <AnalyticsTracker />
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
    </>
  );
}
