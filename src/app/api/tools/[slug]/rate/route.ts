import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addVisitorRating } from "@/lib/db";

const COOKIE = "forge_rated";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json()) as { stars?: number };
  const stars = Number(body.stars);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Choose 1 to 5 stars" }, { status: 400 });
  }

  const store = await cookies();
  const rated = (store.get(COOKIE)?.value || "").split(",").filter(Boolean);
  if (rated.includes(slug)) {
    return NextResponse.json({ error: "You already rated this tool" }, { status: 409 });
  }

  const result = await addVisitorRating(slug, stars);
  if (!result) {
    return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  }

  const next = [...new Set([...rated, slug])].slice(-200);
  store.set(COOKIE, next.join(","), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return NextResponse.json(result);
}
