"use client";

import { useState, useEffect, useRef } from "react";

interface Brand {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
  brand: Brand | null;
  brandId: string | null;
}

export function AddProductSearch({
  existingProductIds,
  onAdd,
}: {
  existingProductIds: string[];
  onAdd: (productId: string, quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ProductData[]>([]);
  const [searching, setSearching] = useState(false);
  const [addQty, setAddQty] = useState<Record<string, number>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
        setSelectedProduct(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim() || !open) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        setSearchResults(data.filter((p: ProductData) => !existingProductIds.includes(p.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, existingProductIds, open]);

  function handleSelect(product: ProductData) {
    setSelectedProduct(product);
  }

  async function handleAdd(productId: string) {
    const qty = addQty[productId] || 1;
    setAddingId(productId);
    await onAdd(productId, qty);
    setAddingId(null);
    setSearchResults([]);
    setSearchTerm("");
    setSelectedProduct(null);
    setAddQty({});
    setOpen(false);
  }

  function handleBack() {
    setSelectedProduct(null);
  }

  if (open && selectedProduct) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={handleBack}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm text-gray-500">Selecionar outro produto</span>
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
              {selectedProduct.brand && (
                <p className="text-xs text-gray-500">Marca: <span className="font-medium text-gray-700">{selectedProduct.brand.name}</span></p>
              )}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Quantidade</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={addQty[selectedProduct.id] || ""}
                  onChange={(e) => setAddQty((prev) => ({ ...prev, [selectedProduct.id]: Number(e.target.value) || 0 }))}
                  placeholder="Qtd"
                  className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                />
                <span className="text-sm font-medium text-gray-600">{selectedProduct.unit}</span>
              </div>
            </div>
            <button
              onClick={() => handleAdd(selectedProduct.id)}
              disabled={addingId === selectedProduct.id}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingId === selectedProduct.id ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Adicionando...
                </span>
              ) : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
          open
            ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
        }`}
      >
        {open ? "Cancelar" : "+ Adicionar Ingrediente"}
      </button>

      {open && (
        <div ref={searchRef} className="relative mt-4">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto por nome..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
              autoFocus
            />
          </div>
          {(searchResults.length > 0 || searching) && (
            <div className="absolute z-10 top-full mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 max-h-72 overflow-y-auto">
              {searching ? (
                <div className="p-5 text-sm text-gray-400 text-center">
                  <span className="inline-block animate-pulse">Buscando...</span>
                </div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 border-b border-gray-50 last:border-0 transition-all text-left group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-700 transition-colors">{p.name}</span>
                        {p.brand && (
                          <span className="text-xs text-gray-400 font-normal">({p.brand.name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{p.unit}</span>
                        {p.realAveragePrice !== null ? (
                          <span className="text-xs font-medium text-emerald-600">R$ {p.realAveragePrice.toFixed(2).replace(".", ",")}/{p.unit}</span>
                        ) : p.averagePrice !== null ? (
                          <span className="text-xs text-gray-400">R$ {p.averagePrice.toFixed(2).replace(".", ",")}/{p.unit}</span>
                        ) : null}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}