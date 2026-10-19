import { after, NextResponse } from "next/server";
import { parseCompareNames } from "@/lib/compare";
import {
  clientIp,
  countRepeatRequest,
  liveComparison,
  LiveCompareError,
  turnstileEnabled,
  verifyTurnstile,
} from "@/lib/live-compare";

export const maxDuration = 60;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Forbidden.", 403);
  const body = (await request.json().catch(() => null)) as
    | { a?: unknown; b?: unknown; token?: unknown }
    | null;
  const names = parseCompareNames(body?.a, body?.b);
  if (typeof names === "string") return fail(names);
  const ip = clientIp(request.headers);
  if (turnstileEnabled()) {
    const token = typeof body?.token === "string" ? body.token : "";
    if (!token || !(await verifyTurnstile(token, ip))) {
      return fail("Please complete the human check and try again.", 403);
    }
  }
  try {
    const { result, cached, key } = await liveComparison(names.a, names.b, ip);
    if (cached) after(() => countRepeatRequest(key).catch(() => undefined));
    return NextResponse.json({ result, cached });
  } catch (error) {
    if (error instanceof LiveCompareError) return fail(error.message, error.status);
    console.error("[compare] live comparison failed", error);
    return fail("We couldn't research this matchup right now. Please try again in a few minutes.", 502);
  }
}
