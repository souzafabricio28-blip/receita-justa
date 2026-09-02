import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;

  let scale = 1;
  try {
    const body = await request.json();
    scale = body.scale ?? 1;
  } catch {}

  const recipe = await prisma.recipe.findFirst({
    where: { id, createdById: session.user.id },
    include: {
      products: {
        include: { product: true },
      },
    },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Receita não encontrada" }, { status: 404 });
  }

  const consumed: { productId: string; name: string; deducted: number }[] = [];
  const errors: { productId: string; name: string; message: string }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const rp of recipe.products) {
      const needed = rp.quantity * scale;

      const result = await tx.product.updateMany({
        where: { id: rp.product.id, userId: session.user.id, currentStock: { gte: needed } },
        data: { currentStock: { decrement: needed } },
      });

      if (result.count === 0) {
        const current = await tx.product.findUnique({
          where: { id: rp.product.id },
          select: { currentStock: true },
        });
        errors.push({
          productId: rp.product.id,
          name: rp.product.name,
          message: `Estoque insuficiente: tem ${current?.currentStock ?? 0} ${rp.product.unit}, precisa ${needed} ${rp.product.unit}`,
        });
        continue;
      }

      consumed.push({
        productId: rp.product.id,
        name: rp.product.name,
        deducted: needed,
      });
    }
  });

  const updatedStock = await Promise.all(
    consumed.map((c) =>
      prisma.product.findUnique({
        where: { id: c.productId },
        select: { id: true, currentStock: true },
      })
    )
  );

  return NextResponse.json({
    success: errors.length === 0,
    consumed,
    errors,
    partial: errors.length > 0 && consumed.length > 0,
    updatedStock: updatedStock.filter(Boolean).map((s) => ({
      productId: s!.id,
      currentStock: s!.currentStock,
    })),
  });
});
