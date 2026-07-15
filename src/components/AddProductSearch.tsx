"use client";

import { useState, useEffect, useRef } from "react";

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number;
  realAveragePrice: number | null;
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
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
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

  async function handleAdd(productId: string) {
    const qty = addQty[productId] || 1;
    setAddingId(productId);
    await onAdd(productId, qty);
    setAddingId(null);
    setSearchResults([]);
    setSearchTerm("");
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
      >
        {open ? "Cancelar" : "+ Adicionar"}
      </button>

      {open && (
        <div ref={searchRef} className="relative mt-4">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {(searchResults.length > 0 || searching) && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searching ? (
                <div className="p-3 text-sm text-gray-400 text-center">Buscando...</div>
              ) : (
                searchResults.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 border-b last:border-0">
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-gray-400">R$ {p.averagePrice.toFixed(2).replace(".", ",")}/{p.unit}</span>
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={addQty[p.id] || ""}
                      onChange={(e) => setAddQty((prev) => ({ ...prev, [p.id]: Number(e.target.value) || 0 }))}
                      placeholder="Qtd"
                      className="w-16 px-2 py-1 border rounded text-xs"
                    />
                    <span className="text-xs text-gray-400 w-6">{p.unit}</span>
                    <button
                      onClick={() => handleAdd(p.id)}
                      disabled={addingId === p.id}
                      className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {addingId === p.id ? "..." : "Add"}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
