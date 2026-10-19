import { NextResponse } from "next/server";
import { parseAdvertiseOrder } from "@/lib/advertise";
import { getFeaturedCheckout } from "@/lib/db";
import { createFeaturedOrder, paypalConfigured } from "@/lib/paypal";

export const maxDuration = 30;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    if (!paypalConfigured()) return fail("Online checkout is not available yet.", 503);
    const input = parseAdvertiseOrder(await request.json().catch(() => null));
    if (typeof input === "string") return fail(input);
    const { availability, placement } = await getFeaturedCheckout();
    if (!availability.available) return fail("This placement is already booked.", 409);
    const orderId = await createFeaturedOrder(input.toolName, placement);
    return NextResponse.json({ orderId });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not start checkout.", 502);
  }
}
