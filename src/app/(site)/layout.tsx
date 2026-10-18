import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export const instant = false;

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AnalyticsTracker />
      <Header />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
      <Footer />
    </>
  );
}
