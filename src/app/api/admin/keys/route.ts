import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { addGeminiKey, listGeminiKeys } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  return NextResponse.json({ keys: await listGeminiKeys() });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as { label?: string; key?: string };
  if (!body.key?.trim()) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }
  try {
    const record = await addGeminiKey(body.label || "", body.key);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save key";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
