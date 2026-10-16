"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Directory" },
  { href: "/compare", label: "Compare" },
  { href: "/deals", label: "Deals" },
  { href: "/submit", label: "Submit" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-ink">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-lg tracking-tight">Forge</span>
            <span className="-mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-muted">
              AI Directory
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm transition",
                  active
                    ? "bg-surface-2 text-white"
                    : "text-muted hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/advertise"
            className={cn(
              "hidden rounded-full border px-4 py-2 text-sm font-medium transition sm:inline-flex",
              pathname.startsWith("/advertise")
                ? "border-accent text-accent"
                : "border-line text-white hover:border-accent/60 hover:text-accent",
            )}
          >
            Advertise
          </Link>
          <Link
            href="/submit"
            className="hidden rounded-full bg-accent px-4 py-2 text-sm font-medium text-ink transition hover:bg-accent-2 sm:inline-flex"
          >
            List a tool
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/advertise"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface hover:text-white"
            >
              Advertise
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
