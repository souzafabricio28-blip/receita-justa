"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { unitPriceFromMarket } from "@/lib/package-price";

interface BrandInfo {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
  currentStock: number;
  brand: BrandInfo | null;
  brandId: string | null;
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
    return rp.product.realAveragePrice ?? rp.product.averagePrice ?? 0;
  }

  function getScaledCost(rp: RecipeProductData, scale: number): number {
    return getPrice(rp) * rp.quantity * scale;
  }

  const custoReal = (scale: number) => products.reduce((sum, rp) => sum + getScaledCost(rp, scale), 0);
  const hasRealPrices = products.some((rp) => rp.product.realAveragePrice !== null);

  function marketTotalCost(scale: number): number {
    return products.reduce((sum, rp) => {
      const prices = pricesMap[rp.product.id];
      if (prices && prices.length > 0) {
        const avg = prices.reduce((s, p) => s + p.price, 0) / prices.length;
        return sum + avg;
      }
      return sum + getPrice(rp) * rp.quantity * scale;
    }, 0);
  }

  async function searchProductPrice(productId: string, productName: string, brandName?: string) {
    setLoadingPrices((prev) => ({ ...prev, [productId]: true }));
    try {
      const params = new URLSearchParams({ q: productName });
      if (brandName) params.set("brand", brandName);
      params.set("productId", productId);
      params.set("refine", "1");
      const res = await fetch(`/api/prices/search?${params}`, { cache: "no-store" });
      const data = await res.json();
      const results = data.results || [];
      const source = data.source as string | undefined;
      setPricesMap((prev) => ({ ...prev, [productId]: results }));
      const rp = products.find((p) => p.product.id === productId);
      if (rp && results.length > 0) {
        if (source === "fallback") {
          toast("Cota de buscas reais esgotada — exibindo preços estimados.", "info");
        } else {
          const best = lowestPrice(results);
          const ok = await applyPrice(rp.product.id, best, rp.quantity);
          if (ok) toast("Menor preço aplicado ao ingrediente!", "success");
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingPrices((prev) => ({ ...prev, [productId]: false }));
    }
  }

  function lowestPrice(results: { title: string; price: number; store: string; url: string }[]) {
    return results.reduce((min, p) => (p.price < min.price ? p : min), results[0]);
  }

  async function applyPrice(
    productId: string,
    price: { title: string; price: number; store: string; url: string },
    quantity: number
  ) {
    const rp = products.find((p) => p.product.id === productId);
    const unit = rp?.product.unit || "un";
    const perUnitPrice = unitPriceFromMarket(price.title, price.price, unit, quantity);
    const res = await fetch(`/api/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ averagePrice: perUnitPrice }),
    });
    if (res.ok) {
      updateProductPrice(productId, perUnitPrice);
      return true;
    }
    return false;
  }

  async function searchAllPrices() {
    const loading: Record<string, boolean> = {};
    for (const rp of products) {
      loading[rp.product.id] = true;
    }
    setLoadingPrices(loading);

    const results = await Promise.allSettled(
      products.map((rp) =>
        fetch(
          `/api/prices/search?q=${encodeURIComponent(rp.product.name)}&productId=${rp.product.id}&refine=1`,
          { cache: "no-store" }
        )
          .then((r) => r.json())
          .then((data) => ({ productId: rp.product.id, results: data.results || [], source: data.source as string | undefined }))
      )
    );

    const updates: Record<string, { title: string; price: number; store: string; url: string }[]> = {};
    const sources: Record<string, string | undefined> = {};
    let fallbackCount = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        updates[r.value.productId] = r.value.results;
        sources[r.value.productId] = r.value.source;
        if (r.value.source === "fallback" && r.value.results.length > 0) fallbackCount++;
      }
    }
    setPricesMap((prev) => ({ ...prev, ...updates }));

    let applied = 0;
    for (const rp of products) {
      const list = updates[rp.product.id];
      if (list && list.length > 0) {
        if (sources[rp.product.id] === "fallback") continue;
        const best = lowestPrice(list);
        const ok = await applyPrice(rp.product.id, best, rp.quantity);
        if (ok) applied++;
      }
    }

    const done: Record<string, boolean> = {};
    for (const rp of products) {
      done[rp.product.id] = false;
    }
    setLoadingPrices(done);

    if (applied > 0) {
      toast(`${applied} ingrediente(s) com o menor preço aplicado.`, "success");
    } else if (fallbackCount > 0) {
      toast("Cota de buscas reais esgotada — exibindo preços estimados.", "info");
    }
  }

  function updateProductPrice(productId: string, newAveragePrice: number) {
    setProducts((prev) =>
      prev.map((rp) =>
        rp.product.id === productId
          ? { ...rp, product: { ...rp.product, averagePrice: newAveragePrice } }
          : rp
      )
    );
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

  function deductStock(deductions: { productId: string; deducted: number }[]) {
    setProducts((prev) =>
      prev.map((rp) => {
        const d = deductions.find((d) => d.productId === rp.product.id);
        if (!d) return rp;
        return {
          ...rp,
          product: {
            ...rp.product,
            currentStock: Math.max(0, rp.product.currentStock - d.deducted),
          },
        };
      })
    );
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
    searchAllPrices,
    applyPrice,
    updateProductPrice,
    deductStock,
    addProduct,
    removeProduct,
  };
}