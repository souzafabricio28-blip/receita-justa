"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    yield: 1,
  });

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          title: data.title || "",
          description: data.description || "",
          instructions: data.instructions || "",
          yield: data.yield || 1,
        });
      })
      .catch(() => toast("Erro ao carregar receita", "error"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/recipes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        instructions: formData.get("instructions"),
        yield: Number(formData.get("yield")) || 1,
      }),
    });

    if (res.ok) {
      toast("Receita atualizada!", "success");
      router.push(`/dashboard/recipes/${id}`);
    } else {
      toast("Erro ao salvar", "error");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Receita</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Título"
          name="title"
          required
          defaultValue={form.title}
          placeholder="Ex: Bolo de Cenoura"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            name="description"
            defaultValue={form.description}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300"
            rows={3}
            placeholder="Uma breve descrição da receita"
          />
        </div>
        <Input label="Rendimento (porções)" name="yield" type="number" defaultValue={form.yield} min={1} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Modo de Preparo</label>
          <textarea
            name="instructions"
            defaultValue={form.instructions}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 font-mono text-sm"
            rows={8}
            placeholder="Passo a passo do preparo..."
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/dashboard/recipes/${id}`)}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
