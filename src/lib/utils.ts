import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function starsLabel(rating: number) {
  return rating.toFixed(1);
}

export function clampRating(value: unknown, _slug = "") {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) {
    return Math.min(5, Math.max(1, Math.round(n * 10) / 10));
  }
  return 0;
}

export function clampReviewCount(value: unknown, _slug = "") {
  const n = Math.round(Number(value));
  if (Number.isFinite(n) && n > 0) return n;
  return 0;
}
