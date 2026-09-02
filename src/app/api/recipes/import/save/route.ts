import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shouldSkipCalculation } from "@/lib/conversions";
import { withErrorHandler, getSessionOrThrow, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface SaveIngredient {
  name: string;
  quantity: number;
  unit: string;
  productId?: string;
  productName?: string;
  averagePrice?: number;
  skipCalculation?: boolean;
}

export const POST = withErrorHandler(async (request: Request) => {
  const session = getSessionOrThrow(await auth());

  const { title, description, instructions, yield: recipeYield, ingredients } = await request.json();
  if (!title?.trim()) throw new ValidationError("Título é obrigatório");

  logger.info("Saving imported recipe", { title, ingredientCount: ingredients?.length });

  const recipe = await prisma.recipe.create({
    data: {
      title: title.trim(),
      description: description?.trim(),
      instructions: instructions?.trim(),
      yield: recipeYield || 1,
      createdById: session.user.id,
    },
  });

  if (Array.isArray(ingredients)) {
    for (const ing of ingredients as SaveIngredient[]) {
      if (shouldSkipCalculation(ing.name)) continue;

      let productId = ing.productId;
      const productName = ing.productName || ing.name;

      if (!productId && productName) {
        const existing = await prisma.product.findFirst({
          where: {
            userId: session.user.id,
            name: { contains: productName, mode: "insensitive" },
          },
        });
        productId = existing?.id;
      }

      if (!productId && productName) {
        const created = await prisma.product.create({
          data: {
            userId: session.user.id,
            name: productName.trim(),
            unit: ing.unit || "un",
            averagePrice: 0,
          },
        });
        productId = created.id;
      }

      if (!productId) continue;

      const owned = await prisma.product.findFirst({
        where: { id: productId, userId: session.user.id },
        select: { id: true },
      });
      if (!owned) continue;

      if (ing.averagePrice && ing.averagePrice > 0) {
        const effectiveUnit = ing.unit || "un";
        await prisma.product.update({
          where: { id: productId },
          data: { averagePrice: ing.averagePrice, unit: effectiveUnit },
        });
      }

      await prisma.recipeProduct.upsert({
        where: { recipeId_productId: { recipeId: recipe.id, productId } },
        update: { quantity: ing.quantity ?? 0 },
        create: { recipeId: recipe.id, productId, quantity: ing.quantity ?? 0 },
      });
    }
  }

  return NextResponse.json({ success: true, recipeId: recipe.id }, { status: 201 });
});
