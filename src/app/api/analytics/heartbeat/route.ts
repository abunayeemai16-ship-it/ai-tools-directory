import { after, NextResponse } from "next/server";
import { resolveCountry } from "@/lib/country";
import { upsertHeartbeat } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    timezone?: string;
    locale?: string;
    country?: string;
  };

  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const country = resolveCountry(request, body);
  const sessionId = body.sessionId;
  after(() =>
    upsertHeartbeat({ sessionId, country }).catch((error) =>
      console.error("[forge] heartbeat write failed", error),
    ),
  );

  return new NextResponse(null, { status: 204 });
}
