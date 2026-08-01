import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const GET = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const products = await productService.search(q || undefined, page);

  return NextResponse.json(products, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { name, unit, brandId } = await request.json();
  const product = await productService.create({ name, unit, brandId });
  return NextResponse.json(product, { status: 201 });
});

export const DELETE = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("deleteAllProducts");
  if (planError) return planError;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("all") !== "true") {
    return NextResponse.json({ error: "Parâmetro inválido" }, { status: 400 });
  }

  await productService.deleteAll();
  return NextResponse.json({ success: true });
});
