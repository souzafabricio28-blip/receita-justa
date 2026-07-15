import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";

export const PUT = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  const { name, slug } = await request.json();
  const category = await productService.updateCategory(id, name, slug);
  return NextResponse.json(category);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  await productService.deleteCategory(id);
  return NextResponse.json({ success: true });
});
