"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface CalcData {
  createdAt: string;
  profit: number;
  profitMargin: number;
  suggestedPrice: number;
}

interface SaveData {
  suggestedPrice: number;
  packagingCost: number;
  transportCost: number;
  laborCost: number;
  feePercent: number;
  desiredMargin: number;
}

export function useProfitCalculation(recipeId: string, initialCalc: CalcData | null) {
  const [showModal, setShowModal] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [lastCalc, setLastCalc] = useState<CalcData | null>(initialCalc);
  const { toast } = useToast();

  async function calculateProfit(data: SaveData) {
    setCalculating(true);
    try {
      const res = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, ...data }),
      });
      if (res.ok) {
        const calcData = await res.json();
        setLastCalc(calcData);
        setShowModal(false);
        toast("Lucro calculado!", "success");
      } else {
        const err = await res.json();
        toast(err.error || "Erro ao calcular lucro", "error");
      }
    } catch {
      toast("Erro ao calcular lucro", "error");
    } finally {
      setCalculating(false);
    }
  }

  return {
    showModal,
    setShowModal,
    calculating,
    lastCalc,
    calculateProfit,
  };
}
