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
    product: { id: string; name: string; unit: string; averagePrice: number | null; realAveragePrice: number | null; currentStock: number; brand: { id: string; name: string } | null; brandId: string | null };
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
    searchProductPrice, searchAllPrices, updateProductPrice,
    deductStock, addProduct, removeProduct,
  } = useRecipeProducts(recipe.id, recipe.products);

  const {
    showModal: showCalcModal, setShowModal: setShowCalcModal,
    calculating, lastCalc, calculateProfit,
  } = useProfitCalculation(recipe.id, recipe.calculations?.[0] || null);

  const { categories, selectedCategory, assigning, assignCategory, setCategories } = useCategoryAssign(recipe.id, recipe.category?.id || "");

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(recipe.title);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [kitchenMode, setKitchenMode] = useState(false);
  const [consumindo, setConsumindo] = useState(false);
  const [consumeResult, setConsumeResult] = useState<{ success: boolean; consumed: { productId: string; name: string; deducted: number }[]; errors: { productId: string; name: string; message: string }[]; partial: boolean } | null>(null);
  const { can } = usePlan();

  const handlePrint = (mode: "gerencial" | "cozinha") => {
    setKitchenMode(mode === "cozinha");
    setTimeout(() => {
      window.print();
      setTimeout(() => setKitchenMode(false), 500);
    }, 100);
  };

  const totalCost = custoReal(scale);
  const marketCost = marketTotalCost(scale);
  const savings = marketCost - totalCost;

  async function saveTitle() {
    if (!newTitle.trim() || newTitle === recipe.title) { setEditingTitle(false); return; }
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        recipe.title = newTitle.trim();
        toast("Nome atualizado", "success");
      }
    } catch {
      toast("Erro ao atualizar nome", "error");
    } finally {
      setEditingTitle(false);
    }
  }

  async function createAndAssignCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: name.toLowerCase().replace(/\s+/g, "-") }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories((prev: any[]) => [...prev, cat]);
        await assignCategory(cat.id);
        setNewCategoryName("");
      }
    } catch {
      toast("Erro ao criar categoria", "error");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function selectPrice(productId: string, price: number, quantity: number) {
    const perUnitPrice = quantity > 0 ? price / quantity : price;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ averagePrice: perUnitPrice }),
      });
      if (res.ok) {
        updateProductPrice(productId, perUnitPrice);
        toast("Preço aplicado ao ingrediente!", "success");
      } else {
        toast("Erro ao salvar preço", "error");
      }
    } catch {
      toast("Erro ao conectar", "error");
    }
  }

  async function consumeStock() {
    setConsumindo(true);
    setConsumeResult(null);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scale }),
      });
      const data = await res.json();
      setConsumeResult(data);
      if (data.updatedStock) {
        deductStock(data.consumed.map((c: { productId: string; deducted: number }) => ({
          productId: c.productId,
          deducted: c.deducted,
        })));
      }
      if (data.success) {
        toast("Ingredientes consumidos do estoque!", "success");
      } else if (data.partial) {
        toast(`Consumo parcial: ${data.consumed.length} ok, ${data.errors.length} falharam`, "info");
      } else {
        toast("Não foi possível consumir ingredientes", "error");
      }
    } catch {
      toast("Erro ao consumir ingredientes", "error");
    } finally {
      setConsumindo(false);
    }
  }

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
    <div className="max-w-4xl mx-auto">
      <style>{`@media print {
        nav, header, footer, .fixed, .z-50,
        .hidden-print { display: none !important; }
        body { background: white !important; font-size: 11pt; color: #000 !important; }
        .max-w-4xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        .print-only { display: block !important; }
        .print\\:hidden { display: none !important; }
        * { box-shadow: none !important; text-shadow: none !important; }
        .bg-gradient-to-br, .bg-gradient-to-r { background: #f8fafc !important; color: #000 !important; }
        table { background: white !important; border-collapse: collapse; }
        th, td { border-color: #e2e8f0 !important; }
        select, input, textarea { display: none !important; }
        a { color: #000 !important; text-decoration: none !important; }
        .rounded-2xl { border: 1px solid #e2e8f0 !important; }
      }
      .print-only { display: none; }`}</style>

      {/* Print-only header */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
            <p className="text-gray-500 mt-1">Ficha Técnica {kitchenMode ? 'Operacional' : 'Gerencial'}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Rendimento: {portions} porções</p>
            <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 hidden-print">
        <Link href="/dashboard/recipes" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </Link>
        <div className="flex gap-2">
          <button onClick={() => handlePrint("gerencial")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            🖨️ PDF (Gerencial)
          </button>
          <button onClick={() => handlePrint("cozinha")} className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 px-3 py-2 border border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            🧑‍🍳 PDF (Cozinha)
          </button>
          <Link href={`/dashboard/recipes/${recipe.id}/edit`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar
          </Link>
          <button onClick={() => setDeleteConfirm(true)} className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Excluir
          </button>
        </div>
      </div>

      {/* Hero section */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-8 mb-8 shadow-lg shadow-emerald-200/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-3xl font-bold text-white bg-white/20 backdrop-blur-sm w-full px-4 py-2 rounded-xl placeholder-white/50 outline-none focus:ring-2 focus:ring-white/50"
              />
            ) : (
              <h1
                className="text-3xl font-bold text-white cursor-pointer hover:opacity-90 transition-opacity group inline-flex items-center gap-2"
                onClick={() => { setNewTitle(recipe.title); setEditingTitle(true); }}
                title="Clique para editar"
              >
                {recipe.title}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 text-lg">✏️</span>
              </h1>
            )}
            {recipe.description && (
              <p className="text-emerald-100 mt-2 text-sm">{recipe.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                if (e.target.value === "__new__") return;
                assignCategory(e.target.value);
              }}
              disabled={assigning}
              className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none [&>option]:text-gray-900"
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              <option value="__new__" className="text-emerald-600 font-medium">+ Nova categoria</option>
            </select>
          </div>
        </div>

        {/* New category inline */}
        <div className="flex items-center gap-2 mt-3">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createAndAssignCategory(); }}
            placeholder="Nova categoria..."
            className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-sm placeholder-white/50 outline-none focus:ring-2 focus:ring-white/30 w-44"
          />
          {newCategoryName.trim() && (
            <button
              onClick={createAndAssignCategory}
              disabled={creatingCategory}
              className="text-xs bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all disabled:opacity-50"
            >
              {creatingCategory ? "..." : "Criar"}
            </button>
          )}
        </div>
      </div>

      {/* Portions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-4 mb-6 flex items-center gap-4 hidden-print">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Porções:</label>
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
          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-white transition-colors"
        />
        {portions !== baseYield && <span className="text-xs text-gray-400">(base: {baseYield})</span>}
      </div>

      {/* Cost Summary */}
      {!kitchenMode && (
        <div className="hidden-print">
          <CostSummary products={products} scale={scale} portions={portions} hasRealPrices={hasRealPrices} />
        </div>
      )}

      {/* Cost comparison */}
      {!kitchenMode && Object.keys(pricesMap).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 hidden-print">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Custo (real)</p>
            <p className="text-2xl font-bold text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Custo (preço mercado)</p>
            <p className="text-2xl font-bold text-gray-900">R$ {marketCost.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className={`rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow ${savings >= 0 ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200" : "bg-gradient-to-br from-red-50 to-red-100 border border-red-200"}`}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-3 ${savings >= 0 ? "bg-emerald-200 text-emerald-700" : "bg-red-200 text-red-700"}`}>
              {savings >= 0 ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-1">Diferença</p>
            <p className={`text-2xl font-bold ${savings >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {savings >= 0 ? "Economia" : "Prejuízo"}
            </p>
            <p className={`text-lg font-semibold mt-1 ${savings >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              R$ {Math.abs(savings).toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Ingredientes
          </h2>
          <div className="hidden-print flex items-center gap-2">
            <button
              onClick={searchAllPrices}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              Buscar Preços
            </button>
            <AddProductSearch existingProductIds={products.map((p) => p.product.id)} onAdd={addProduct} />
          </div>
        </div>
        <div className="p-6">
          <IngredientTable
            products={products}
            scale={scale}
            pricesMap={pricesMap}
            loadingPrices={loadingPrices}
            removingId={removingId}
            onSearchPrice={searchProductPrice}
            onSelectPrice={selectPrice}
            onRemove={removeProduct}
            kitchenMode={kitchenMode}
          />
        </div>
      </div>

      {/* Instructions */}
      {recipe.instructions && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Modo de Preparo
            </h2>
          </div>
          <div className="p-6">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{recipe.instructions}</pre>
          </div>
        </div>
      )}

      {/* Last calc */}
      {lastCalc && !kitchenMode && (
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-5 mb-6 print-only">
          <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Último cálculo de lucro
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <span className="text-xs text-emerald-600">Preço sugerido</span>
              <p className="text-lg font-bold text-emerald-900 mt-1">R$ {lastCalc.suggestedPrice.toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <span className="text-xs text-emerald-600">Lucro</span>
              <p className="text-lg font-bold text-emerald-900 mt-1">R$ {lastCalc.profit.toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <span className="text-xs text-emerald-600">Margem</span>
              <p className="text-lg font-bold text-emerald-900 mt-1">{lastCalc.profitMargin.toFixed(1).replace(".", ",")}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Consume result */}
      {consumeResult && (
        <div className={`rounded-xl p-4 border ${consumeResult.success ? "bg-emerald-50 border-emerald-200" : consumeResult.partial ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-semibold ${consumeResult.success ? "text-emerald-800" : consumeResult.partial ? "text-amber-800" : "text-red-800"}`}>
              {consumeResult.success ? "✓ Ingredientes consumidos" : consumeResult.partial ? "⚠ Consumo parcial" : "✗ Falha ao consumir"}
            </span>
          </div>
          {consumeResult.consumed.length > 0 && (
            <div className="text-sm text-emerald-700 mb-1">
              {consumeResult.consumed.map((c) => (
                <div key={c.productId}>- {c.name}: {c.deducted} unidade(s)</div>
              ))}
            </div>
          )}
          {consumeResult.errors.length > 0 && (
            <div className="text-sm text-red-600">
              {consumeResult.errors.map((e) => (
                <div key={e.productId}>- {e.message}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap hidden-print">
        <button
          onClick={consumeStock}
          disabled={consumindo}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-200/50 hover:shadow-lg hover:shadow-blue-200/50 transition-all active:scale-[0.98] disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {consumindo ? "Consumindo..." : "Consumir Ingredientes"}
        </button>
        {can("calcProfit") ? (
          <button onClick={() => setShowCalcModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-200/50 transition-all active:scale-[0.98]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Calcular Lucro
          </button>
        ) : (
          <Link href="/dashboard/subscription" className="inline-flex items-center gap-2 bg-gray-200 text-gray-500 px-6 py-3 rounded-xl text-sm font-medium cursor-not-allowed" title="Disponível apenas no plano Premium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Calcular Lucro (Premium)
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
