"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { recipes: number };
}

const borderColors = [
  "border-l-emerald-400",
  "border-l-sky-400",
  "border-l-violet-400",
  "border-l-amber-400",
  "border-l-rose-400",
  "border-l-cyan-400",
  "border-l-lime-400",
  "border-l-fuchsia-400",
];

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast("Erro ao carregar categorias", "error");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditId(null);
    setFormName("");
    setShowForm(true);
  }

  function openEdit(cat: Category) {
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
        const res = await fetch(`/api/categories/${editId}`, {
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
        const res = await fetch("/api/categories", {
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
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
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
      <div className="space-y-5">
        <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl animate-pulse" />
        <div className="h-14 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-2xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-2xl animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorias</h1>
          <p className="text-emerald-100 text-sm mt-1">
            {categories.length} {categories.length === 1 ? "categoria cadastrada" : "categorias cadastradas"}
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm border border-white/20 shadow-inner"
        >
          + Nova Categoria
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-xl flex items-end gap-4"
        >
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <Input
              label="Nome da categoria"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Padaria, Bolos, Salgados..."
              required
              className="flex-1 pl-10"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : editId ? "Atualizar" : "Criar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </form>
      )}

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-300 text-lg font-medium">Nenhuma categoria cadastrada.</p>
          <p className="text-gray-200 text-sm mt-1">Clique em "+ Nova Categoria" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border-l-4 ${borderColors[idx % borderColors.length]} shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between p-5`}
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    slug: <span className="font-mono text-gray-300">{cat.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {cat._count.recipes} {cat._count.recipes === 1 ? "receita" : "receitas"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="group relative w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Editar
                    </span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className="group relative w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Excluir
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir categoria"
        message={
          deleteTarget?._count.recipes
            ? `A categoria "${deleteTarget.name}" tem ${deleteTarget._count.recipes} receita(s) vinculada(s). As receitas não serão excluídas, apenas perderão a categoria.`
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
