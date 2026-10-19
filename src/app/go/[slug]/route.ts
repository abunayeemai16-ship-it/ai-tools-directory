import { NextResponse } from "next/server";
import { clickDestination } from "@/lib/categories";
import { resolveCountry } from "@/lib/country";
import { getRedirectTool, recordClick } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tool = await getRedirectTool(slug);
  const origin = new URL(request.url).origin;

  if (!tool || tool.status === "draft") {
    return NextResponse.redirect(new URL("/", origin));
  }

  const destination = clickDestination(tool);
  if (!destination) {
    return NextResponse.redirect(new URL(`/tool/${slug}`, origin));
  }

  const country = resolveCountry(request);
  await recordClick(slug, country);
  return NextResponse.redirect(destination, 302);
}
