"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number;
  realAveragePrice: number | null;
}

interface RecipeProductData {
  id: string;
  quantity: number;
  product: ProductData;
}

export function useRecipeProducts(recipeId: string, initialProducts: RecipeProductData[]) {
  const [products, setProducts] = useState(initialProducts);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pricesMap, setPricesMap] = useState<Record<string, { title: string; price: number; store: string; url: string }[]>>({});
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  function getPrice(rp: RecipeProductData): number {
    return rp.product.realAveragePrice ?? rp.product.averagePrice;
  }

  function getScaledCost(rp: RecipeProductData, scale: number): number {
    return getPrice(rp) * rp.quantity * scale;
  }

  const custoReal = (scale: number) => products.reduce((sum, rp) => sum + getScaledCost(rp, scale), 0);
  const hasRealPrices = products.some((rp) => rp.product.realAveragePrice !== null);

  function marketTotalCost(scale: number): number {
    return products.reduce((sum, rp) => {
      const prices = pricesMap[rp.product.id];
      if (!prices || prices.length === 0) return sum + getPrice(rp) * rp.quantity * scale;
      const avg = prices.reduce((s, p) => s + p.price, 0) / prices.length;
      return sum + avg * rp.quantity * scale;
    }, 0);
  }

  async function searchProductPrice(productId: string, productName: string) {
    setLoadingPrices((prev) => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`/api/prices/search?q=${encodeURIComponent(productName)}`);
      const data = await res.json();
      setPricesMap((prev) => ({ ...prev, [productId]: data.results || [] }));
    } catch {
      // Silently fail
    } finally {
      setLoadingPrices((prev) => ({ ...prev, [productId]: false }));
    }
  }

  async function addProduct(productId: string, quantity: number) {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.ok) {
        const rp = await res.json();
        setProducts((prev) => [...prev, rp]);
        toast("Ingrediente adicionado!", "success");
      }
    } catch {
      toast("Erro ao adicionar ingrediente", "error");
    }
  }

  async function removeProduct(productId: string) {
    setRemovingId(productId);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((rp) => rp.product.id !== productId));
        toast("Ingrediente removido", "info");
      }
    } catch {
      toast("Erro ao remover ingrediente", "error");
    } finally {
      setRemovingId(null);
    }
  }

  return {
    products,
    pricesMap,
    loadingPrices,
    removingId,
    custoReal,
    marketTotalCost,
    hasRealPrices,
    searchProductPrice,
    addProduct,
    removeProduct,
  };
}
