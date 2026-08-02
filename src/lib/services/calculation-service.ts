import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getRealAveragePrices } from "@/lib/cost";

export interface CalculateProfitInput {
  recipeId: string;
  suggestedPrice: number;
  packagingCost?: number;
  transportCost?: number;
  laborCost?: number;
  feePercent?: number;
  desiredMargin?: number;
  userId: string;
}

export const calculationService = {
  async calculateProfit(input: CalculateProfitInput) {
    const { recipeId, suggestedPrice, userId } = input;
    const packagingCost = input.packagingCost ?? 0;
    const transportCost = input.transportCost ?? 0;
    const laborCost = input.laborCost ?? 0;
    const feePercent = input.feePercent ?? 0;
    const desiredMargin = input.desiredMargin ?? 0;

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

    const operationalCost = packagingCost + transportCost + laborCost;
    const totalCost = productCost + operationalCost;
    const feeDeduction = suggestedPrice * (feePercent / 100);
    const profit = suggestedPrice - totalCost - feeDeduction;
    const profitMargin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;

    logger.info("Profit calculated", {
      recipeId,
      productCost,
      packagingCost,
      transportCost,
      laborCost,
      feePercent,
      desiredMargin,
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
        packagingCost,
        transportCost,
        laborCost,
        feePercent,
        desiredMargin,
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
