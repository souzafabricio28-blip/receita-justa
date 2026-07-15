import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const categories = await productService.listCategories();
  return NextResponse.json(categories);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { name, slug } = await request.json();
  const category = await productService.createCategory(name, slug);
  return NextResponse.json(category, { status: 201 });
});
