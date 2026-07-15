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

interface PriceResult {
  title: string;
  price: number;
  store: string;
  url: string;
}

function getPrice(rp: RecipeProductData): number {
  return rp.product.realAveragePrice ?? rp.product.averagePrice;
}

function PriceBadge({ userPrice, marketPrice }: { userPrice: number; marketPrice: number }) {
  const diff = marketPrice > 0 ? ((userPrice - marketPrice) / marketPrice) * 100 : 0;
  const isAbove = diff > 5;
  const isBelow = diff < -5;
  if (!isAbove && !isBelow) return <span className="text-xs text-gray-400">✓ mercado</span>;
  return (
    <span className={`text-xs font-medium ${isAbove ? "text-red-600" : "text-emerald-600"}`}>
      {isAbove ? `+${diff.toFixed(0)}% acima` : `${diff.toFixed(0)}% abaixo`}
    </span>
  );
}

function MarketPrices({ prices }: { prices: PriceResult[] }) {
  if (!prices.length) return null;
  return (
    <details className="text-xs mt-1">
      <summary className="cursor-pointer text-emerald-600 hover:underline">
        {prices.length} preços online
      </summary>
      <div className="mt-1 space-y-0.5">
        {prices.map((p, i) => (
          <div key={i} className="flex justify-between text-gray-500">
            <span className="truncate">{p.title.slice(0, 30)}</span>
            <span>R$ {p.price.toFixed(2).replace(".", ",")}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

export function IngredientTable({
  products,
  scale,
  pricesMap,
  loadingPrices,
  removingId,
  onSearchPrice,
  onRemove,
}: {
  products: RecipeProductData[];
  scale: number;
  pricesMap: Record<string, PriceResult[]>;
  loadingPrices: Record<string, boolean>;
  removingId: string | null;
  onSearchPrice: (productId: string, productName: string) => void;
  onRemove: (productId: string) => void;
}) {
  if (products.length === 0) {
    return <p className="text-gray-400 text-sm">Nenhum ingrediente adicionado.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="pb-2">Produto</th>
          <th className="pb-2">Quantidade</th>
          <th className="pb-2">Preço</th>
          <th className="pb-2">Real (compras)</th>
          <th className="pb-2">Mercado</th>
          <th className="pb-2">Subtotal (real)</th>
          <th className="pb-2"></th>
        </tr>
      </thead>
      <tbody>
        {products.map((rp) => {
          const scaledQty = rp.quantity * scale;
          const realP = rp.product.realAveragePrice;
          const unitPrice = getPrice(rp);
          const prices = pricesMap[rp.product.id];
          const marketAvg = prices && prices.length > 0
            ? prices.reduce((s, p) => s + p.price, 0) / prices.length
            : null;

          return (
            <tr key={rp.id} className="border-b last:border-0">
              <td className="py-2 font-medium">{rp.product.name}</td>
              <td className="py-2">
                <span className={scale !== 1 ? "text-emerald-600 font-medium" : ""}>
                  {scaledQty.toFixed(2).replace(".", ",").replace(/,00$/, "")}
                </span> {rp.product.unit}
                {scale !== 1 && <span className="text-gray-400 text-xs ml-1">(base: {rp.quantity})</span>}
              </td>
              <td className="py-2 text-gray-600">
                R$ {rp.product.averagePrice.toFixed(2).replace(".", ",")} /{rp.product.unit}
              </td>
              <td className="py-2">
                {realP !== null ? (
                  <span className="font-medium">
                    R$ {realP.toFixed(2).replace(".", ",")} /{rp.product.unit}
                    {rp.product.averagePrice > 0 && (
                      <span className={`text-xs ml-1 ${realP > rp.product.averagePrice ? "text-red-500" : "text-emerald-500"}`}>
                        ({(((realP - rp.product.averagePrice) / rp.product.averagePrice) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="py-2">
                {marketAvg !== null ? (
                  <div>
                    <span>R$ {marketAvg.toFixed(2).replace(".", ",")}</span>
                    <PriceBadge userPrice={unitPrice} marketPrice={marketAvg} />
                  </div>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
                {prices && <MarketPrices prices={prices} />}
              </td>
              <td className="py-2 font-medium">
                R$ {(unitPrice * scaledQty).toFixed(2).replace(".", ",")}
              </td>
              <td className="py-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => onSearchPrice(rp.product.id, rp.product.name)}
                    disabled={loadingPrices[rp.product.id]}
                    className="text-xs text-emerald-600 hover:underline disabled:text-gray-300"
                    aria-label="Buscar preços"
                  >
                    {loadingPrices[rp.product.id] ? "..." : "🔍"}
                  </button>
                  <button
                    onClick={() => onRemove(rp.product.id)}
                    disabled={removingId === rp.product.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:text-gray-300"
                    aria-label="Remover ingrediente"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
