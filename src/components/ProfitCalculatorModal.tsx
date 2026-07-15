"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

export function ProfitCalculatorModal({
  open,
  onClose,
  custoReal,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  custoReal: number;
  onSave: (otherCosts: number, suggestedPrice: number) => Promise<void>;
}) {
  const [otherCosts, setOtherCosts] = useState(0);
  const [marginInput, setMarginInput] = useState("50");
  const [saving, setSaving] = useState(false);

  const desiredMargin = Number(marginInput) || 0;
  const totalCost = custoReal + otherCosts;
  const suggestedPrice = useMemo(() => {
    if (!marginInput || desiredMargin <= 0 || desiredMargin >= 100) return 0;
    return totalCost / (1 - desiredMargin / 100);
  }, [totalCost, desiredMargin]);

  const profit = suggestedPrice > 0 ? suggestedPrice - totalCost : 0;
  const effectiveMargin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    await onSave(otherCosts, Math.round(suggestedPrice * 100) / 100);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Calcular Lucro</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Custo dos produtos</label>
            <p className="text-2xl font-bold text-gray-900">R$ {custoReal.toFixed(2).replace(".", ",")}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Outros custos (R$)</label>
            <input
              type="number"
              step="any"
              min={0}
              value={otherCosts || ""}
              onChange={(e) => setOtherCosts(Number(e.target.value) || 0)}
              placeholder="0,00"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Mão de obra, embalagem, energia, etc.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Margem desejada (%)</label>
            <input
              type="text"
              inputMode="numeric"
              value={marginInput}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                if (v === "" || v === "0") {
                  setMarginInput("");
                } else {
                  setMarginInput(v);
                }
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
              placeholder="50"
            />
            <p className="text-xs text-gray-400 mt-1">Margem de lucro ideal (padrão: 50%)</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg space-y-2">
            <p className="text-sm text-gray-600">
              Custo total: <strong>R$ {totalCost.toFixed(2).replace(".", ",")}</strong>
            </p>
            <div className="border-t border-emerald-200 pt-2">
              <p className="text-lg font-bold text-emerald-700">
                Preço de venda: R$ {suggestedPrice.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-sm text-emerald-600">
                Lucro: R$ {profit.toFixed(2).replace(".", ",")}
              </p>
              <p className="text-sm font-semibold text-emerald-700">
                Margem: {effectiveMargin.toFixed(1).replace(".", ",")}%
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <Button onClick={handleSave} disabled={saving || suggestedPrice <= 0}>
            {saving ? "Calculando..." : "Salvar Cálculo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
