"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useToast } from "@/components/ui/toast";

export function ChatWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", text: "Olá! Sou o assistente da **Receita Justa**. Pergunte sobre suas receitas, custos, margens, ou peça uma receita nova! 😊" }],
      },
    ],
  });

  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const isLoading = status === "streaming" || status === "submitted";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="bg-white rounded-2xl w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-10rem)] flex flex-col shadow-2xl border border-gray-200 mb-4">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl px-5 py-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Assistente IA</p>
                <p className="text-xs text-emerald-100/80">Receita Justa</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${(msg.role as string) === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  (msg.role as string) === "user"
                    ? "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-br-md shadow-sm"
                    : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                }`}>
                  <div className="prose prose-sm max-w-none">
                    {msg.parts?.map((part, j) =>
                      part.type === "text"
                        ? <div key={j} className={`whitespace-pre-wrap ${j > 0 ? "mt-1.5" : ""}`}>{part.text}</div>
                        : null
                    )}
                  </div>
                  {(msg.role as string) === "assistant" && msg.id !== "welcome" && (
                    <button
                      onClick={async () => {
                        const text = msg.parts?.filter(p => p.type === "text").map(p => p.text).join("\n") || "";
                        if (!text.trim()) return;
                        setSavingId(msg.id);
                        try {
                          const res = await fetch("/api/recipes/import", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            toast(err.error || "Erro ao processar receita", "error");
                            setSavingId(null);
                            return;
                          }
                          const data = await res.json();
                          sessionStorage.setItem("import_recipe_data", JSON.stringify(data));
                          if (!data.ingredients?.length) {
                            sessionStorage.setItem("import_recipe_text", text);
                          } else {
                            sessionStorage.removeItem("import_recipe_text");
                          }
                          setSavingId(null);
                          router.push("/dashboard/recipes/import");
                        } catch {
                          toast("Erro ao conectar. Tente novamente.", "error");
                          setSavingId(null);
                        }
                      }}
                      disabled={savingId === msg.id}
                      className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {savingId === msg.id ? "⏳ Processando..." : "📥 Salvar Receita"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (messages[messages.length - 1]?.role as string) === "user" && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 text-sm text-gray-400 border border-gray-100 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-600">
                  {error.message || error.toString?.() || "Erro de conexão. Tente novamente."}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                )}
                {isLoading ? "" : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          title="Abrir assistente"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      )}
    </div>
  );
}
