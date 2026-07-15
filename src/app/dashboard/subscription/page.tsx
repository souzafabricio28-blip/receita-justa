"use client";

import { useSession } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

function SubscriptionContent() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const failure = searchParams.get("failure");
  const upgraded = searchParams.get("upgraded");
  const [loading, setLoading] = useState<PlanId | null>(null);

  const currentPlan = (session?.user as any)?.plan || "basico";

  async function handleUpgrade(plan: PlanId) {
    setLoading(plan);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        if (data.url.startsWith("http")) {
          window.location.href = data.url;
        } else {
          router.push(data.url);
        }
      }
    } catch {
      alert("Erro ao processar pagamento");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Planos</h1>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 text-emerald-700 font-medium">
          Pagamento aprovado! Seu plano Premium já está ativo.
        </div>
      )}

      {upgraded && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 text-emerald-700 font-medium">
          Plano Premium ativado com sucesso!
        </div>
      )}

      {failure && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6 text-red-700 font-medium">
          Pagamento não foi concluído. Tente novamente.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(PLANS).map(([id, plan]) => (
          <div
            key={id}
            className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${
              currentPlan === id ? "border-emerald-500" : "border-gray-200"
            }`}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-1">{plan.label}</h2>
            <p className="text-3xl font-bold text-gray-900 mb-4">
              {plan.price > 0 ? `R$ ${plan.price.toFixed(2).replace(".", ",")}` : "Grátis"}
              {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/mês</span>}
            </p>

            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> {f}
                </li>
              ))}
            </ul>

            {currentPlan === id ? (
              <div className="text-center text-sm font-medium text-emerald-600 bg-emerald-50 py-2 rounded-lg">
                Plano atual
              </div>
            ) : id === "premium" ? (
              <Button onClick={() => handleUpgrade(id as PlanId)} disabled={loading === id}>
                {loading === id ? "Processando..." : "Assinar Premium"}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded-xl" />}>
      <SubscriptionContent />
    </Suspense>
  );
}
