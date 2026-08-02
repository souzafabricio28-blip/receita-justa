import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeService } from "@/lib/services/recipe-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

function getLastPurchasePrice(purchases: { totalPrice: number; quantity: number }[]): number | null {
  if (purchases.length === 0) return null;
  const last = purchases[0];
  return last.quantity > 0 ? last.totalPrice / last.quantity : null;
}

export const POST = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const { productId, quantity } = await request.json();

  const result = await recipeService.addProduct(id, session.user.id, productId, quantity ?? 0);
  const enriched = {
    ...result,
    product: {
      ...result.product,
      realAveragePrice: getLastPurchasePrice(result.product.purchases || []),
      averagePrice: result.product.averagePrice,
      brand: result.product.brand,
      brandId: result.product.brandId,
    },
  };
  return NextResponse.json(enriched);
});

export const DELETE = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const { productId } = await request.json();

  await recipeService.removeProduct(id, session.user.id, productId);
  return NextResponse.json({ success: true });
});
