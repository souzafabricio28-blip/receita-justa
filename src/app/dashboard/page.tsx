import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const recipeCount = await prisma.recipe.count({
    where: { createdById: user?.id },
  });

  const productCount = await prisma.product.count();

  const calcCount = await prisma.profitCalculation.count({
    where: { userId: user?.id },
  });

  const recipes = await prisma.recipe.findMany({
    where: { createdById: user?.id },
    include: {
      products: { include: { product: true } },
      calculations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const totalCost = recipes.reduce((sum, r) => {
    return sum + r.products.reduce((s, rp) => s + rp.product.averagePrice * rp.quantity, 0);
  }, 0);

  const totalProfit = recipes.reduce((sum, r) => {
    return sum + (r.calculations[0]?.profit || 0);
  }, 0);

  const avgMargin = recipes.filter((r) => r.calculations[0]).length > 0
    ? recipes
        .filter((r) => r.calculations[0])
        .reduce((sum, r) => sum + (r.calculations[0]?.profitMargin || 0), 0) /
      recipes.filter((r) => r.calculations[0]).length
    : 0;

  const mostProfitable = recipes
    .filter((r) => r.calculations[0])
    .sort((a, b) => (b.calculations[0]?.profitMargin || 0) - (a.calculations[0]?.profitMargin || 0))
    .slice(0, 3);

  const totalIngredientes = recipes.reduce((sum, r) => sum + r.products.length, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Olá, {user?.name || "usuário"}!
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-xl border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📖</span>
            <div>
              <p className="text-sm text-gray-500">Receitas</p>
              <p className="text-2xl font-bold">{recipeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛒</span>
            <div>
              <p className="text-sm text-gray-500">Produtos</p>
              <p className="text-2xl font-bold">{productCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🥘</span>
            <div>
              <p className="text-sm text-gray-500">Ingredientes</p>
              <p className="text-2xl font-bold">{totalIngredientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-sm text-gray-500">Cálculos</p>
              <p className="text-2xl font-bold">{calcCount}</p>
            </div>
          </div>
        </div>
      </div>

      {recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-5 rounded-xl border">
            <h2 className="font-semibold text-gray-900 mb-3">📊 Custos & Lucros</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Custo total das receitas</span>
                <span className="font-bold text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-gray-600">Lucro total estimado</span>
                <span className="font-bold text-emerald-700">R$ {totalProfit.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Margem média</span>
                <span className="font-bold text-emerald-700">{avgMargin.toFixed(1).replace(".", ",")}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border">
            <h2 className="font-semibold text-gray-900 mb-3">🏆 Receitas mais lucrativas</h2>
            {mostProfitable.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum cálculo de lucro ainda. Calcule o lucro das suas receitas!</p>
            ) : (
              <div className="space-y-2 text-sm">
                {mostProfitable.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between pb-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">{i + 1}º</span>
                      <span className="text-gray-800 font-medium">{r.title}</span>
                    </div>
                    <span className="text-emerald-700 font-semibold">
                      {r.calculations[0]?.profitMargin.toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {recipes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-center">
          <p className="text-4xl mb-3">👨‍🍳</p>
          <h2 className="font-semibold text-amber-800 mb-2">Comece agora!</h2>
          <p className="text-sm text-amber-700 mb-4">
            Crie sua primeira receita ou importe uma da internet para começar a calcular custos e lucros.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/recipes/new"
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Nova Receita
            </Link>
            <Link
              href="/dashboard/recipes/import"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Importar Receita
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
