import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { RecipeDetail } from "@/components/RecipeDetail";

function getLastPurchasePrice(purchases: { totalPrice: number; quantity: number }[]): number | null {
  if (purchases.length === 0) return null;
  const last = purchases[0];
  return last.quantity > 0 ? last.totalPrice / last.quantity : null;
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const recipe = await prisma.recipe.findFirst({
    where: { id, createdById: session?.user?.id },
    include: {
      category: true,
      products: {
        include: {
          product: {
            include: {
              brand: true,
              purchases: { orderBy: { date: "desc" } },
            },
          },
        },
      },
      calculations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!recipe) notFound();

  const recipeWithPrices = {
    ...recipe,
    products: recipe.products.map((rp) => ({
      ...rp,
      product: {
        ...rp.product,
        averagePrice: rp.product.averagePrice,
        realAveragePrice: getLastPurchasePrice(rp.product.purchases),
        currentStock: rp.product.currentStock,
      },
    })),
  };

  return <RecipeDetail recipe={JSON.parse(JSON.stringify(recipeWithPrices))} />;
}
