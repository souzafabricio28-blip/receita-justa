import { NextResponse } from "next/server";
import { categoryService } from "@/lib/services/category-service";
import { withErrorHandler } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const categories = await categoryService.list();
  return NextResponse.json(categories);
});

export const POST = withErrorHandler(async (request: Request) => {
  const { name, slug } = await request.json();
  const category = await categoryService.create(name, slug);
  return NextResponse.json(category, { status: 201 });
});
