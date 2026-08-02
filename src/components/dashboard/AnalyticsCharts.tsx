"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export type ChartDataItem = {
  name: string;
  custoTotal: number;
  lucroLiquido: number;
};

export function AnalyticsCharts({ data }: { data: ChartDataItem[] }) {
  if (data.length === 0) return null;

  const top5 = [...data]
    .sort((a, b) => b.lucroLiquido - a.lucroLiquido)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Top 5 Receitas — Custo vs Lucro
      </h2>
      <p className="text-xs text-gray-400 mb-6">Comparativo entre custo total e lucro líquido por receita</p>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={top5} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: 13,
            }}
            formatter={(value, name) => [
              `R$ ${Number(value).toFixed(2)}`,
              name === "custoTotal" ? "Custo Total" : "Lucro Líquido",
            ]}
          />
          <Bar dataKey="custoTotal" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {top5.map((_, i) => (
              <Cell key={`c-${i}`} fill="#94a3b8" />
            ))}
          </Bar>
          <Bar dataKey="lucroLiquido" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {top5.map((_, i) => (
              <Cell key={`l-${i}`} fill="#10b981" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gray-400" />
          Custo Total
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Lucro Líquido
        </span>
      </div>
    </div>
  );
}
