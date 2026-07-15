import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeService } from "@/lib/services/recipe-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const { productId, quantity } = await request.json();

  const result = await recipeService.addProduct(id, session.user.id, productId, quantity ?? 0);
  return NextResponse.json(result);
});

export const DELETE = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const { productId } = await request.json();

  await recipeService.removeProduct(id, session.user.id, productId);
  return NextResponse.json({ success: true });
});
