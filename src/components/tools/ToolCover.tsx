"use client";

import Link from "next/link";
import { useState } from "react";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { isGeneratedCatalogTool } from "@/lib/data/catalog-generated-names";

function screenshotUrl(name: string, website: string) {
  const site = website.trim();
  if (!/^https?:\/\//i.test(site)) return "";
  if (isGeneratedCatalogTool(name, site)) return "";
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(site)}?w=800&h=500`;
}

export function ToolCover({
  name,
  slug,
  category,
  color,
  headline,
  website,
}: {
  name: string;
  slug: string;
  category: string;
  color: string;
  headline: string;
  website: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = screenshotUrl(name, website);
  const showShot = Boolean(src) && !failed;

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
      {showShot ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote screenshot service, not a static asset */}
          <img
            src={src}
            alt={`${name} website preview`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
          <span className="absolute top-3 left-3 rounded-2xl shadow-lg shadow-black/40">
            <ToolLogo name={name} category={category} color={color} size="sm" />
          </span>
        </>
      ) : (
        <>
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
        </>
      )}
    </Link>
  );
}
