"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { usePlan } from "@/lib/use-plan";

interface Purchase {
  id: string;
  quantity: number;
  totalPrice: number;
  store: string | null;
  notes: string | null;
  date: string;
}

interface Brand {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  currentStock: number;
  brand: Brand | null;
  brandId: string | null;
  purchases: Purchase[];
}

interface PriceResult {
  title: string;
  price: number;
  store: string;
  url: string;
}

function calcRealAvg(purchases: Purchase[]): number | null {
  if (purchases.length === 0) return null;
  const totalQty = purchases.reduce((s, p) => s + p.quantity, 0);
  const totalSpent = purchases.reduce((s, p) => s + p.totalPrice, 0);
  if (totalQty <= 0) return null;
  return totalSpent / totalQty;
}

function calcTotalSpent(purchases: Purchase[]): number {
  return purchases.reduce((s, p) => s + p.totalPrice, 0);
}

function calcTotalQty(purchases: Purchase[]): number {
  return purchases.reduce((s, p) => s + p.quantity, 0);
}

function PurchaseForm({
  productId,
  onAdded,
}: {
  productId: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        quantity: Number(form.get("quantity")),
        totalPrice: Number(form.get("totalPrice")),
        store: form.get("store"),
        notes: form.get("notes"),
      }),
    });

    if (res.ok) {
      setOpen(false);
      onAdded();
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline underline-offset-2 transition-all"
      >
        + Nova Compra
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mt-2 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 shadow-sm">
      <Input name="quantity" type="number" step="any" placeholder="Qtd" required className="w-20 text-xs" />
      <Input name="totalPrice" type="number" step="any" placeholder="Preço total R$" required className="w-28 text-xs" />
      <Input name="store" placeholder="Local/mercado" className="w-28 text-xs" />
      <Input name="notes" placeholder="Obs" className="w-20 text-xs" />
      <Button type="submit" disabled={loading} className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm">
        {loading ? "..." : "Salvar"}
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
        Cancelar
      </button>
    </form>
  );
}

