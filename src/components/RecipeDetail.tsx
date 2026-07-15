"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CostSummary } from "@/components/CostSummary";
import { AddProductSearch } from "@/components/AddProductSearch";
import { IngredientTable } from "@/components/IngredientTable";
import { ProfitCalculatorModal } from "@/components/ProfitCalculatorModal";
import { usePlan } from "@/lib/use-plan";
import { useRecipeProducts } from "@/lib/hooks/use-recipe-products";
import { useProfitCalculation } from "@/lib/hooks/use-profit-calculation";
import { useCategoryAssign } from "@/lib/hooks/use-category-assign";

interface CalcData {
  createdAt: string;
  profit: number;
  profitMargin: number;
  suggestedPrice: number;
}

interface RecipeData {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  yield: number | null;
  category: { id: string; name: string } | null;
  products: {
    id: string;
    quantity: number;
    product: { id: string; name: string; unit: string; averagePrice: number; realAveragePrice: number | null };
  }[];
  calculations: CalcData[];
}

export function RecipeDetail({ recipe }: { recipe: RecipeData }) {
  const router = useRouter();
  const { toast } = useToast();

  const baseYield = recipe.yield || 1;
  const [portions, setPortions] = useState(baseYield);
  const [portionsInput, setPortionsInput] = useState(String(baseYield));
  const scale = portions / baseYield;

  const {
    products, pricesMap, loadingPrices, removingId,
    custoReal, marketTotalCost, hasRealPrices,
    searchProductPrice, addProduct, removeProduct,
  } = useRecipeProducts(recipe.id, recipe.products);

  const {
    showModal: showCalcModal, setShowModal: setShowCalcModal,
    calculating, lastCalc, calculateProfit,
  } = useProfitCalculation(recipe.id, recipe.calculations?.[0] || null);

  const { categories, selectedCategory, assigning, assignCategory } = useCategoryAssign(recipe.id, recipe.category?.id || "");

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { can } = usePlan();

  const totalCost = custoReal(scale);
  const marketCost = marketTotalCost(scale);
  const savings = marketCost - totalCost;

  async function deleteRecipe() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Receita excluída", "success");
        router.push("/dashboard/recipes");
      }
    } catch {
      toast("Erro ao excluir receita", "error");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <style>{`@media print {
        nav, header, .fixed, .z-50, button, select,
        .hidden-print { display: none !important; }
        body { background: white !important; font-size: 12pt; }
        .max-w-4xl { max-width: 100% !important; margin: 0 !important; }
        .print-only { display: block !important; }
      }
      .print-only { display: none; }`}</style>

      <div className="flex items-center justify-between mb-4 hidden-print">
        <Link href="/dashboard/recipes" className="text-sm text-emerald-600 hover:underline inline-block">
          ← Voltar
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors">
            🖨️ PDF
          </button>
          <Link href={`/dashboard/recipes/${recipe.id}/edit`} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors">
            ✏️ Editar
          </Link>
          <button onClick={() => setDeleteConfirm(true)} className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            🗑️ Excluir
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
      {recipe.description && <p className="text-gray-600 mb-4">{recipe.description}</p>}

      <div className="flex items-center gap-3 mb-4 hidden-print">
        <select
          value={selectedCategory}
          onChange={(e) => assignCategory(e.target.value)}
          disabled={assigning}
          className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Sem categoria</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white p-4 rounded-xl border mb-6 flex items-center gap-4 hidden-print">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Porções:</label>
        <input
          type="text"
          inputMode="numeric"
          value={portionsInput}
          onChange={(e) => setPortionsInput(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            const v = Math.max(1, Number(portionsInput) || baseYield);
            setPortions(v);
            setPortionsInput(String(v));
          }}
          className="w-20 px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        {portions !== baseYield && <span className="text-xs text-gray-400">(base: {baseYield})</span>}
      </div>

      <div className="hidden-print">
        <CostSummary products={products} scale={scale} portions={portions} hasRealPrices={hasRealPrices} />
      </div>

      {Object.keys(pricesMap).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 hidden-print">
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-xs text-gray-500">Custo (real)</p>
            <p className="text-lg font-bold text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border text-center">
            <p className="text-xs text-gray-500">Custo (preço mercado)</p>
            <p className="text-lg font-bold text-gray-900">R$ {marketCost.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className={`p-4 rounded-xl border text-center ${savings >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
            <p className="text-xs text-gray-500">Diferença</p>
            <p className={`text-lg font-bold ${savings >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {savings >= 0 ? "Economia" : "Prejuízo"} de R$ {Math.abs(savings).toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Ingredientes</h2>
          <div className="hidden-print">
            <AddProductSearch existingProductIds={products.map((p) => p.product.id)} onAdd={addProduct} />
          </div>
        </div>
        <IngredientTable
          products={products}
          scale={scale}
          pricesMap={pricesMap}
          loadingPrices={loadingPrices}
          removingId={removingId}
          onSearchPrice={searchProductPrice}
          onRemove={removeProduct}
        />
      </div>

      {recipe.instructions && (
        <div className="bg-white p-6 rounded-xl border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Modo de Preparo</h2>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{recipe.instructions}</pre>
        </div>
      )}

      {lastCalc && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 print-only">
          <h3 className="font-semibold text-emerald-800 mb-2">📊 Último cálculo de lucro</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-emerald-600">Preço sugerido:</span><p className="font-bold text-emerald-900">R$ {lastCalc.suggestedPrice.toFixed(2).replace(".", ",")}</p></div>
            <div><span className="text-emerald-600">Lucro:</span><p className="font-bold text-emerald-900">R$ {lastCalc.profit.toFixed(2).replace(".", ",")}</p></div>
            <div><span className="text-emerald-600">Margem:</span><p className="font-bold text-emerald-900">{lastCalc.profitMargin.toFixed(1).replace(".", ",")}%</p></div>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap hidden-print">
        {can("calcProfit") ? (
          <button onClick={() => setShowCalcModal(true)} className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            💰 Calcular Lucro
          </button>
        ) : (
          <Link href="/dashboard/subscription" className="bg-gray-300 text-gray-500 px-6 py-2.5 rounded-lg text-sm font-medium cursor-not-allowed inline-block" title="Disponível apenas no plano Premium">
            💰 Calcular Lucro (Premium)
          </Link>
        )}
      </div>

      <ProfitCalculatorModal open={showCalcModal} onClose={() => setShowCalcModal(false)} custoReal={totalCost} onSave={calculateProfit} />

      <ConfirmDialog
        open={deleteConfirm}
        title="Excluir receita"
        message={`Tem certeza que deseja excluir "${recipe.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={deleteRecipe}
        onCancel={() => { setDeleteConfirm(false); setDeleting(false); }}
      />
    </div>
  );
}
