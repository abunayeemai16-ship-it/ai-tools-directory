import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { adCtr } from "@/lib/ads";
import { deleteAd, updateAd } from "@/lib/db";
import type { AdCampaign } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;
  const body = (await request.json()) as Partial<AdCampaign> & { alsoPublishTool?: boolean };
  try {
    const updated = await updateAd(id, body);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...updated, ctr: adCtr(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update campaign";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;
  const removed = await deleteAd(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
