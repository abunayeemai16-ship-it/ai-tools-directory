import { NextResponse } from "next/server";
import { generateComparisonFallback, generateReviewFallback } from "@/lib/auto-draft";
import { requireAdminApi } from "@/lib/admin-auth";
import { generateComparisonWithGemini, generateReviewWithGemini, hasUsableGeminiKey } from "@/lib/gemini";
import { listAllTools } from "@/lib/db";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json()) as {
    mode?: "review" | "compare";
    input?: string;
    toolA?: string;
    toolB?: string;
  };

  const tools = await listAllTools();
  const taken = new Set(tools.map((tool) => tool.slug));
  const geminiReady = await hasUsableGeminiKey();

  try {
    if (body.mode === "compare") {
      if (!body.toolA || !body.toolB) {
        return NextResponse.json({ error: "Need two tools" }, { status: 400 });
      }
      if (geminiReady) {
        try {
          const comparison = await generateComparisonWithGemini(body.toolA, body.toolB);
          return NextResponse.json({ ...comparison, source: "gemini" });
        } catch {
          // structured fallback
        }
      }
      return NextResponse.json({
        ...generateComparisonFallback(body.toolA, body.toolB, taken),
        source: "fallback",
      });
    }

    if (!body.input?.trim()) {
      return NextResponse.json({ error: "Missing input" }, { status: 400 });
    }

    if (geminiReady) {
      try {
        const review = await generateReviewWithGemini(body.input);
        return NextResponse.json({ ...review, source: "gemini" });
      } catch {
        // structured fallback
      }
    }
    return NextResponse.json({
      ...generateReviewFallback(body.input, taken),
      source: "fallback",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generator failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
