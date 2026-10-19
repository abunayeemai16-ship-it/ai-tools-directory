import { SITE_URL } from "@/lib/site";

/** Owner inbox for booking alerts; BOOKING_ALERT_EMAIL overrides it. */
const DEFAULT_ALERT_EMAIL = "abunayeem16@gmail.com";
/** Resend's shared sender works without domain setup when mailing the Resend account's own address. */
const DEFAULT_FROM = "Forge Bookings <onboarding@resend.dev>";

export type BookingAlert = {
  toolName: string;
  website: string;
  headline: string;
  description: string;
  email: string;
  payerEmail: string;
  price: number;
  days: number;
  orderId: string;
  captureId: string;
  /** Payment captured but the booking could not be saved; it must be added by hand. */
  saveFailed?: boolean;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Emails the owner about a paid booking. Never throws: the booking is already saved. */
export async function sendBookingAlert(booking: BookingAlert) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY is not set; skipping booking email", booking.orderId);
    return;
  }
  const to = process.env.BOOKING_ALERT_EMAIL?.trim() || DEFAULT_ALERT_EMAIL;
  const from = process.env.BOOKING_ALERT_FROM?.trim() || DEFAULT_FROM;
  const adminUrl = `${SITE_URL}/admin/ads`;
  const rows: [string, string][] = [
    ["Tool", booking.toolName],
    ["Website", booking.website],
    ["Headline", booking.headline],
    ["Description", booking.description || "—"],
    ["Contact email", booking.email],
    ["PayPal payer", booking.payerEmail || "—"],
    ["Paid", `$${booking.price} for ${booking.days} days`],
    ["PayPal order", booking.orderId],
    ["PayPal capture", booking.captureId],
  ];
  const title = booking.saveFailed
    ? "ACTION NEEDED: payment received but the booking was not saved"
    : "New paid booking";
  const nextStep = booking.saveFailed
    ? "Create this campaign by hand in Admin → Ad Runs & Partners, or refund the payment in PayPal."
    : "Review and activate it in Admin → Ad Runs & Partners. If you reject it, refund the payment in PayPal.";
  const text = [
    `${title}: ${booking.toolName} ($${booking.price} / ${booking.days} days)`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    nextStep,
    adminUrl,
  ].join("\n");
  const html = `
    <h2 style="margin:0 0 12px">${escapeHtml(title)}</h2>
    <table cellpadding="6" style="border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td style="color:#666">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`,
        )
        .join("")}
    </table>
    <p style="margin-top:16px">${escapeHtml(nextStep)}</p>
    <p><a href="${adminUrl}">Open the admin panel</a></p>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: booking.email,
        subject: `${booking.saveFailed ? "ACTION NEEDED – " : ""}New booking: ${booking.toolName} ($${booking.price} / ${booking.days} days)`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[notify] booking email failed", res.status, await res.text().catch(() => ""));
    }
  } catch (error) {
    console.error("[notify] booking email failed", error);
  }
}
