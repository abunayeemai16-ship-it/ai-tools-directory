import { after, NextResponse } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { clickDestination } from "@/lib/categories";
import { PUBLIC_CACHE_TAG } from "@/lib/cache-tags";
import { resolveCountry } from "@/lib/country";
import { getRedirectTool, recordClick } from "@/lib/db";

/** Destination only — clicks are recorded outside the cache so counts stay accurate. */
async function cachedOutbound(slug: string) {
  "use cache";
  cacheTag(PUBLIC_CACHE_TAG);
  cacheLife("days");
  const tool = await getRedirectTool(slug);
  if (!tool || tool.status === "draft") return { kind: "home" as const };
  const destination = clickDestination(tool);
  if (!destination) return { kind: "review" as const, slug };
  return { kind: "out" as const, destination };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const origin = new URL(request.url).origin;
  const target = await cachedOutbound(slug);

  if (target.kind === "home") {
    return NextResponse.redirect(new URL("/", origin));
  }
  if (target.kind === "review") {
    return NextResponse.redirect(new URL(`/tool/${target.slug}`, origin));
  }

  const country = resolveCountry(request);
  after(() =>
    recordClick(slug, country).catch((error) =>
      console.error("[forge] click write failed", error),
    ),
  );
  return NextResponse.redirect(target.destination, 302);
}
