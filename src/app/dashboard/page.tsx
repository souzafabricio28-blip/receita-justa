import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const recipeCount = await prisma.recipe.count({
    where: { createdById: user?.id },
  });

  const productCount = await prisma.product.count({
    where: { userId: user?.id },
  });

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

  const chartData = recipes
    .filter((r) => r.calculations[0])
    .map((r) => {
      const c = r.calculations[0]!;
      return {
        name: r.title,
        custoTotal: c.productCost + c.packagingCost + c.transportCost + c.laborCost,
        lucroLiquido: c.profit,
      };
    });

  const totalCost = chartData.reduce((s, d) => s + d.custoTotal, 0);

  const totalProfit = chartData.reduce((s, d) => s + d.lucroLiquido, 0);

  const calculations = recipes.map((r) => r.calculations[0]).filter(Boolean) as NonNullable<typeof recipes[0]['calculations'][0]>[];

  const avgMargin = calculations.length > 0
    ? calculations.reduce((sum, c) => sum + c.profitMargin, 0) / calculations.length
    : 0;

  const avgMarkup = calculations.length > 0
    ? calculations.reduce((sum, c) => sum + c.desiredMargin, 0) / calculations.length
    : 0;

  const mostProfitable = recipes
    .filter((r) => r.calculations[0])
    .sort((a, b) => (b.calculations[0]?.profitMargin || 0) - (a.calculations[0]?.profitMargin || 0))
    .slice(0, 3);

  const bestMarginRecipe = mostProfitable[0];

  const totalIngredientes = recipes.reduce((sum, r) => sum + r.products.length, 0);

  const statCards = [
    { label: "Receitas", value: recipeCount, icon: "📖", gradient: "from-emerald-500 to-teal-500" },
    { label: "Produtos", value: productCount, icon: "🛒", gradient: "from-blue-500 to-indigo-500" },
    { label: "Ingredientes", value: totalIngredientes, icon: "🥘", gradient: "from-purple-500 to-pink-500" },
    { label: "Cálculos", value: calcCount, icon: "💰", gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div>
      {/* Welcome hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/70 text-xs mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Dashboard
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Olá, {user?.name?.split(" ")[0] || "usuário"}! 👋
            </h1>
            <p className="text-gray-400 text-sm max-w-lg">
              {recipeCount > 0
                ? `Você tem ${recipeCount} receita${recipeCount > 1 ? "s" : ""} cadastrada${recipeCount > 1 ? "s" : ""} e ${productCount} produto${productCount > 1 ? "s" : ""}.`
                : "Comece cadastrando sua primeira receita ou produto."}
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Link
              href="/dashboard/recipes/new"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nova Receita
            </Link>
            <Link
              href="/dashboard/recipes/import"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importar
            </Link>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group cursor-default">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recipes.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Financial overview */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Custos & Lucros
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Custo total das receitas</span>
                  <span className="font-bold text-lg text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Lucro total estimado</span>
                  <span className="font-bold text-lg text-emerald-600">+ R$ {totalProfit.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Margem média</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                        style={{ width: `${Math.min(avgMargin, 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-emerald-600">{avgMargin.toFixed(1).replace(".", ",")}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Most profitable */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                Receitas mais lucrativas
              </h2>
              {mostProfitable.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum cálculo de lucro ainda.</p>
              ) : (
                <div className="space-y-3">
                  {mostProfitable.map((r, i) => (
                    <Link
                      key={r.id}
                      href={`/dashboard/recipes/${r.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                          i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                          i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500" :
                          "bg-gradient-to-br from-orange-400 to-red-500"
                        }`}>
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-600 transition-colors">{r.title}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {r.calculations[0]?.profitMargin.toFixed(1).replace(".", ",")}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Financial metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Markup Médio</p>
              <p className="text-2xl font-bold text-gray-900">{avgMarkup.toFixed(1).replace(".", ",")}%</p>
              <p className="text-xs text-gray-400 mt-1">Margem de lucro desejada em média</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Receita com Maior Margem</p>
              {bestMarginRecipe ? (
                <>
                  <p className="text-lg font-bold text-gray-900 truncate">{bestMarginRecipe.title}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    {bestMarginRecipe.calculations[0]?.profitMargin.toFixed(1).replace(".", ",")}% de margem
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Custo Total (insumos)</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-gray-400 mt-1">Produto + embalagem + transporte + mão de obra</p>
            </div>
          </div>

          {/* Charts */}
          <div className="mb-8">
            <AnalyticsCharts data={chartData} />
          </div>
        </>
      )}

      {/* Empty state */}
      {recipes.length === 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-lg shadow-emerald-200/50">
            👨‍🍳
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Comece agora!</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Crie sua primeira receita ou importe uma da internet para começar a calcular custos e lucros.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/recipes/new"
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-200/50 hover:shadow-lg transition-all"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nova Receita
              </span>
            </Link>
            <Link
              href="/dashboard/recipes/import"
              className="bg-white text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Importar Receita
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
