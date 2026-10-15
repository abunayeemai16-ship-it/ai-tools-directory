import { NextResponse } from "next/server";
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
  ];
  const recorded = await recordAdImpressions(ids);
  return NextResponse.json({ ok: true, recorded });
}
