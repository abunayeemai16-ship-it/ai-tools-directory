import { NextResponse } from "next/server";
import { resolveCountry } from "@/lib/country";
import { recordAdClick } from "@/lib/db";

function safeDestination(url: string, origin: string) {
  try {
    const parsed = new URL(url, origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    /* fall through */
  }
  return new URL("/", origin).toString();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const origin = new URL(request.url).origin;
  const country = resolveCountry(request);
  const ad = await recordAdClick(id, country);
  if (!ad) {
    return NextResponse.redirect(new URL("/", origin));
  }
  return NextResponse.redirect(safeDestination(ad.targetUrl, origin), 302);
}
