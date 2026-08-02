"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface SaveData {
  suggestedPrice: number;
  packagingCost: number;
  transportCost: number;
  laborCost: number;
  feePercent: number;
  desiredMargin: number;
}

export function ProfitCalculatorModal({
  open,
  onClose,
  custoReal,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  custoReal: number;
  onSave: (data: SaveData) => Promise<void>;
}) {
  const [packaging, setPackaging] = useState("");
  const [transport, setTransport] = useState("");
  const [labor, setLabor] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [marginInput, setMarginInput] = useState("50");
  const [saving, setSaving] = useState(false);

  const pkg = Number(packaging) || 0;
  const trp = Number(transport) || 0;
  const lab = Number(labor) || 0;
  const fee = Number(feePercent) || 0;
  const desiredMargin = Number(marginInput) || 0;

  const totalCost = custoReal + pkg + trp + lab;

  const suggestedPrice = useMemo(() => {
    if (desiredMargin <= 0 || desiredMargin >= 100) return 0;
    return totalCost / (1 - desiredMargin / 100);
  }, [totalCost, desiredMargin]);

  const grossProfit = suggestedPrice > 0 ? suggestedPrice - totalCost : 0;
  const feeDeduction = suggestedPrice > 0 ? suggestedPrice * (fee / 100) : 0;
  const netProfit = suggestedPrice > 0 ? suggestedPrice - totalCost - feeDeduction : 0;
  const effectiveMargin = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;
  const markup = totalCost > 0 ? ((suggestedPrice / totalCost) - 1) * 100 : 0;

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    await onSave({
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      packagingCost: pkg,
      transportCost: trp,
      laborCost: lab,
      feePercent: fee,
      desiredMargin,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2">💰 Calcular Lucro</h3>
        <p className="text-xs text-gray-400 mb-5">
          Preencha os custos abaixo para calcular o preço de venda sugerido.
        </p>

        <div className="space-y-6">

          {/* Seção 1 — Custo de Insumos */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">1. Custo de Insumos</h4>
            <div className="glass-card p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <label className="text-sm font-medium text-gray-700">Ingredientes da receita</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">R$ {custoReal.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-gray-400 mt-1">Calculado automaticamente com base nos ingredientes.</p>
            </div>
          </div>

          {/* Seção 2 — Custos Operacionais */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">2. Custos Operacionais (R$)</h4>
            <div className="glass-card p-4 rounded-xl bg-white border space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Embalagem</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Transporte / Entrega</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mão de Obra / Gás</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Seção 3 — Taxas e Impostos */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">3. Taxas e Impostos</h4>
            <div className="glass-card p-4 rounded-xl bg-white border">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Taxa da plataforma / cartão (%)</label>
                <span className="group relative inline-flex cursor-help" title="Percentual descontado sobre o preço de venda (ex: taxa do iFood, Mercado Pago, cartão de crédito).">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                placeholder="3,5"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Ex: 3,5% para cartão de crédito ou iFood.</p>
            </div>
          </div>

          {/* Margem desejada */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">4. Margem Desejada</h4>
            <div className="glass-card p-4 rounded-xl bg-white border">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Margem de lucro desejada (%)</label>
                <span className="group relative inline-flex cursor-help" title="Margem é o percentual do lucro sobre o preço de venda. Ex: 50% de margem = o lucro é metade do preço. Diferente de markup (lucro sobre o custo).">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={marginInput}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setMarginInput(v === "" || v === "0" ? "" : v);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                placeholder="50"
              />
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400">Margem sobre o preço de venda</p>
                {desiredMargin > 0 && suggestedPrice > 0 && (
                  <span className="text-xs text-blue-500">
                    (markup: {markup.toFixed(1).replace(".", ",")}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Custo de insumos</span>
              <strong>R$ {custoReal.toFixed(2).replace(".", ",")}</strong>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Custos operacionais</span>
              <strong>R$ {(pkg + trp + lab).toFixed(2).replace(".", ",")}</strong>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxas ({fee.toFixed(1).replace(".", ",")}%)</span>
                <strong className="text-red-500">- R$ {feeDeduction.toFixed(2).replace(".", ",")}</strong>
              </div>
            )}
            <div className="border-t border-emerald-200 pt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Custo total</span>
                <span className="font-semibold">R$ {totalCost.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Preço de venda</span>
                <span className="text-lg font-bold text-emerald-700">R$ {suggestedPrice > 0 ? suggestedPrice.toFixed(2).replace(".", ",") : "—"}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Lucro líquido</span>
                <strong>R$ {netProfit.toFixed(2).replace(".", ",")}</strong>
              </div>
              <div className="flex justify-between text-sm font-semibold text-emerald-700">
                <span>Margem líquida</span>
                <span>{effectiveMargin.toFixed(1).replace(".", ",")}%</span>
              </div>
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
