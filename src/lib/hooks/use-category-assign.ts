"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

export function useCategoryAssign(recipeId: string, initialCategoryId: string) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  async function assignCategory(categoryId: string) {
    setAssigning(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: categoryId || null }),
      });
      if (res.ok) {
        setSelectedCategory(categoryId);
        if (categoryId) toast("Categoria atualizada", "success");
      }
    } catch {
      toast("Erro ao atualizar categoria", "error");
    } finally {
      setAssigning(false);
    }
  }

  return { categories, selectedCategory, assigning, assignCategory, setCategories };
}
