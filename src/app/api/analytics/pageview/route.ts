import { NextResponse } from "next/server";
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
  await recordPageview({
    sessionId: body.sessionId,
    path: body.path,
    country,
  });

  return NextResponse.json({ ok: true, country });
}
