"use client";

import { useEffect, useState } from "react";
import type { SerpApiQuota } from "@/lib/serpapi-quota";

export function SerpApiQuotaBanner() {
  const [quota, setQuota] = useState<SerpApiQuota | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/serpapi-quota", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setQuota(data?.quota ?? null);
      })
      .catch(() => {
        if (active) setQuota(null);
      });
    return () => {
      active = false;
    };
  }, []);

  if (quota === undefined || quota === null) return null;
  if (!quota.exhausted && !quota.low) return null;

  const pct = quota.searchesPerMonth > 0 ? Math.round((quota.used / quota.searchesPerMonth) * 100) : 0;

  const style = quota.exhausted
    ? "bg-red-50 border-red-300 text-red-800"
    : "bg-amber-50 border-amber-300 text-amber-800";

  const title = quota.exhausted
    ? "Cota gratuita de buscas de preço esgotada"
    : `Cota de buscas de preço quase esgotada (${pct}% usada)`;

  const body = quota.exhausted
    ? "As buscas reais de preço (SerpAPI) terminaram. Os preços voltaram a ser estimados. Soluções: aguardar a renovação mensal"
      + (quota.renewalDate ? ` (${quota.renewalDate})` : "")
      + ", assinar o plano pago da SerpAPI, ou integrar busca direta nos supermercados."
    : `Restam ${quota.remaining} de ${quota.searchesPerMonth} buscas reais neste mês${
        quota.renewalDate ? ` (renova em ${quota.renewalDate})` : ""
      }. Quando acabar, os preços voltam a ser estimados.`

  return (
    <div className={`rounded-xl border px-4 py-3 mb-6 text-sm ${style}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 opacity-90">{body}</div>
    </div>
  );
}
