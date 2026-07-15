"use client";

import { useState } from "react";
import Link from "next/link";
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

interface Product {
  id: string;
  name: string;
  unit: string;
  averagePrice: number;
  category: string | null;
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
      <button onClick={() => setOpen(true)} className="text-xs text-emerald-600 hover:underline">
        + Nova Compra
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 mt-2 p-2 bg-gray-50 rounded">
      <Input name="quantity" type="number" step="any" placeholder="Qtd" required className="w-20 text-xs" />
      <Input name="totalPrice" type="number" step="any" placeholder="Preço total R$" required className="w-28 text-xs" />
      <Input name="store" placeholder="Local/mercado" className="w-28 text-xs" />
      <Input name="notes" placeholder="Obs" className="w-20 text-xs" />
      <Button type="submit" disabled={loading} className="text-xs px-2 py-1">
        {loading ? "..." : "Salvar"}
      </Button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
        Cancelar
      </button>
    </form>
  );
}

function ProductRow({
  product,
  onRefresh,
  onDelete,
}: {
  product: Product;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  const realAvg = calcRealAvg(product.purchases);
  const totalSpent = calcTotalSpent(product.purchases);
  const totalQty = calcTotalQty(product.purchases);
  const diff =
    realAvg !== null ? ((product.averagePrice - realAvg) / realAvg) * 100 : null;

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-gray-50">
        <td className="p-3 font-medium text-gray-900">
          <div className="flex items-center gap-2">
            <span>{product.name}</span>
            <button
              onClick={() => setShowDelete(true)}
              className="text-xs text-red-300 hover:text-red-600 transition-colors"
              title="Excluir produto"
            >
              🗑️
            </button>
          </div>
        </td>
        <td className="p-3 text-gray-600">{product.unit}</td>
        <td className="p-3">
          <div className="text-sm font-medium text-gray-900">
            R$ {product.averagePrice.toFixed(2).replace(".", ",")}
          </div>
          {realAvg !== null && (
            <div className="text-xs text-gray-500">
              Real (compras): R$ {realAvg.toFixed(2).replace(".", ",")}
              <span
                className={`ml-1 font-medium ${
                  diff && diff > 5 ? "text-red-600" : diff && diff < -5 ? "text-emerald-600" : "text-gray-400"
                }`}
              >
                ({diff !== null ? (diff > 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`) : "-"})
              </span>
            </div>
          )}
        </td>
        <td className="p-3"></td>
        <td className="p-3">
          <div className="text-xs space-y-1">
            <PurchaseForm productId={product.id} onAdded={onRefresh} />
            {product.purchases.length > 0 && (
              <details>
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  {product.purchases.length} compras (R$ {totalSpent.toFixed(2).replace(".", ",")})
                </summary>
                <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                  {product.purchases.map((p) => (
                    <div key={p.id} className="flex justify-between text-gray-500 border-b pb-1">
                      <span>
                        {p.quantity} {product.unit}
                        {p.store ? ` - ${p.store}` : ""}
                      </span>
                      <span className="font-medium text-gray-700">
                        R$ {p.totalPrice.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-gray-700 pt-1 font-medium">
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
  const { toast } = useToast();
  const { can } = usePlan();
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

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
        averagePrice: Number(form.get("averagePrice")) || 0,
        category: form.get("category"),
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
        fetch(`/api/prices/search?q=${encodeURIComponent(p.name)}`).then((r) => r.json())
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <div className="flex gap-2">
          {products.length > 0 && can("deleteAllProducts") && (
            <button
              onClick={() => setDeleteAllConfirm(true)}
              className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              🗑️ Excluir Todos
            </button>
          )}
          {can("searchPrices") ? (
            <button
              onClick={searchAllPrices}
              disabled={searchingAll || products.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300"
            >
              {searchingAll ? "Buscando..." : "🔍 Buscar Preços"}
            </button>
          ) : (
            <Link
              href="/dashboard/subscription"
              className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed inline-block"
              title="Disponível apenas no plano Premium"
            >
              🔍 Buscar Preços (Premium)
            </Link>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            {showForm ? "Cancelar" : "+ Novo Produto"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addProduct} className="bg-white p-4 rounded-xl border mb-6 flex flex-wrap gap-3 items-end">
          <Input name="name" placeholder="Nome do produto" required className="w-48" label="Produto" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Unidade</label>
            <select name="unit" defaultValue="kg" className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300">
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="L">L</option>
              <option value="ml">ml</option>
              <option value="un">un</option>
              <option value="cx">cx</option>
              <option value="pct">pct</option>
            </select>
          </div>
          <Input name="averagePrice" type="number" step="any" placeholder="0,00" label="Preço médio R$" className="w-28" />
          <Input name="category" placeholder="Ex: Padaria" label="Categoria" className="w-32" />
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </form>
      )}

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-3 font-medium text-gray-500">Produto</th>
              <th className="p-3 font-medium text-gray-500">Unidade</th>
              <th className="p-3 font-medium text-gray-500">Preço</th>
              <th className="p-3 font-medium text-gray-500">Preço Mercado</th>
              <th className="p-3 font-medium text-gray-500">Compras</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  Nenhum produto cadastrado.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
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
        <div className="flex items-center justify-center gap-2 mt-8">
          {page > 1 && (
            <Link
              href={`/dashboard/products?page=${page - 1}`}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
            >
              ← Anterior
            </Link>
          )}
          {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/dashboard/products?page=${p}`}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                p === page
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
          {page < Math.ceil(total / 20) && (
            <Link
              href={`/dashboard/products?page=${page + 1}`}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50"
            >
              Próxima →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
