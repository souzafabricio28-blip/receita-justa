"use client";

import { useState } from "react";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";

interface Brand {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
  currentStock: number;
  brand: Brand | null;
  brandId: string | null;
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
  return rp.product.realAveragePrice ?? rp.product.averagePrice ?? 0;
}

function PriceBadge({ userPrice, marketPrice }: { userPrice: number; marketPrice: number }) {
  if (userPrice === 0) return null;
  const diff = marketPrice > 0 ? ((userPrice - marketPrice) / marketPrice) * 100 : 0;
  const isAbove = diff > 5;
  const isBelow = diff < -5;
  if (!isAbove && !isBelow) return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>mercado</span>;
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${isAbove ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
      {isAbove ? `+${diff.toFixed(0)}% acima` : `${diff.toFixed(0)}% abaixo`}
    </span>
  );
}

function MarketPrices({ prices, productId, onSelect }: { prices: PriceResult[]; productId: string; onSelect?: (result: PriceResult) => void }) {
  const [showHistory, setShowHistory] = useState(false);
  if (!prices.length) return null;
  return (
    <details className="text-xs mt-1.5">
      <summary className="cursor-pointer text-emerald-600 hover:text-emerald-700 hover:underline font-medium">
        {prices.length} preço{prices.length > 1 ? "s" : ""} online
      </summary>
      <div className="mt-1.5 space-y-1 bg-gray-50 rounded-lg p-2">
        {prices.map((p, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 rounded px-2 py-1.5 transition-colors"
          >
            <button
              onClick={() => onSelect?.(p)}
              className="flex-1 flex items-center gap-2 text-left min-w-0"
              title={`Aplicar R$ ${p.price.toFixed(2).replace(".", ",")}`}
            >
              <span className="truncate max-w-[110px]">{p.title.slice(0, 30)}</span>
              {p.store && <span className="shrink-0 text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{p.store}</span>}
              <span className="font-medium shrink-0">R$ {p.price.toFixed(2).replace(".", ",")}</span>
            </button>
            {p.url && (
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1 text-gray-400 hover:text-emerald-600 rounded transition-colors"
                title="Abrir no site da loja"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
          </div>
        ))}
        <div className="pt-1 border-t border-gray-200">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="w-full text-left text-[11px] text-teal-700 hover:text-teal-800 font-medium py-1"
          >
            {showHistory ? "Ocultar histórico" : "Ver histórico de preços"}
          </button>
          {showHistory && <PriceHistoryChart productId={productId} />}
        </div>
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
  onSelectPrice,
  onRemove,
  kitchenMode,
}: {
  products: RecipeProductData[];
  scale: number;
  pricesMap: Record<string, PriceResult[]>;
  loadingPrices: Record<string, boolean>;
  removingId: string | null;
  onSearchPrice: (productId: string, productName: string) => void;
  onSelectPrice?: (productId: string, result: PriceResult, quantity: number) => void;
  onRemove: (productId: string) => void;
  kitchenMode?: boolean;
}) {
  if (products.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">Nenhum ingrediente adicionado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="pb-3 font-medium">Produto</th>
              <th className="pb-3 font-medium">Quantidade</th>
              <th className="pb-3 font-medium">Estoque</th>
              {!kitchenMode && <th className="pb-3 font-medium">Preço</th>}
              {!kitchenMode && <th className="pb-3 font-medium">Real (compras)</th>}
              {!kitchenMode && <th className="pb-3 font-medium">Mercado</th>}
              {!kitchenMode && <th className="pb-3 font-medium">Subtotal</th>}
              {!kitchenMode && <th className="pb-3 font-medium"></th>}
            </tr>
          </thead>
        <tbody>
          {products.map((rp, idx) => {
            const scaledQty = rp.quantity * scale;
            const realP = rp.product.realAveragePrice;
            const unitPrice = getPrice(rp);
            const prices = pricesMap[rp.product.id];
            const marketAvg = prices && prices.length > 0
              ? prices.reduce((s, p) => s + p.price, 0) / prices.length
              : null;

            return (
              <tr key={rp.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{rp.product.name}</span>
                    {rp.product.brand && (
                      <span className="text-xs text-gray-400 font-normal">({rp.product.brand.name})</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span className={`font-medium ${scale !== 1 ? "text-emerald-600" : "text-gray-900"}`}>
                    {scaledQty.toFixed(2).replace(".", ",").replace(/,00$/, "")}
                  </span>
                  <span className="text-gray-500 ml-1">{rp.product.unit}</span>
                  {scale !== 1 && <span className="text-gray-400 text-xs ml-2">(base: {rp.quantity})</span>}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  {(() => {
                    const stock = rp.product.currentStock ?? 0;
                    const needed = scaledQty;
                    const hasStock = stock >= needed;
                    const hasSome = stock > 0;
                    return (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        hasStock
                          ? "bg-emerald-50 text-emerald-700"
                          : hasSome
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          hasStock ? "bg-emerald-500" : hasSome ? "bg-amber-500" : "bg-red-500"
                        }`} />
                        {stock.toFixed(2).replace(".", ",").replace(/,00$/, "") || "0"} {rp.product.unit}
                        {!hasStock && hasSome && <span className="opacity-70">(faltam {(needed - stock).toFixed(2).replace(".", ",").replace(/,00$/, "")})</span>}
                      </span>
                    );
                  })()}
                </td>
                {!kitchenMode && (
                  <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                    {rp.product.averagePrice !== null ? (
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                        R$ {rp.product.averagePrice.toFixed(2).replace(".", ",")} /{rp.product.unit}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {realP !== null ? (
                      <span className="font-medium text-gray-900">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                          R$ {realP.toFixed(2).replace(".", ",")} /{rp.product.unit}
                        </span>
                        {(rp.product.averagePrice ?? 0) > 0 && (
                          <span className={`text-xs ml-1.5 ${realP > (rp.product.averagePrice ?? 0) ? "text-red-500" : "text-emerald-500"}`}>
                            ({(((realP - (rp.product.averagePrice ?? 0)) / (rp.product.averagePrice ?? 0)) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3 pr-4">
                    {marketAvg !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium">R$ {marketAvg.toFixed(2).replace(".", ",")}</span>
                        <PriceBadge userPrice={unitPrice} marketPrice={marketAvg} />
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {prices && <MarketPrices prices={prices} productId={rp.product.id} onSelect={(result) => onSelectPrice?.(rp.product.id, result, rp.quantity)} />}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3 pr-4 font-medium text-gray-900 whitespace-nowrap">
                    R$ {(unitPrice * scaledQty).toFixed(2).replace(".", ",")}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSearchPrice(rp.product.id, rp.product.name)}
                        disabled={loadingPrices[rp.product.id]}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30"
                        aria-label="Buscar preços"
                        title="Buscar preços"
                      >
                        {loadingPrices[rp.product.id] ? (
                          <span className="text-xs animate-pulse">...</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        )}
                      </button>
                      <button
                        onClick={() => onRemove(rp.product.id)}
                        disabled={removingId === rp.product.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        aria-label="Remover ingrediente"
                        title="Remover"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
