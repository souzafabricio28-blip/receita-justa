"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { usePlan } from "@/lib/use-plan";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  productId: string | null;
  productName: string;
  averagePrice: number;
  searchingPrice: boolean;
  cleanName?: string;
  convertedQuantity?: number;
  convertedUnit?: string;
  productPrice?: number;
  productUnit?: string;
  estimatedCost?: number;
  skipCalculation?: boolean;
}

function ImportForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { can, plan } = usePlan();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [yield_, setYield] = useState(1);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [rawText, setRawText] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualParsing, setManualParsing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlParsing, setUrlParsing] = useState(false);

  useEffect(() => {
    const parsedJson = sessionStorage.getItem("import_recipe_data");
    if (parsedJson) {
      try {
        const data = JSON.parse(parsedJson);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setInstructions(data.instructions || "");
        setYield(data.yield || 1);
        const ings: Ingredient[] = (data.ingredients || []).map((i: any) => ({
          name: i.name || "",
          quantity: i.quantity || 1,
          unit: i.unit || "un",
          productId: i.productId || null,
          productName: i.productName || "",
          averagePrice: i.averagePrice || 0,
          searchingPrice: false,
          cleanName: i.cleanName,
          convertedQuantity: i.convertedQuantity,
          convertedUnit: i.convertedUnit,
          productPrice: i.productPrice,
          productUnit: i.productUnit,
          estimatedCost: i.estimatedCost,
          skipCalculation: i.skipCalculation,
        }));
        setIngredients(ings);
        sessionStorage.removeItem("import_recipe_data");
        if (ings.length > 0) {
          const total = ings.reduce((s: number, ing: Ingredient) => s + (ing.estimatedCost || 0), 0);
          toast(`${ings.length} ingredientes identificados, custo estimado: R$ ${total.toFixed(2).replace(".", ",")}`, "success");
        }
      } catch { /* ignore parse error, fall through to raw text */ }
    }
    const saved = sessionStorage.getItem("import_recipe_text");
    if (saved) {
      setRawText(saved);
    }
    fetch("/api/products")
      .then((r) => r.json())
      .then((prods) => setAllProducts(prods))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function parseRecipe() {
    if (!rawText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "");
        setDescription(data.description || "");
        setInstructions(data.instructions || "");
        setYield(data.yield || 1);
        const ings: Ingredient[] = (data.ingredients || []).map((i: any) => ({
          name: i.name || "",
          quantity: i.quantity || 1,
          unit: i.unit || "un",
          productId: i.productId || null,
          productName: i.productName || "",
          averagePrice: i.averagePrice || 0,
          searchingPrice: false,
          cleanName: i.cleanName,
          convertedQuantity: i.convertedQuantity,
          convertedUnit: i.convertedUnit,
          productPrice: i.productPrice,
          productUnit: i.productUnit,
          estimatedCost: i.estimatedCost,
          skipCalculation: i.skipCalculation,
        }));
        setIngredients(ings);
        if (!data.title && ings.length === 0) {
          toast("Não foi possível identificar uma receita neste texto", "error");
        } else {
          const total = ings.reduce((s: number, ing: Ingredient) => s + (ing.estimatedCost || 0), 0);
          toast(`Receita identificada! ${ings.length} ingredientes, custo estimado: R$ ${total.toFixed(2).replace(".", ",")}`, "success");
        }
      } else {
        toast("Erro ao processar receita", "error");
      }
    } catch {
      toast("Erro ao conectar", "error");
    } finally {
      setParsing(false);
    }
  }

  useEffect(() => {
    if (rawText && allProducts.length > 0 && !title) {
      parseRecipe();
    }
  }, [rawText, allProducts.length]);

  function updateIngredient(index: number, field: keyof Ingredient, value: any) {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: "", quantity: 1, unit: "un", productId: null, productName: "", averagePrice: 0, searchingPrice: false }]);
  }

  function matchProduct(name: string): string | null {
    const match = allProducts.find(
      (p) =>
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
    );
    return match?.id || null;
  }

  async function searchAllPrices() {
    const toSearch = ingredients.filter((ing) => ing.name.trim());
    if (toSearch.length === 0) {
      toast("Nenhum ingrediente com nome para buscar", "error");
      return;
    }
    setSearchingAll(true);
    setIngredients((prev) => prev.map((ing) => ({ ...ing, searchingPrice: true })));

    const results = await Promise.allSettled(
      toSearch.map((ing) =>
        fetch(`/api/prices/search?q=${encodeURIComponent(ing.name)}`).then((r) => r.json())
      )
    );

    let found = 0;
    setIngredients((prev) =>
      prev.map((ing) => {
        if (!ing.name.trim()) return { ...ing, searchingPrice: false };
        const idx = toSearch.findIndex((s) => s.name.toLowerCase().trim() === ing.name.toLowerCase().trim());
        if (idx === -1) return { ...ing, searchingPrice: false };
        const r = results[idx];
        if (r.status !== "fulfilled") return { ...ing, searchingPrice: false };
        const prices = (r.value?.results || []).map((pr: any) => pr.price || 0).filter((p: number) => p > 0);
        if (prices.length === 0) return { ...ing, searchingPrice: false };
        const best = Math.min(...prices);
        found++;
        return { ...ing, searchingPrice: false, averagePrice: best };
      })
    );
    setSearchingAll(false);
    toast(`Busca concluída! ${found} ingrediente(s) com preço atualizado.`, "success");
  }

  async function handleManualImport() {
    if (!manualText.trim()) return;
    sessionStorage.setItem("import_recipe_text", manualText);
    setManualText("");
    setRawText(manualText);
  }

  async function save() {
    if (!title.trim()) {
      toast("O título é obrigatório", "error");
      return;
    }
    setSaving(true);

    const res = await fetch("/api/recipes/import/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        yield: yield_,
        ingredients: ingredients.filter((ing) => ing.name.trim()).map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          productId: ing.productId,
          productName: ing.productName || ing.name,
          averagePrice: ing.averagePrice,
        })),
      }),
    });

    if (!res.ok) {
      toast("Erro ao salvar receita", "error");
      setSaving(false);
      return;
    }

    const recipe = await res.json();

    sessionStorage.removeItem("import_recipe_text");
    toast("Receita importada com sucesso!", "success");
    router.push(`/dashboard/recipes/${recipe.recipeId}`);
  }

  function startOver() {
    setTitle("");
    setDescription("");
    setInstructions("");
    setIngredients([]);
    setYield(1);
    setRawText("");
    sessionStorage.removeItem("import_recipe_text");
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  async function handleUrlImport() {
    if (!urlInput.trim()) return;
    setUrlParsing(true);
    try {
      const res = await fetch("/api/recipes/import/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "");
        setDescription(data.description || "");
        setInstructions(data.instructions || "");
        setYield(data.yield || 1);
        const ings: Ingredient[] = (data.ingredients || []).map((i: any) => ({
          name: i.name || "",
          quantity: i.quantity || 1,
          unit: i.unit || "un",
          productId: i.productId || null,
          productName: i.productName || "",
          averagePrice: i.averagePrice || 0,
          searchingPrice: false,
          cleanName: i.cleanName,
          convertedQuantity: i.convertedQuantity,
          convertedUnit: i.convertedUnit,
          productPrice: i.productPrice,
          productUnit: i.productUnit,
          estimatedCost: i.estimatedCost,
          skipCalculation: i.skipCalculation,
        }));
        setIngredients(ings);
        setRawText("imported");
        const total = ings.reduce((s: number, ing: Ingredient) => s + (ing.estimatedCost || 0), 0);
        toast(`Receita importada da URL! ${ings.length} ingredientes, custo estimado: R$ ${total.toFixed(2).replace(".", ",")}`, "success");
      } else {
        const err = await res.json();
        toast(err.error || "Erro ao importar URL", "error");
      }
    } catch {
      toast("Erro ao conectar", "error");
    } finally {
      setUrlParsing(false);
    }
  }

  if (!can("importText") && !can("importUrl")) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">📥 Importar Receita</h1>
        <p className="text-gray-500 mb-6">
          O recurso de importação de receitas está disponível apenas no plano Premium.
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

  if (!rawText) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📥 Importar Receita</h1>

        <div className="bg-white p-6 rounded-xl border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">🔗 Importar da Internet</h2>
          <p className="text-sm text-gray-500 mb-3">
            Cole o link de uma receita da internet para importar automaticamente:
          </p>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.tudogostoso.com.br/receita/..."
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button onClick={handleUrlImport} disabled={!urlInput.trim() || urlParsing}>
            {urlParsing ? "Importando..." : "Importar da URL"}
          </Button>
        </div>

        <div className="bg-white p-6 rounded-xl border">
          <div className="text-center mb-6">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-gray-600 mb-2">Ou cole o texto da receita manualmente:</p>
          </div>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-4 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={8}
            placeholder="Cole aqui a receita completa (ingredientes e modo de preparo)..."
          />
          <div className="flex gap-3 justify-center">
            <Button onClick={handleManualImport} disabled={!manualText.trim() || manualParsing}>
              {manualParsing ? "Analisando..." : "Importar Texto"}
            </Button>
            <Button variant="secondary" onClick={() => router.push("/dashboard/recipes")}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📥 Importar Receita</h1>
        <button onClick={startOver} className="text-sm text-gray-500 hover:text-gray-700 underline">
          Recomeçar
        </button>
      </div>

      {parsing && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full" />
          <span className="text-sm text-emerald-700">Analisando receita...</span>
        </div>
      )}

      <div className="space-y-4">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Nome da receita" />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300"
            rows={2}
            placeholder="Breve descrição"
          />
        </div>

        <Input label="Rendimento (porções)" type="number" value={yield_} onChange={(e) => setYield(Number(e.target.value))} min={1} />

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Ingredientes ({ingredients.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={searchAllPrices}
                disabled={searchingAll || ingredients.filter((i) => i.name.trim()).length === 0}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-300"
              >
                {searchingAll ? "Buscando..." : "🔍 Buscar Preços"}
              </button>
              <button onClick={parseRecipe} disabled={parsing} className="text-sm text-emerald-600 hover:underline disabled:text-gray-300">
                {parsing ? "Analisando..." : "🔄 Re-analisar"}
              </button>
              <button onClick={addIngredient} className="text-sm text-emerald-600 hover:underline">
                + Adicionar
              </button>
            </div>
          </div>

          {ingredients.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum ingrediente identificado.</p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <input
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, "name", e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Nome"
                    />
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={ing.quantity || ""}
                      onChange={(e) => updateIngredient(i, "quantity", Number(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Qtd"
                    />
                    <select
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="un">un</option>
                      <option value="cx">cx</option>
                      <option value="pct">pct</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={ing.averagePrice || ""}
                        onChange={(e) => updateIngredient(i, "averagePrice", Number(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0,00"
                      />
                    </div>
                    {ing.searchingPrice && (
                      <span className="text-xs text-emerald-600 animate-pulse w-5 text-center">⟳</span>
                    )}
                    {ing.estimatedCost !== undefined && ing.estimatedCost > 0 && (
                      <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">
                        R$ {ing.estimatedCost.toFixed(2).replace(".", ",")}
                      </span>
                    )}
                    {ing.skipCalculation && (
                      <span className="text-xs text-gray-400 italic">
                        a gosto
                      </span>
                    )}
                    {ing.productName && ing.productName !== ing.name && (
                      <span className="text-xs text-gray-400 truncate max-w-[100px]" title={ing.productName}>
                        → {ing.productName}
                      </span>
                    )}
                    <button onClick={() => removeIngredient(i)} className="text-xs text-red-400 hover:text-red-600 px-1">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {ingredients.some((ing) => (ing.estimatedCost || 0) > 0) && (
                <div className="flex justify-end pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-800">
                    Total estimado: R$ {ingredients.reduce((s, ing) => s + (ing.estimatedCost || 0), 0).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Modo de Preparo</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 font-mono text-sm"
            rows={8}
            placeholder="Passo a passo..."
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving ? "Salvando..." : "Salvar Receita"}
          </Button>
          <Button variant="secondary" onClick={() => router.push("/dashboard/recipes")}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ImportRecipePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl animate-pulse"><div className="h-8 bg-gray-200 rounded w-48" /></div>}>
      <ImportForm />
    </Suspense>
  );
}
