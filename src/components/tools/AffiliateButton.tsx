import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AffiliateButton({
  slug,
  label = "Try Tool",
  className,
}: {
  slug: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={`/go/${slug}`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent-2",
        className,
      )}
    >
      {label}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
}
