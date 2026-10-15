import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { listAllTools, addCategory, listCategories } from "@/lib/db";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const [categories, tools] = await Promise.all([listCategories(), listAllTools()]);
  return NextResponse.json({
    categories: categories.map((item) => ({
      ...item,
      toolCount: tools.filter((tool) => tool.category === item.slug).length,
    })),
  });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const body = (await request.json()) as { name?: string; slug?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  try {
    const category = await addCategory(body.name, body.slug);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add category";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
