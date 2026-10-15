import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { addCommission, readDb } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const db = await readDb();
  return NextResponse.json(db.commissions);
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as {
    amount?: number;
    note?: string;
    slug?: string;
  };
  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount === 0) {
    return NextResponse.json({ error: "Amount required" }, { status: 400 });
  }
  const commission = await addCommission({
    amount,
    note: body.note?.trim() || "Confirmed commission",
    slug: body.slug,
  });
  return NextResponse.json(commission, { status: 201 });
}
