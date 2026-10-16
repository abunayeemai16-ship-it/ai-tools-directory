import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-ink-2">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-ink">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-serif text-xl">Forge</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
            Independent reviews, side-by-side comparisons, and live deals for
            the AI tools teams actually buy.
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Explore
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/" className="hover:text-accent">
              Directory
            </Link>
            <Link href="/compare" className="hover:text-accent">
              VS Comparisons
            </Link>
            <Link href="/deals" className="hover:text-accent">
              Deals & Coupons
            </Link>
            <Link href="/submit" className="hover:text-accent">
              Submit a tool
            </Link>
            <Link href="/advertise" className="hover:text-accent">
              Advertise
            </Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
            Operators
          </p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/admin" className="hover:text-accent">
              Admin dashboard
            </Link>
            <Link href="/admin/generate" className="hover:text-accent">
              AI review studio
            </Link>
            <p className="text-muted/80">Affiliate disclosure: we may earn from qualifying clicks.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-line/80">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          © 2026 Forge Directory. Affiliate clicks are logged in the local
          database. We may earn from qualifying visits.
        </p>
      </div>
    </footer>
  );
}
