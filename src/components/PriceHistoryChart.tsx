"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface HistoryPoint {
  createdAt: string;
  price: number;
  store?: string | null;
  source?: string;
}

export function PriceHistoryChart({ productId }: { productId: string }) {
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/prices/history?productId=${productId}&days=90`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setPoints(data?.points ?? []);
      })
      .catch(() => {
        if (active) setPoints([]);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  if (points === null) {
    return <span className="text-xs text-gray-400">Carregando histórico...</span>;
  }
  if (points.length === 0) {
    return <span className="text-xs text-gray-400">Sem histórico de preços ainda.</span>;
  }

  const data = points.map((p) => ({
    dia: new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    preço: p.price,
    loja: p.store || "—",
  }));

  return (
    <div className="w-full h-32 mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value) => [`R$ ${Number(value).toFixed(2).replace(".", ",")}`, "Preço"]}
            labelFormatter={(label, payload) => {
              const item = payload?.[0]?.payload as { loja?: string };
              return item?.loja ? `${label} · ${item.loja}` : String(label);
            }}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Line type="monotone" dataKey="preço" stroke="#0d9488" strokeWidth={2} dot={{ r: 2.5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
