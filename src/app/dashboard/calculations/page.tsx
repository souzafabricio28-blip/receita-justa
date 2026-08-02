import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function CalculationsPage() {
  const session = await auth();
  const plan = (session?.user as any)?.plan;
  const isPremium = plan === "premium" || plan === "admin";

  if (!isPremium) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-10 shadow-2xl border border-gray-700/50">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Cálculos de Lucro</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            O recurso de cálculos de lucro está disponível apenas no plano Premium.
          </p>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all duration-200 shadow-lg shadow-emerald-500/25"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Fazer Upgrade para Premium
          </Link>
        </div>
      </div>
    );
  }

  const calculations = await prisma.profitCalculation.findMany({
    where: { userId: session?.user?.id },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 mb-10 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cálculos de Lucro</h1>
            <p className="text-emerald-100 text-sm mt-1">
              {calculations.length === 1
                ? "1 cálculo salvo"
                : `${calculations.length} cálculos salvos`}
            </p>
          </div>
        </div>
      </div>

      {calculations.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-16 text-center shadow-sm border border-gray-200/60">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-900 mb-2">Nenhum cálculo ainda</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            Vá até uma receita e clique em &quot;Calcular Lucro&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {calculations.map((calc) => (
            <div
              key={calc.id}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100/80 border-l-4 border-l-emerald-500 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    {calc.recipe.title}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg whitespace-nowrap ml-3">
                    {new Date(calc.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-400 text-xs block mb-0.5">Custo</span>
                    <span className="font-medium text-gray-700">R$ {calc.productCost.toFixed(2)}</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-400 text-xs block mb-0.5">Preço</span>
                    <span className="font-medium text-gray-700">R$ {calc.suggestedPrice.toFixed(2)}</span>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100/50">
                    <span className="text-emerald-500 text-xs block mb-0.5 font-medium">Lucro</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-700">R$ {calc.profit.toFixed(2)}</span>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-100/60 px-1.5 py-0.5 rounded-full">
                        {calc.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
