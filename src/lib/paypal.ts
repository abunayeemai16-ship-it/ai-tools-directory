import { createHmac, timingSafeEqual } from "node:crypto";
import { HOMEPAGE_FEATURED, type SponsoredPlacement } from "@/lib/advertise";

/** How long the price quoted when checkout starts stays payable after an admin price change. */
const TERMS_TTL_MS = 3 * 60 * 60 * 1000;

export function paypalClientId() {
  return process.env.PAYPAL_CLIENT_ID?.trim() || "";
}

export function paypalConfigured() {
  return Boolean(paypalClientId() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

function apiBase() {
  return process.env.PAYPAL_MODE?.trim().toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function accessToken() {
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim() || "";
  const auth = Buffer.from(`${paypalClientId()}:${secret}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string };
  if (!res.ok || !data.access_token) throw new Error("PayPal authentication failed.");
  return data.access_token;
}

async function paypalRequest<T>(path: string, body?: unknown, method: "GET" | "POST" = "POST") {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    details?: { issue?: string; description?: string }[];
  };
  return { ok: res.ok, data };
}

function signTerms(price: string, days: number, issuedAt: number) {
  return createHmac("sha256", process.env.PAYPAL_CLIENT_SECRET?.trim() || "")
    .update(`${HOMEPAGE_FEATURED.id}|${price}|${days}|${issuedAt}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Orders carry the price and duration they were created with, signed with the PayPal secret,
 * so a later admin price change cannot reject a buyer mid-checkout and an order built in the
 * browser cannot claim a price we never offered.
 */
function termsId(price: string, days: number) {
  const issuedAt = Date.now();
  return `${price}|${days}|${issuedAt}|${signTerms(price, days, issuedAt)}`;
}

function readTerms(customId: string | undefined) {
  const [price, daysText, issuedText, signature] = (customId || "").split("|");
  const days = Number(daysText);
  const issuedAt = Number(issuedText);
  if (!price || !signature || !Number.isInteger(days) || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > TERMS_TTL_MS) return null;
  const expected = Buffer.from(signTerms(price, days, issuedAt));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { price, days };
}

export async function createFeaturedOrder(toolName: string, placement: SponsoredPlacement) {
  const price = placement.price.toFixed(2);
  const { ok, data } = await paypalRequest<{ id?: string }>("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: HOMEPAGE_FEATURED.id,
        custom_id: termsId(price, placement.days),
        description: `${placement.name} (${placement.days} days): ${toolName}`.slice(0, 127),
        amount: { currency_code: HOMEPAGE_FEATURED.currency, value: price },
      },
    ],
    application_context: { shipping_preference: "NO_SHIPPING", brand_name: "Forge AI Directory" },
  });
  if (!ok || !data.id) {
    throw new Error(data.details?.[0]?.description || data.message || "Could not start PayPal checkout.");
  }
  return data.id;
}

type Amount = { value?: string; currency_code?: string };

type OrderResponse = {
  purchase_units?: { custom_id?: string; amount?: Amount }[];
};

type CaptureResponse = {
  id?: string;
  status?: string;
  payer?: { email_address?: string };
  purchase_units?: {
    payments?: {
      captures?: { id?: string; status?: string; amount?: Amount }[];
    };
  }[];
};

/**
 * Checks the order against the terms it was created with (or today's price for orders without
 * signed terms) before charging, then captures it.
 */
export async function captureFeaturedOrder(orderId: string, current: SponsoredPlacement) {
  const path = `/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  const order = await paypalRequest<OrderResponse>(path, undefined, "GET");
  if (!order.ok) throw new Error("PayPal order not found.");
  const unit = order.data.purchase_units?.[0];
  const terms = readTerms(unit?.custom_id) ?? { price: current.price.toFixed(2), days: current.days };
  const matches = (amount?: Amount) =>
    amount?.value === terms.price && amount?.currency_code === HOMEPAGE_FEATURED.currency;
  if (!matches(unit?.amount)) {
    throw new Error("This checkout has expired or the price changed. Reload the page and try again. You have not been charged.");
  }

  const { ok, data } = await paypalRequest<CaptureResponse>(`${path}/capture`);
  if (!ok) {
    throw new Error(data.details?.[0]?.description || data.message || "PayPal could not capture the payment.");
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const paid = data.status === "COMPLETED" && capture?.status === "COMPLETED" && matches(capture.amount);
  if (!paid || !capture?.id) throw new Error("Payment was not completed.");
  return {
    captureId: capture.id,
    payerEmail: data.payer?.email_address || "",
    price: Number(terms.price),
    days: terms.days,
  };
}
