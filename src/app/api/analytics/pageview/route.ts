import { after, NextResponse } from "next/server";
import { resolveCountry } from "@/lib/country";
import { recordPageview } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    path?: string;
    timezone?: string;
    locale?: string;
    country?: string;
  };

  if (!body.sessionId || !body.path) {
    return NextResponse.json({ error: "sessionId and path required" }, { status: 400 });
  }

  const country = resolveCountry(request, body);
  const sessionId = body.sessionId;
  const path = body.path;
  // Return immediately so the visit never waits on Postgres; the write runs after the response.
  after(() =>
    recordPageview({ sessionId, path, country }).catch((error) =>
      console.error("[forge] pageview write failed", error),
    ),
  );

  return new NextResponse(null, { status: 204 });
}
