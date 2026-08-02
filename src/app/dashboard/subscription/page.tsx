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
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-8 mb-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-8 h-8 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h1 className="text-3xl font-bold">Planos</h1>
        </div>
        <p className="text-emerald-100 text-lg ml-11">
          {currentPlan === "premium"
            ? "Você está no plano Premium. Aproveite todos os recursos!"
            : "Escolha o plano ideal para o seu negócio"}
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mb-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-lg">Pagamento aprovado!</p>
            <p className="text-emerald-600">Seu plano Premium já está ativo.</p>
          </div>
        </div>
      )}

      {upgraded && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mb-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-lg">Plano Premium ativado!</p>
            <p className="text-emerald-600">Seu plano foi atualizado com sucesso.</p>
          </div>
        </div>
      )}

      {failure && (
        <div className="bg-red-50 border border-red-200 p-5 rounded-2xl mb-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-800 text-lg">Pagamento não concluído</p>
            <p className="text-red-600">Ocorreu um erro ao processar. Tente novamente.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {Object.entries(PLANS)
          .filter(([id]) => id !== "admin")
          .map(([id, plan]) => (
          <div
            key={id}
            className={`relative bg-white rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
              id === "premium"
                ? "border-2 border-emerald-500 shadow-xl shadow-emerald-500/20"
                : currentPlan === id
                  ? "border-2 border-emerald-500 shadow-lg"
                  : "border-2 border-gray-200 shadow-sm hover:shadow-md"
            }`}
          >
            {id === "premium" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                Popular
              </div>
            )}

            <div className="flex items-center gap-3 mb-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                id === "premium"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {id === "premium" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{plan.label}</h2>
            </div>

            <div className="mt-3 mb-5">
              <span className="text-4xl font-extrabold text-gray-900">
                {plan.price > 0 ? `R$ ${plan.price.toFixed(2).replace(".", ",")}` : "Grátis"}
              </span>
              {plan.price > 0 && (
                <span className="text-base font-normal text-gray-500 ml-1">/mês</span>
              )}
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-3">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {currentPlan === id ? (
              <div className={`text-center text-sm font-semibold py-3 rounded-xl ${
                id === "premium"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700"
              }`}>
                Plano atual
              </div>
            ) : id === "premium" ? (
              <Button
                onClick={() => handleUpgrade(id as PlanId)}
                disabled={loading === id}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {loading === id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processando...
                  </span>
                ) : (
                  "Assinar Premium"
                )}
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
    <Suspense fallback={
      <div className="max-w-4xl">
        <div className="h-40 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  );
}
