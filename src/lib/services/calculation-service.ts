import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getRealAveragePrices } from "@/lib/cost";

export interface CalculateProfitInput {
  recipeId: string;
  suggestedPrice: number;
  otherCosts?: number;
  userId: string;
}

export const calculationService = {
  async calculateProfit(input: CalculateProfitInput) {
    const { recipeId, suggestedPrice, userId } = input;
    const otherCosts = input.otherCosts ?? 0;

    if (!recipeId) throw new ValidationError("recipeId é obrigatório");
    if (suggestedPrice <= 0) throw new ValidationError("Preço sugerido deve ser maior que zero");

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, createdById: userId },
      include: { products: { include: { product: true } } },
    });

    if (!recipe) throw new NotFoundError("Receita não encontrada");

    const productIds = recipe.products.map((rp) => rp.product.id);
    const priceMap = await getRealAveragePrices(productIds);

    const productCost = recipe.products.reduce((total, rp) => {
      const unitPrice = priceMap[rp.product.id] ?? 0;
      return total + unitPrice * rp.quantity;
    }, 0);

    const totalCost = productCost + otherCosts;
    const profit = suggestedPrice - totalCost;
    const profitMargin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;

    logger.info("Profit calculated", {
      recipeId,
      productCost,
      otherCosts,
      totalCost,
      suggestedPrice,
      profit,
      profitMargin,
    });

    return prisma.profitCalculation.create({
      data: {
        recipeId,
        userId,
        productCost,
        otherCosts,
        suggestedPrice,
        profit,
        profitMargin,
      },
    });
  },

  async listByUser(userId: string) {
    return prisma.profitCalculation.findMany({
      where: { userId },
      include: { recipe: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
