"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface ProductOption {
  id: string;
  name: string;
  unit: string;
  averagePrice: number;
}

interface NewIngredient {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  averagePrice: number;
}

export default function NewRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [ingredients, setIngredients] = useState<NewIngredient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      const q = searchTerm.toLowerCase();
      const results = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) &&
          !ingredients.some((i) => i.productId === p.id)
      );
      setSearchResults(results.slice(0, 10));
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, products, ingredients]);

  function addIngredient(product: ProductOption) {
    setIngredients((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, quantity: 1, unit: product.unit, averagePrice: product.averagePrice },
    ]);
    setSearchTerm("");
    setSearchResults([]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQty(index: number, qty: number) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, quantity: qty } : ing))
    );
  }

  const totalCost = ingredients.reduce((s, ing) => s + ing.averagePrice * ing.quantity, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get("title"),
      description: formData.get("description"),
      instructions: formData.get("instructions"),
      yield: Number(formData.get("yield")) || 1,
      ingredients: ingredients.map((ing) => ({
        productId: ing.productId,
        quantity: ing.quantity,
      })),
    };

    const res = await fetch("/api/recipes/import/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      toast("Erro ao criar receita", "error");
      setLoading(false);
      return;
    }

    const recipe = await res.json();
    toast("Receita criada com sucesso!", "success");
    router.push(`/dashboard/recipes/${recipe.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nova Receita</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Título" name="title" required placeholder="Ex: Bolo de Cenoura" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            name="description"
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300"
            rows={3}
            placeholder="Uma breve descrição da receita"
          />
        </div>
        <Input label="Rendimento (porções)" name="yield" type="number" defaultValue={1} min={1} />

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Ingredientes ({ingredients.length})</h2>
          </div>

          <div className="relative mb-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto para adicionar..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {(searchResults.length > 0 || searching) && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searching ? (
                  <div className="p-3 text-sm text-gray-400">Buscando...</div>
                ) : (
                  searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addIngredient(p)}
                      className="w-full text-left flex items-center gap-2 p-2 hover:bg-gray-50 border-b text-sm"
                    >
                      <span className="flex-1 font-medium">{p.name}</span>
                      <span className="text-gray-400">R$ {p.averagePrice.toFixed(2).replace(".", ",")}/{p.unit}</span>
                      <span className="text-emerald-600 font-medium">+</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {ingredients.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum ingrediente adicionado. Busque produtos acima.</p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                  <span className="flex-1 text-sm font-medium">{ing.productName}</span>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={ing.quantity || ""}
                    onChange={(e) => updateQty(i, Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border rounded text-sm text-center"
                  />
                  <span className="text-xs text-gray-400 w-6">{ing.unit}</span>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    R$ {(ing.averagePrice * ing.quantity).toFixed(2).replace(".", ",")}
                  </span>
                  <button type="button" onClick={() => removeIngredient(i)} className="text-xs text-red-400 hover:text-red-600 px-1">
                    ✕
                  </button>
                </div>
              ))}
              {totalCost > 0 && (
                <div className="flex justify-end pt-2 border-t text-sm font-semibold text-gray-800">
                  Custo total estimado: R$ {totalCost.toFixed(2).replace(".", ",")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Modo de Preparo</label>
          <textarea
            name="instructions"
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 font-mono text-sm"
            rows={8}
            placeholder="Passo a passo do preparo..."
          />
        </div>

        <Button type="submit" disabled={loading} className="w-fit">
          {loading ? "Salvando..." : "Salvar Receita"}
        </Button>
      </form>
    </div>
  );
}
