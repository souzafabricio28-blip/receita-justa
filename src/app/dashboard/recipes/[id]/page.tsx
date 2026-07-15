import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getRealAveragePrices } from "@/lib/cost";
import { RecipeDetail } from "@/components/RecipeDetail";

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
      products: { include: { product: { include: { purchases: true } } } },
      calculations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!recipe) notFound();

  const productIds = recipe.products.map((rp) => rp.product.id);
  const priceMap = await getRealAveragePrices(productIds);

  const recipeWithRealPrices = {
    ...recipe,
    products: recipe.products.map((rp) => ({
      ...rp,
      product: {
        ...rp.product,
        realAveragePrice: priceMap[rp.product.id] ?? null,
      },
    })),
  };

  return <RecipeDetail recipe={JSON.parse(JSON.stringify(recipeWithRealPrices))} />;
}
