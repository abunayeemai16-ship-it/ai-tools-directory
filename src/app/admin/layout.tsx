export const instant = false;

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-full bg-ink">{children}</div>;
}
