import { NextResponse } from "next/server";
import { parseAdvertiseOrder } from "@/lib/advertise";
import { createPaidFeaturedAd, getFeaturedCheckout, hasAdPayment } from "@/lib/db";
import { captureFeaturedOrder, paypalConfigured } from "@/lib/paypal";

export const maxDuration = 30;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    if (!paypalConfigured()) return fail("Online checkout is not available yet.", 503);
    const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!/^[A-Z0-9-]{5,64}$/i.test(orderId)) return fail("Missing PayPal order.");
    const input = parseAdvertiseOrder(body);
    if (typeof input === "string") return fail(input);

    if (await hasAdPayment(orderId)) return NextResponse.json({ ok: true });

    const { availability, placement } = await getFeaturedCheckout();
    if (!availability.available) {
      return fail("This placement was booked a moment ago. You have not been charged.", 409);
    }

    const payment = await captureFeaturedOrder(orderId, placement);
    try {
      await createPaidFeaturedAd(input, { orderId, ...payment });
    } catch (error) {
      console.error("[advertise] paid booking not saved", { orderId, input, payment, error });
      return fail(
        `Payment received (PayPal order ${orderId}) but the booking could not be saved. Reply to your PayPal receipt and we will activate it manually.`,
        500,
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Payment could not be completed.", 502);
  }
}
