import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { withErrorHandler } from "@/lib/errors";

export const PATCH = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const allowedFields = ["name", "unit", "averagePrice", "category"];
  const data = Object.fromEntries(
    allowedFields.filter((f) => f in body).map((f) => [f, body[f]])
  );

  const product = await productService.update(id, data);
  return NextResponse.json(product);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await productService.delete(id);
  return NextResponse.json({ success: true });
});
