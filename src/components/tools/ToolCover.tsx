import Link from "next/link";
import { ToolLogo } from "@/components/tools/ToolLogo";

export function ToolCover({
  name,
  slug,
  category,
  color,
  headline,
}: {
  name: string;
  slug: string;
  category: string;
  color: string;
  headline: string;
}) {
  return (
    <Link
      href={`/tool/${slug}`}
      className="relative block aspect-[16/10] overflow-hidden bg-ink-2"
      aria-label={`${name}: ${headline}`}
    >
      <span
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 15% 10%, ${color} 0%, ${color}99 38%, #0b0d12 78%)`,
        }}
      />
      <span className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_80%_20%,white,transparent_42%)]" />
      <span className="absolute -right-6 -bottom-8 opacity-25">
        <ToolLogo name={name} category={category} color={color} size="lg" />
      </span>
      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <span className="absolute top-3 left-3">
        <ToolLogo name={name} category={category} color={color} size="sm" />
      </span>
      <span className="absolute right-3 bottom-3 left-3">
        <span className="line-clamp-2 font-serif text-lg leading-snug tracking-tight text-white sm:text-xl">
          {headline}
        </span>
      </span>
    </Link>
  );
}
