import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("purchases");
  if (planError) return planError;

  const { productId, quantity, totalPrice, store, notes } = await request.json();
  const purchase = await productService.recordPurchase(
    session.user.id,
    productId,
    quantity,
    totalPrice,
    store,
    notes
  );
  return NextResponse.json(purchase, { status: 201 });
});

export const GET = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const purchases = await productService.listPurchases(session.user.id, productId || undefined);
  return NextResponse.json(purchases);
});
