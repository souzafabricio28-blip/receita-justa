import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function RecipesPage() {
  const session = await auth();
  const recipes = await prisma.recipe.findMany({
    where: { createdById: session?.user?.id },
    include: { category: true, products: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Receitas</h1>
        <Link
          href="/dashboard/recipes/new"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + Nova Receita
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">📖</p>
          <p className="text-lg mb-4">Nenhuma receita ainda</p>
          <Link
            href="/dashboard/recipes/new"
            className="text-emerald-600 font-medium hover:underline"
          >
            Criar primeira receita
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {recipes.map((recipe) => {
            const totalCost = recipe.products.reduce(
              (sum, rp) => sum + rp.product.averagePrice * rp.quantity,
              0
            );
            return (
              <Link
                key={recipe.id}
                href={`/dashboard/recipes/${recipe.id}`}
                className="bg-white p-4 rounded-xl border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
                    {recipe.description && (
                      <p className="text-sm text-gray-500 mt-1">{recipe.description}</p>
                    )}
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                      {recipe.category && <span>{recipe.category.name}</span>}
                      <span>{recipe.products.length} ingredientes</span>
                      {recipe.yield && <span>Rende {recipe.yield} porções</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      R$ {totalCost.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">custo total</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
