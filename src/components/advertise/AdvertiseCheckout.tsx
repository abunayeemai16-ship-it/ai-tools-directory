"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ADVERTISE_LIMITS,
  HOMEPAGE_FEATURED,
  parseAdvertiseOrder,
  type AdvertiseOrderInput,
} from "@/lib/advertise";

type PayPalActions = { resolve: () => Promise<void>; reject: () => Promise<void> };
type PayPalButtons = {
  isEligible: () => boolean;
  render: (container: HTMLElement) => Promise<void>;
  close?: () => Promise<void>;
};
type PayPalNamespace = {
  Buttons: (options: {
    style?: Record<string, string>;
    onClick?: (data: unknown, actions: PayPalActions) => Promise<void> | void;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (error: unknown) => void;
  }) => PayPalButtons;
};

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const SDK_ID = "paypal-sdk";

function loadPayPal(clientId: string) {
  return new Promise<PayPalNamespace>((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    let script = document.getElementById(SDK_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SDK_ID;
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${HOMEPAGE_FEATURED.currency}&intent=capture&components=buttons`;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () =>
      window.paypal ? resolve(window.paypal) : reject(new Error("PayPal failed to load.")),
    );
    script.addEventListener("error", () => reject(new Error("PayPal failed to load.")));
  });
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: { error?: string; orderId?: string; ok?: boolean } = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: "The server returned an unexpected response. Please try again." };
  }
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

const EMPTY: AdvertiseOrderInput = {
  toolName: "",
  website: "",
  headline: "",
  description: "",
  email: "",
};

export function AdvertiseCheckout({
  clientId,
  available,
}: {
  clientId: string;
  available: boolean;
}) {
  const [form, setForm] = useState<AdvertiseOrderInput>(EMPTY);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "paying" | "done" | "unavailable">(
    clientId && available ? "loading" : "unavailable",
  );
  const formRef = useRef(form);
  const agreedRef = useRef(agreed);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formRef.current = form;
    agreedRef.current = agreed;
  }, [form, agreed]);

  useEffect(() => {
    if (!clientId || !available) return;
    let cancelled = false;
    let buttons: PayPalButtons | null = null;
    loadPayPal(clientId)
      .then((paypal) => {
        if (cancelled || !containerRef.current) return;
        buttons = paypal.Buttons({
          style: { layout: "vertical", color: "gold", shape: "pill", label: "pay" },
          onClick: (_data, actions) => {
            const parsed = parseAdvertiseOrder(formRef.current);
            if (typeof parsed === "string") {
              setError(parsed);
              return actions.reject();
            }
            if (!agreedRef.current) {
              setError("Please confirm your product follows the advertising guidelines.");
              return actions.reject();
            }
            setError("");
            return actions.resolve();
          },
          createOrder: async () => {
            try {
              const data = await postJson("/api/advertise/order", formRef.current);
              return data.orderId || "";
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not start checkout.");
              throw err;
            }
          },
          onApprove: async ({ orderID }) => {
            setState("paying");
            try {
              await postJson("/api/advertise/capture", { ...formRef.current, orderId: orderID });
              setState("done");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Payment could not be completed.");
              setState("ready");
            }
          },
          onCancel: () => setError("Checkout was cancelled. You have not been charged."),
          onError: () =>
            setError((current) => current || "PayPal reported an error. You have not been charged."),
        });
        if (!buttons.isEligible()) {
          setState("unavailable");
          return;
        }
        return buttons.render(containerRef.current).then(() => {
          if (!cancelled) setState("ready");
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError("PayPal could not be loaded. Disable blockers or try again later.");
          setState("unavailable");
        }
      });
    return () => {
      cancelled = true;
      buttons?.close?.().catch(() => {});
    };
  }, [clientId, available]);

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-mint/30 bg-mint/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-mint" />
        <h3 className="mt-3 font-serif text-2xl">Payment received</h3>
        <p className="mt-2 text-sm text-muted">
          Your booking is in our review queue. Once approved, your banner runs for{" "}
          {HOMEPAGE_FEATURED.days} days. We will contact you at {form.email}. Your PayPal receipt
          is your proof of purchase.
        </p>
      </div>
    );
  }

  const set = (key: keyof AdvertiseOrderInput) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tool name" value={form.toolName} onChange={set("toolName")} max={ADVERTISE_LIMITS.toolName} placeholder="Northstar AI" />
        <Field label="Website" value={form.website} onChange={set("website")} type="url" placeholder="https://" />
      </div>
      <Field
        label="Banner headline"
        value={form.headline}
        onChange={set("headline")}
        max={ADVERTISE_LIMITS.headline}
        placeholder="Write product docs 5× faster with Northstar"
      />
      <Field
        label="Short description (optional)"
        value={form.description}
        onChange={set("description")}
        max={ADVERTISE_LIMITS.description}
        placeholder="One sentence on who it is for and what it does."
      />
      <Field label="Contact email" value={form.email} onChange={set("email")} type="email" placeholder="you@company.com" />
      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-1 accent-accent"
        />
        <span>
          My product is AI-related and follows the advertising guidelines below. I understand Forge
          may edit the copy for clarity and will refund in full if the booking is rejected.
        </span>
      </label>

      {error ? <p className="text-sm text-rose">{error}</p> : null}

      {!available ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          This placement is currently booked. Check back after the next opening date above.
        </p>
      ) : !clientId ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Online checkout is not available yet. Please check back soon.
        </p>
      ) : null}

      {state === "loading" ? <p className="text-sm text-muted">Loading PayPal checkout…</p> : null}
      {state === "paying" ? <p className="text-sm text-muted">Confirming your payment…</p> : null}
      <div ref={containerRef} className={state === "paying" ? "pointer-events-none opacity-50" : ""} />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  max?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex justify-between text-muted">
        {label}
        {max ? (
          <span className="text-xs">
            {value.length}/{max}
          </span>
        ) : null}
      </span>
      <input
        type={type}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none"
      />
    </label>
  );
}
