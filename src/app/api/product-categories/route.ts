import { NextResponse } from "next/server";
import { productService } from "@/lib/services/product-service";
import { withErrorHandler } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const categories = await productService.listCategories();
  return NextResponse.json(categories);
});

export const POST = withErrorHandler(async (request: Request) => {
  const { name, slug } = await request.json();
  const category = await productService.createCategory(name, slug);
  return NextResponse.json(category, { status: 201 });
});
