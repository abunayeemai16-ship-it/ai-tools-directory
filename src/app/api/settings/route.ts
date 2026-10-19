import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { parseSponsoredPlacement, sponsoredPlacement } from "@/lib/advertise";
import { maskGeminiKey } from "@/lib/crypto-auth";
import {
  publicSeoSettings,
  readDb,
  updateSeoSettings,
  updateSettings,
  updateSponsoredPlacement,
} from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const db = await readDb();
  return NextResponse.json({
    ...publicSeoSettings(db.settings),
    serperMasked: db.settings.serperApiKey ? maskGeminiKey(db.settings.serperApiKey) : "",
    cseMasked: db.settings.googleCseKey ? maskGeminiKey(db.settings.googleCseKey) : "",
    cseCx: db.settings.googleCseCx,
    sponsored: sponsoredPlacement(db.settings),
  });
}

export async function PATCH(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as {
    epc?: number;
    siteDomain?: string;
    serperApiKey?: string;
    googleCseKey?: string;
    googleCseCx?: string;
    homeSeoTitle?: string;
    homeSeoDescription?: string;
    sponsored?: unknown;
  };

  if (body.sponsored !== undefined) {
    const placement = parseSponsoredPlacement(body.sponsored);
    if (typeof placement === "string") {
      return NextResponse.json({ error: placement }, { status: 400 });
    }
    return NextResponse.json({ sponsored: await updateSponsoredPlacement(placement) });
  }

  if (body.epc !== undefined) {
    const epc = Number(body.epc);
    if (Number.isNaN(epc) || epc < 0) {
      return NextResponse.json({ error: "Invalid EPC" }, { status: 400 });
    }
    await updateSettings(epc);
  }

  const settings = await updateSeoSettings({
    siteDomain: body.siteDomain,
    serperApiKey: body.serperApiKey,
    googleCseKey: body.googleCseKey,
    googleCseCx: body.googleCseCx,
    homeSeoTitle: body.homeSeoTitle,
    homeSeoDescription: body.homeSeoDescription,
  });

  return NextResponse.json(publicSeoSettings(settings));
}
