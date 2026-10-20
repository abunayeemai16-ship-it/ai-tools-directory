import { after, NextResponse } from "next/server";
import { recordAdImpressions } from "@/lib/db";

export async function POST(request: Request) {
  let body: { id?: string; ids?: string[] } = {};
  try {
    body = (await request.json()) as { id?: string; ids?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const ids = [
    ...(Array.isArray(body.ids) ? body.ids : []),
    ...(body.id ? [body.id] : []),
  ].filter(Boolean);
  if (!ids.length) return new NextResponse(null, { status: 204 });

  after(() =>
    recordAdImpressions(ids).catch((error) =>
      console.error("[forge] impression write failed", error),
    ),
  );
  return new NextResponse(null, { status: 204 });
}
