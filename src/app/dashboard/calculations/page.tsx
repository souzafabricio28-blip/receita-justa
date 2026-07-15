import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function CalculationsPage() {
  const session = await auth();
  const isPremium = (session?.user as any)?.plan === "premium";

  if (!isPremium) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">💰 Cálculos de Lucro</h1>
        <p className="text-gray-500 mb-6">
          O recurso de cálculos de lucro está disponível apenas no plano Premium.
        </p>
        <Link
          href="/dashboard/subscription"
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-emerald-700 inline-block"
        >
          ⭐ Fazer Upgrade para Premium
        </Link>
      </div>
    );
  }

  const calculations = await prisma.profitCalculation.findMany({
    where: { userId: session?.user?.id },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Cálculos de Lucro</h1>

      {calculations.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">💰</p>
          <p className="text-lg">Nenhum cálculo ainda</p>
          <p className="text-sm mt-2">
            Vá até uma receita e clique em &quot;Calcular Lucro&quot;
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {calculations.map((calc) => (
            <div key={calc.id} className="bg-white p-4 rounded-xl border">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {calc.recipe.title}
                  </h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Custo: R$ {calc.productCost.toFixed(2)}</span>
                    <span>Preço: R$ {calc.suggestedPrice.toFixed(2)}</span>
                    <span className="font-medium text-emerald-600">
                      Lucro: R$ {calc.profit.toFixed(2)} ({calc.profitMargin.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(calc.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
