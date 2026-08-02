"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface Product {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  averagePrice: number | null;
  brand: { id: string; name: string } | null;
}

interface Brand {
  id: string;
  name: string;
}

export default function EstoquePage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockInputs, setStockInputs] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<"todos" | "com_estoque" | "baixo">("todos");
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);

  async function loadProducts() {
    const res = await fetch("/api/products");
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    fetch("/api/brands").then(r => r.ok && r.json()).then(setBrands).catch(() => {});
  }, []);

  async function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const unit = (form.get("unit") as string) || "un";
    const brandId = (form.get("brandId") as string) || undefined;
    const initialStock = parseFloat((form.get("initialStock") as string) || "0");

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, unit, brandId }),
      });
      if (!res.ok) { toast("Erro ao criar produto", "error"); return; }

      const newProduct = await res.json();

      if (initialStock > 0) {
        await fetch(`/api/products/${newProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentStock: initialStock }),
        });
        newProduct.currentStock = initialStock;
      }

      setProducts((prev) => [...prev, { ...newProduct, currentStock: newProduct.currentStock ?? 0 }]);
      setShowNewForm(false);
      toast("Produto criado com estoque inicial!", "success");
    } catch {
      toast("Erro ao criar produto", "error");
    } finally {
      setSaving(false);
    }
  }

  const filtered = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.brand?.name?.toLowerCase().includes(q)) return false;
    }
    if (filter === "com_estoque") return p.currentStock > 0;
    if (filter === "baixo") return p.currentStock <= 0;
    return true;
  });

  async function addStock(productId: string) {
    const qty = parseFloat(stockInputs[productId] || "");
    if (!qty || qty <= 0) return;
    setAdding((prev) => ({ ...prev, [productId]: true }));
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: product.currentStock + qty }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, currentStock: p.currentStock + qty } : p
          )
        );
        setStockInputs((prev) => ({ ...prev, [productId]: "" }));
        toast(`${qty} ${product.unit} adicionado(s) ao estoque!`, "success");
      }
    } catch {
      toast("Erro ao atualizar estoque", "error");
    } finally {
      setAdding((prev) => ({ ...prev, [productId]: false }));
    }
  }

  async function setExactStock(productId: string, value: number) {
    if (value < 0) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: value }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, currentStock: value } : p))
        );
      }
    } catch {
      toast("Erro ao atualizar estoque", "error");
    }
  }

  const totalItems = products.reduce((s, p) => s + p.currentStock, 0);
  const productsWithStock = products.filter((p) => p.currentStock > 0).length;
  const productsOutOfStock = products.filter((p) => p.currentStock <= 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} produto{products.length !== 1 ? "s" : ""} cadastrado{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow ${
            showNewForm
              ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
          }`}
        >
          {showNewForm ? "Cancelar" : "+ Novo Produto"}
        </button>
      </div>

      {/* New Product Form */}
      {showNewForm && (
        <form onSubmit={addProduct} className="bg-gradient-to-br from-white to-emerald-50/30 p-5 rounded-2xl border border-emerald-100 shadow-md flex flex-wrap gap-4 items-end">
          <Input name="name" placeholder="Nome do produto" required className="w-56" label="Produto" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Marca</label>
            <select name="brandId" className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent border-gray-200 w-44 bg-white shadow-sm">
              <option value="">Sem marca</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Unidade</label>
            <select name="unit" defaultValue="kg" className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent border-gray-200 bg-white shadow-sm">
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="ml">ml</option>
              <option value="un">un</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Estoque Inicial</label>
            <input
              name="initialStock"
              type="number"
              step="any"
              min={0}
              defaultValue={0}
              className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent border-gray-200 w-24 bg-white shadow-sm"
            />
          </div>
          <Button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["todos", "com_estoque", "baixo"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "todos" ? "Todos" : f === "com_estoque" ? "Com Estoque" : "Sem Estoque"}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-left">Produto</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-left">Unidade</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Estoque Atual</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-left">Ajustar</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-right">Valor Estoque</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span>Nenhum produto encontrado.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const stockValue = product.currentStock * (product.averagePrice ?? 0);
                  const isLow = product.currentStock <= 0;

                  return (
                    <tr
                      key={product.id}
                      className={`border-b last:border-0 hover:bg-emerald-50/40 transition-colors even:bg-gray-50/50 ${
                        isLow ? "bg-red-50/30" : ""
                      }`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isLow ? "text-red-700" : "text-gray-900"}`}>
                            {product.name}
                          </span>
                          {product.brand && (
                            <span className="text-xs text-gray-400 font-normal">({product.brand.name})</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {product.unit}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              {product.currentStock.toFixed(2).replace(".", ",").replace(/,00$/, "") || "0"}
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                              {product.currentStock.toFixed(2).replace(".", ",").replace(/,00$/, "")}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">{product.unit}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            min={0}
                            value={stockInputs[product.id] ?? ""}
                            onChange={(e) =>
                              setStockInputs((prev) => ({ ...prev, [product.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addStock(product.id);
                            }}
                            placeholder="Qtd"
                            className="w-16 px-2 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-gray-50 hover:bg-white transition-colors"
                          />
                          <button
                            onClick={() => addStock(product.id)}
                            disabled={adding[product.id] || !stockInputs[product.id] || parseFloat(stockInputs[product.id] || "0") <= 0}
                            className="text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3 py-1.5 rounded-lg font-medium disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            {adding[product.id] ? "..." : "+ Entrada"}
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-sm text-gray-600">
                          R$ {stockValue.toFixed(2).replace(".", ",")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}