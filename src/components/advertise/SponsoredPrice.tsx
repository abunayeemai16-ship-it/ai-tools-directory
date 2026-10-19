"use client";

import { useSyncExternalStore } from "react";
import { Clock } from "lucide-react";
import {
  activeOffer,
  discountPercent,
  formatCountdown,
  formatUsd,
  type SponsoredPlacement,
} from "@/lib/advertise";

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

function currentSecond() {
  return Math.floor(Date.now() / 1000) * 1000;
}

/** Wall-clock time that ticks every second; `serverNow` is used for the server render and hydration. */
export function useNow(serverNow: number) {
  return useSyncExternalStore(subscribe, currentSecond, () => serverNow);
}

export function SponsoredPrice({
  placement,
  renderedAt,
}: {
  placement: SponsoredPlacement;
  renderedAt: number;
}) {
  const now = useNow(renderedAt);
  const offer = activeOffer(placement, now);

  if (!offer) {
    return (
      <p className="mt-2">
        <span className="font-serif text-4xl">{formatUsd(placement.price)}</span>
        <span className="text-muted"> / {placement.days} days</span>
      </p>
    );
  }

  return (
    <div className="mt-2">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-serif text-4xl">{formatUsd(offer.price)}</span>
        <span className="text-muted">/ {placement.days} days</span>
        <span className="self-center rounded-full bg-mint/15 px-2.5 py-0.5 text-xs font-bold uppercase text-mint">
          {discountPercent(placement.price, offer.price)}% off
        </span>
      </p>
      <p className="mt-1 text-sm text-muted">
        Was <s>{formatUsd(placement.price)}</s>
      </p>
      <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
        <Clock className="h-4 w-4" />
        Offer ends in
        <span className="font-mono tabular-nums">
          {formatCountdown(Date.parse(offer.endsAt) - now)}
        </span>
      </p>
    </div>
  );
}
