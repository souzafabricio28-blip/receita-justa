"use client";

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
}

interface RecipeProductData {
  id: string;
  quantity: number;
  product: ProductData;
}

function getPrice(rp: RecipeProductData): number {
  return rp.product.realAveragePrice ?? rp.product.averagePrice ?? 0;
}

function calcTotals(products: RecipeProductData[], scale: number) {
  const byUnit: Record<string, { total: number; count: number }> = {};
  let custoManual = 0;
  let custoReal = 0;

  for (const rp of products) {
    const qty = rp.quantity * scale;
    custoManual += (rp.product.averagePrice ?? 0) * qty;
    custoReal += getPrice(rp) * qty;
    const unit = rp.product.unit;
    if (!byUnit[unit]) byUnit[unit] = { total: 0, count: 0 };
    byUnit[unit].total += qty;
    byUnit[unit].count++;
  }

  return { custoManual, custoReal, byUnit };
}

export function CostSummary({
  products,
  scale,
  portions,
  hasRealPrices,
}: {
  products: RecipeProductData[];
  scale: number;
  portions: number;
  hasRealPrices: boolean;
}) {
  const { custoManual, custoReal, byUnit } = calcTotals(products, scale);
  const costPerPortionReal = custoReal / portions;

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-xs text-gray-500 mb-1">Custo ({hasRealPrices ? "compras" : "manual"})</p>
          <p className="text-xl font-bold text-gray-900">R$ {custoReal.toFixed(2).replace(".", ",")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-purple-100 text-purple-600 mb-2">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-xs text-gray-500 mb-1">Custo / porção</p>
          <p className="text-xl font-bold text-gray-900">R$ {costPerPortionReal.toFixed(2).replace(".", ",")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-600 mb-2">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-xs text-gray-500 mb-1">Rendimento</p>
          <p className="text-xl font-bold text-gray-900">{portions} porções</p>
        </div>
      </div>

      {hasRealPrices && custoManual !== custoReal && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-xl text-sm mb-6 flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-amber-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Custo manual: <strong>R$ {custoManual.toFixed(2).replace(".", ",")}</strong>
          </span>
          <span className="text-amber-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Custo real (compras): <strong>R$ {custoReal.toFixed(2).replace(".", ",")}</strong>
          </span>
          <span className={`font-medium ${custoReal > custoManual ? "text-red-600" : "text-emerald-600"}`}>
            ({(((custoReal - custoManual) / custoManual) * 100).toFixed(0)}% vs manual)
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(byUnit).map(([unit, { total }]) => {
          const icons: Record<string, string> = { kg: "⚖️", g: "⚖️", L: "🧴", ml: "🧴", un: "📦" };
          const label: Record<string, string> = { kg: "Peso total", g: "Peso total", L: "Volume total", ml: "Volume total", un: "Unidades" };
          return (
            <div key={unit} className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
              <span className="text-lg">{icons[unit] || "📏"}</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">{total.toFixed(2).replace(".", ",")} {unit}</p>
              <p className="text-emerald-600 text-xs">{label[unit] || unit}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
