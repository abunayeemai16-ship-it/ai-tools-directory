"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  MousePointerClick,
  Sparkles,
  Inbox,
  LayoutDashboard,
  ArrowLeft,
  FileEdit,
  KeyRound,
  LogOut,
  Tags,
  Search,
  Layers,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: boolean;
}[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/drafts", label: "Ready Drafts", icon: FileEdit, badge: true },
  { href: "/admin/generate", label: "AI Studio", icon: Sparkles },
  { href: "/admin/scaler", label: "Bulk Scaler", icon: Layers },
  { href: "/admin/affiliates", label: "Affiliate Links & Tools", icon: MousePointerClick },
  { href: "/admin/ads", label: "Ad Runs & Partners", icon: Megaphone },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/seo", label: "Web SEO", icon: Search },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/settings", label: "API Keys & Settings", icon: KeyRound },
];

export function AdminSidebar({
  initialDraftCount = 0,
}: {
  initialDraftCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [draftCount, setDraftCount] = useState(initialDraftCount);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/drafts", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      setDraftCount(Number(data.count) || 0);
    }
    void load();
    const id = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(id);
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="flex w-full flex-col border-b border-line bg-ink-2 lg:h-screen lg:w-64 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-ink">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Forge Admin</span>
            <span className="text-[11px] text-muted">Live · data/db.json</span>
          </span>
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm",
                active ? "bg-surface text-white" : "text-muted hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.badge && draftCount > 0 ? (
                <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-ink">
                  {draftCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="hidden space-y-2 border-t border-line p-3 lg:block">
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>
      </div>
    </aside>
  );
}
