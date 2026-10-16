import { HOMEPAGE_FEATURED } from "@/lib/advertise";

const PRICE = HOMEPAGE_FEATURED.price.toFixed(2);

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

async function paypalRequest<T>(path: string, body?: unknown) {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
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

export async function createFeaturedOrder(toolName: string) {
  const { ok, data } = await paypalRequest<{ id?: string }>("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: HOMEPAGE_FEATURED.id,
        description: `${HOMEPAGE_FEATURED.name} (${HOMEPAGE_FEATURED.days} days): ${toolName}`.slice(0, 127),
        amount: { currency_code: HOMEPAGE_FEATURED.currency, value: PRICE },
      },
    ],
    application_context: { shipping_preference: "NO_SHIPPING", brand_name: "Forge AI Directory" },
  });
  if (!ok || !data.id) {
    throw new Error(data.details?.[0]?.description || data.message || "Could not start PayPal checkout.");
  }
  return data.id;
}

type CaptureResponse = {
  id?: string;
  status?: string;
  payer?: { email_address?: string };
  purchase_units?: {
    payments?: {
      captures?: { id?: string; status?: string; amount?: { value?: string; currency_code?: string } }[];
    };
  }[];
};

export async function captureFeaturedOrder(orderId: string) {
  const { ok, data } = await paypalRequest<CaptureResponse>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
  );
  if (!ok) {
    throw new Error(data.details?.[0]?.description || data.message || "PayPal could not capture the payment.");
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const paid =
    data.status === "COMPLETED" &&
    capture?.status === "COMPLETED" &&
    capture.amount?.value === PRICE &&
    capture.amount?.currency_code === HOMEPAGE_FEATURED.currency;
  if (!paid || !capture?.id) throw new Error("Payment was not completed.");
  return { captureId: capture.id, payerEmail: data.payer?.email_address || "" };
}