function ProductRow({
  product,
  onRefresh,
  onDelete,
  checked,
  onToggle,
}: {
  product: Product;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [stockQty, setStockQty] = useState("");
  const [stocking, setStocking] = useState(false);

  const realAvg = calcRealAvg(product.purchases);
  const totalSpent = calcTotalSpent(product.purchases);
  const totalQty = calcTotalQty(product.purchases);
  const avgPrice = product.averagePrice ?? 0;
  const diff =
    realAvg !== null ? ((avgPrice - realAvg) / realAvg) * 100 : null;

  async function addStock() {
    const qty = parseFloat(stockQty);
    if (!qty || qty <= 0) return;
    setStocking(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStock: product.currentStock + qty }),
      });
      if (res.ok) {
        product.currentStock += qty;
        setStockQty("");
        onRefresh();
      }
    } finally {
      setStocking(false);
    }
  }

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-emerald-50/40 transition-colors even:bg-gray-50/50">
        <td className="p-3 w-10">
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(product.id)}
              className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
            />
          </div>
        </td>
        <td className="p-3 font-medium text-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-gray-800">{product.name}</span>
            {product.brand && (
              <span className="text-xs text-gray-400 font-normal">({product.brand.name})</span>
            )}
            <button
              onClick={() => setShowDelete(true)}
              className="text-xs text-red-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="Excluir produto"
            >
              🗑️
            </button>
          </div>
        </td>
        <td className="p-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {product.unit}
          </span>
        </td>
        <td className="p-3">
          {product.averagePrice !== null ? (
            <div className="text-sm font-semibold text-gray-900">
              R$ {product.averagePrice.toFixed(2).replace(".", ",")}
            </div>
          ) : (
            <div className="text-sm text-gray-400">—</div>
          )}
          {realAvg !== null && (
            <div className="text-xs text-gray-500 mt-0.5">
              <span className="text-gray-400">Real:</span> R$ {realAvg.toFixed(2).replace(".", ",")}
              <span
                className={`ml-1 font-semibold ${
                  diff && diff > 5 ? "text-red-500" : diff && diff < -5 ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                ({diff !== null ? (diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`) : "-"})
              </span>
            </div>
          )}
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${product.currentStock > 0 ? "text-emerald-700" : "text-gray-400"}`}>
              {product.currentStock.toFixed(2).replace(".", ",").replace(/,00$/, "") || "0"}
            </span>
            <span className="text-xs text-gray-500">{product.unit}</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="any"
                min={0}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="+"
                className="w-14 px-1.5 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={addStock}
                disabled={stocking || !stockQty || parseFloat(stockQty) <= 0}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium disabled:text-gray-300"
              >
                +
              </button>
            </div>
          </div>
        </td>
        <td className="p-3">
          <div className="text-xs space-y-1.5">
            <PurchaseForm productId={product.id} onAdded={onRefresh} />
            {product.purchases.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors text-xs font-medium list-none flex items-center gap-1">
                  <svg className={`w-3 h-3 transition-transform group-open:rotate-90`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {product.purchases.length} compra{product.purchases.length !== 1 ? "s" : ""} (R$ {totalSpent.toFixed(2).replace(".", ",")})
                </summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto bg-gray-50/70 rounded-lg p-2 border border-gray-100">
                  {product.purchases.map((p) => (
                    <div key={p.id} className="flex justify-between text-gray-500 border-b border-gray-100 pb-1 last:border-b-0">
                      <span>
                        {p.quantity} {product.unit}
                        {p.store ? (
                          <>
                            <span className="text-gray-300 mx-1">·</span>
                            <span className="text-gray-400">{p.store}</span>
                          </>
                        ) : ""}
                        {p.notes ? (
                          <>
                            <span className="text-gray-300 mx-1">·</span>
                            <span className="text-gray-400 italic">{p.notes}</span>
                          </>
                        ) : ""}
                      </span>
                      <span className="font-medium text-gray-700">
                        R$ {p.totalPrice.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-gray-700 pt-1.5 font-semibold border-t border-gray-200">
                    <span>Total: {totalQty} {product.unit}</span>
                    <span>R$ {totalSpent.toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </details>
            )}
          </div>
        </td>
      </tr>

      <ConfirmDialog
        open={showDelete}
        title="Excluir produto"
        message={`Excluir "${product.name}" permanentemente?`}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => { onDelete(product.id); setShowDelete(false); }}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}

export function ProductList({ products: initialProducts, total, page: initialPage }: { products: Product[]; total: number; page: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const { can } = usePlan();
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [recipeTitle, setRecipeTitle] = useState("");

  function toggleSelection(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function exportToRecipe() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const title = recipeTitle.trim() || "Nova Receita";
    setExporting(true);
    try {
      const ingredients = products.filter((p) => selected.has(p.id)).map((p) => ({
        name: p.name,
        productId: p.id,
        quantity: 1,
        unit: p.unit,
        averagePrice: p.averagePrice ?? 0,
        brandName: p.brand?.name || null,
      }));
      const res = await fetch("/api/recipes/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: "", instructions: "", yield: 1, ingredients }),
      });
      if (res.ok) {
        const recipe = await res.json();
        setSelected(new Set());
        setRecipeTitle("");
        toast("Receita criada com os produtos selecionados!", "success");
        router.push(`/dashboard/recipes/${recipe.recipeId}`);
      } else {
        toast("Erro ao criar receita", "error");
      }
    } catch {
      toast("Erro ao criar receita", "error");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    fetch("/api/brands").then(r => r.ok && r.json()).then(setBrands).catch(() => {});
  }, []);

  async function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        unit: form.get("unit"),
        brandId: form.get("brandId") || undefined,
      }),
    });
    if (res.ok) {
      const newProduct = await res.json();
      setProducts((prev) => [...prev, { ...newProduct, purchases: [] }]);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function searchAllPrices() {
    const toSearch = products.filter((p) => p.name.trim());
    if (toSearch.length === 0) {
      toast("Nenhum produto para buscar", "error");
      return;
    }
    setSearchingAll(true);

    const results = await Promise.allSettled(
      toSearch.map((p) =>
        fetch(`/api/prices/search?q=${encodeURIComponent(p.name)}`, { cache: "no-store" }).then((r) => r.json())
      )
    );

    let updated = 0;
    for (let i = 0; i < toSearch.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;
      const prices = (r.value?.results || [])
        .map((pr: any) => pr.price || 0)
        .filter((p: number) => p > 0);
      if (prices.length === 0) continue;
      const best = Math.min(...prices);
      await fetch(`/api/products/${toSearch[i].id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ averagePrice: best }),
      });
      updated++;
    }

    const res = await fetch("/api/products");
    if (res.ok) {
      setProducts(await res.json());
    }

    setSearchingAll(false);
    toast(`${updated} produto(s) com preço atualizado.`, "success");
  }

  async function deleteAllProducts() {
    setDeletingAll(true);
    try {
      const res = await fetch("/api/products?all=true", { method: "DELETE" });
      if (res.ok) {
        setProducts([]);
        setDeleteAllConfirm(false);
        toast("Todos os produtos foram excluídos!", "success");
      }
    } catch {
      toast("Erro ao excluir produtos", "error");
    } finally {
      setDeletingAll(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} produto{total !== 1 ? "s" : ""} cadastrado{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2.5 items-center">
          {products.length > 0 && can("deleteAllProducts") && (
            <button
              onClick={() => setDeleteAllConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 px-3.5 py-2 border border-red-200 rounded-xl hover:bg-red-50 transition-all hover:shadow-sm"
            >
              🗑️ Excluir Todos
            </button>
          )}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
              <input
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
                placeholder="Nome da receita"
                className="px-3 py-1.5 border rounded-lg text-sm border-purple-200 w-44 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
              <button
                onClick={exportToRecipe}
                disabled={exporting}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed"
              >
                {exporting ? "Criando..." : `📄 Exportar (${selected.size})`}
              </button>
            </div>
          )}
          {can("searchPrices") ? (
            <button
              onClick={searchAllPrices}
              disabled={searchingAll || products.length === 0}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed"
            >
              {searchingAll ? "Buscando..." : "🔍 Buscar Preços"}
            </button>
          ) : (
            <Link
              href="/dashboard/subscription"
              className="bg-gray-100 text-gray-400 px-4 py-2 rounded-xl text-sm font-medium cursor-not-allowed inline-block border border-gray-200"
              title="Disponível apenas no plano Premium"
            >
              🔍 Buscar Preços (Premium)
            </Link>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow ${
              showForm
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
            }`}
          >
            {showForm ? "Cancelar" : "+ Novo Produto"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addProduct} className="bg-gradient-to-br from-white to-emerald-50/30 p-5 rounded-2xl border border-emerald-100 shadow-md flex flex-wrap gap-4 items-end">
          <Input name="name" placeholder="Nome do produto" required className="w-60" label="Produto" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-600">Marca</label>
            <select name="brandId" className="px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent border-gray-200 w-48 bg-white shadow-sm">
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
          <Button type="submit" disabled={saving} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-sm">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
                <th className="p-3.5 w-10">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selected.size > 0 && selected.size === products.length}
                      onChange={() => {
                        if (selected.size === products.length) setSelected(new Set());
                        else setSelected(new Set(products.map((p) => p.id)));
                      }}
                      className="rounded accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Produto</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Unidade</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Preço</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Estoque</th>
                <th className="p-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Compras</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span>Nenhum produto cadastrado.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    checked={selected.has(product.id)}
                    onToggle={toggleSelection}
                    onRefresh={async () => {
                      const res = await fetch(`/api/products?page=${page}`);
                      if (res.ok) {
                        const updated = await res.json();
                        setProducts(updated);
                      }
                    }}
                    onDelete={async (id) => {
                      try {
                        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
                        if (res.ok) {
                          setProducts((prev) => prev.filter((p) => p.id !== id));
                          toast("Produto excluído", "success");
                        }
                      } catch {
                        toast("Erro ao excluir", "error");
                      }
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteAllConfirm}
        title="Excluir todos os produtos?"
        message="Tem certeza que deseja excluir TODOS os produtos? Esta ação também remove todas as compras registradas e ingredientes de receitas associados. Não pode ser desfeita."
        confirmLabel="Excluir Tudo"
        variant="danger"
        loading={deletingAll}
        onConfirm={deleteAllProducts}
        onCancel={() => setDeleteAllConfirm(false)}
      />

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/dashboard/products?page=${page - 1}`}
              className="px-3.5 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow"
            >
              ← Anterior
            </Link>
          )}
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/dashboard/products?page=${p}`}
              className={`px-3.5 py-2 text-sm rounded-xl border transition-all shadow-sm ${
                p === page
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent shadow-md"
                  : "border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              {p}
            </Link>
          ))}
          {page < Math.ceil(total / 20) && (
            <Link
              href={`/dashboard/products?page=${page + 1}`}
              className="px-3.5 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm hover:shadow"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
