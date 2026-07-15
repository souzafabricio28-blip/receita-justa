"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

export default function ProductCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/product-categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast("Erro ao carregar categorias de produtos", "error");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditId(null);
    setFormName("");
    setShowForm(true);
  }

  function openEdit(cat: ProductCategory) {
    setEditId(cat.id);
    setFormName(cat.name);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);

    const slug = formName.trim().toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    try {
      if (editId) {
        const res = await fetch(`/api/product-categories/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), slug }),
        });
        if (res.ok) {
          toast("Categoria atualizada!", "success");
          setShowForm(false);
          loadCategories();
        }
      } else {
        const res = await fetch("/api/product-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), slug }),
        });
        if (res.ok) {
          toast("Categoria criada!", "success");
          setShowForm(false);
          loadCategories();
        } else {
          const data = await res.json();
          toast(data.error || "Erro ao criar", "error");
        }
      }
    } catch {
      toast("Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/product-categories/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Categoria excluída", "success");
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao excluir", "error");
      }
    } catch {
      toast("Erro ao excluir", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorias de Produtos</h1>
        <button
          onClick={openNew}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + Nova Categoria
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl border mb-6 flex items-end gap-3">
          <Input
            label="Nome da categoria"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ex: Laticínios, Hortifrúti, Padaria..."
            required
            className="flex-1"
          />
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : editId ? "Atualizar" : "Criar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </form>
      )}

      <div className="bg-white rounded-xl border">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhuma categoria de produto cadastrada.</div>
        ) : (
          <div className="divide-y">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-400">{cat._count.products} produto(s)</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(cat)}
                    className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className="text-sm text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir categoria"
        message={
          deleteTarget?._count.products
            ? `A categoria "${deleteTarget.name}" tem ${deleteTarget._count.products} produto(s) vinculado(s). Os produtos não serão excluídos, apenas perderão a categoria.`
            : `Excluir "${deleteTarget?.name}" permanentemente?`
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={deleteCategory}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
