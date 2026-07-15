import { prisma } from "./db";

export async function getRealAveragePrice(productId: string): Promise<number> {
  const prices = await getRealAveragePrices([productId]);
  return prices[productId] ?? 0;
}

export async function getRealAveragePrices(
  productIds: string[]
): Promise<Record<string, number>> {
  if (productIds.length === 0) return {};

  const purchases = await prisma.purchase.findMany({
    where: { productId: { in: productIds } },
    orderBy: { date: "desc" },
  });

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(products.map((p) => [p.id, p.averagePrice]));

  const totals: Record<string, { qty: number; spent: number }> = {};
  for (const p of purchases) {
    if (!totals[p.productId]) totals[p.productId] = { qty: 0, spent: 0 };
    totals[p.productId].qty += p.quantity;
    totals[p.productId].spent += p.totalPrice;
  }

  const result: Record<string, number> = {};
  for (const id of productIds) {
    const t = totals[id];
    if (t && t.qty > 0) {
      result[id] = t.spent / t.qty;
    } else {
      result[id] = productMap.get(id) ?? 0;
    }
  }

  return result;
}

export async function getRecipeRealCost(recipeId: string): Promise<{
  totalCost: number;
  items: { name: string; qty: number; unit: string; unitPrice: number; subtotal: number }[];
}> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { products: { include: { product: true } } },
  });

  if (!recipe) return { totalCost: 0, items: [] };

  const productIds = recipe.products.map((rp) => rp.product.id);
  const priceMap = await getRealAveragePrices(productIds);

  const items = recipe.products.map((rp) => {
    const unitPrice = priceMap[rp.product.id] ?? 0;
    return {
      name: rp.product.name,
      qty: rp.quantity,
      unit: rp.product.unit,
      unitPrice,
      subtotal: unitPrice * rp.quantity,
    };
  });

  return {
    totalCost: items.reduce((s, i) => s + i.subtotal, 0),
    items,
  };
}
