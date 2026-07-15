"use client";

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number;
  realAveragePrice: number | null;
}

interface RecipeProductData {
  id: string;
  quantity: number;
  product: ProductData;
}

function getPrice(rp: RecipeProductData): number {
  return rp.product.realAveragePrice ?? rp.product.averagePrice;
}

function calcTotals(products: RecipeProductData[], scale: number) {
  const byUnit: Record<string, { total: number; count: number }> = {};
  let custoManual = 0;
  let custoReal = 0;

  for (const rp of products) {
    const qty = rp.quantity * scale;
    custoManual += rp.product.averagePrice * qty;
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
        <div className="bg-white p-4 rounded-xl border text-center">
          <p className="text-xs text-gray-500">Custo ({hasRealPrices ? "compras" : "manual"})</p>
          <p className="text-lg font-bold text-gray-900">R$ {custoReal.toFixed(2).replace(".", ",")}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border text-center">
          <p className="text-xs text-gray-500">Custo / porção</p>
          <p className="text-lg font-bold text-gray-900">R$ {costPerPortionReal.toFixed(2).replace(".", ",")}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border text-center">
          <p className="text-xs text-gray-500">Rendimento</p>
          <p className="text-lg font-bold text-gray-900">{portions} porções</p>
        </div>
      </div>

      {hasRealPrices && custoManual !== custoReal && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm mb-4 flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-amber-700">📊 Custo manual: <strong>R$ {custoManual.toFixed(2).replace(".", ",")}</strong></span>
          <span className="text-amber-700">Custo real (compras): <strong>R$ {custoReal.toFixed(2).replace(".", ",")}</strong></span>
          <span className={`font-medium ${custoReal > custoManual ? "text-red-600" : "text-emerald-600"}`}>
            ({(((custoReal - custoManual) / custoManual) * 100).toFixed(0)}% vs manual)
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {Object.entries(byUnit).map(([unit, { total }]) => {
          const label: Record<string, string> = { kg: "Peso total", L: "Volume total", ml: "Volume total", g: "Peso total", un: "Unidades" };
          return (
            <div key={unit} className="bg-emerald-50 p-3 rounded-lg text-center text-sm">
              <p className="text-emerald-700 font-medium">{total.toFixed(2).replace(".", ",")} {unit}</p>
              <p className="text-emerald-600 text-xs">{label[unit] || unit}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
