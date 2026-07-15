import { NextResponse } from "next/server";
import { categoryService } from "@/lib/services/category-service";
import { withErrorHandler } from "@/lib/errors";

export const PUT = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const { name, slug } = await request.json();
  const category = await categoryService.update(id, name, slug);
  return NextResponse.json(category);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await categoryService.delete(id);
  return NextResponse.json({ success: true });
});
