"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Olá! Quer uma receita? É só pedir! Posso importar automaticamente os ingredientes e o modo de preparo para você. 😊" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response || "Erro ao processar." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro de conexão. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function importRecipe(assistantMsg: string) {
    setImporting(assistantMsg);
    try {
      const parseRes = await fetch("/api/recipes/import?forceFallback=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: assistantMsg }),
      });
      if (!parseRes.ok) {
        toast("Erro ao processar receita do assistente", "error");
        return;
      }
      const data = await parseRes.json();
      if (!data.title) {
        toast("Não foi possível identificar uma receita no texto do assistente", "error");
        return;
      }

      const saveRes = await fetch("/api/recipes/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description || "",
          instructions: data.instructions || "",
          yield: data.yield || 1,
          ingredients: (data.ingredients || []).filter((i: any) => i.name).map((i: any) => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            productId: i.productId,
            averagePrice: i.averagePrice || i.productPrice || 0,
          })),
        }),
      });
      if (!saveRes.ok) {
        toast("Erro ao salvar receita", "error");
        return;
      }

      const recipe = await saveRes.json();
      toast("Receita importada com sucesso!", "success");
      router.push(`/dashboard/recipes/${recipe.id}`);
    } catch {
      toast("Erro ao importar receita", "error");
    } finally {
      setImporting(null);
    }
  }

  function looksLikeRecipe(text: string): boolean {
    const lower = text.toLowerCase();
    const hasIngredients = lower.includes("ingrediente") || /\b(\d+)\s*(kg|g|ml|l|un|xícara|colher)\b/i.test(text);
    const hasInstructions = lower.includes("modo de preparo") || lower.includes("passo") || lower.includes("preparo");
    return hasIngredients || hasInstructions;
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center text-2xl z-50"
        title="Assistente AI"
      >
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-10rem)] bg-white rounded-2xl shadow-2xl border flex flex-col z-50">
          <div className="p-4 border-b bg-emerald-600 text-white rounded-t-2xl">
            <p className="font-semibold">Assistente Receita Justa</p>
            <p className="text-xs text-emerald-100">Tire dúvidas sobre receitas, custos e lucros</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content.split("\n").map((line, j) => (
                    <p key={j} className={j > 0 ? "mt-1" : ""}>{line}</p>
                  ))}
                </div>
                {msg.role === "assistant" && looksLikeRecipe(msg.content) && i === messages.length - 1 && (
                  <button
                    onClick={() => importRecipe(msg.content)}
                    disabled={importing === msg.content}
                    className="mt-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full hover:bg-emerald-200 transition-colors disabled:opacity-50"
                  >
                    {importing === msg.content ? "Importando..." : "📥 Importar Receita"}
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-4 py-2 text-sm text-gray-500">
                  Pensando...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida..."
                disabled={loading}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
