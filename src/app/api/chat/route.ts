import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/services/chat-service";
import { requirePlan } from "@/lib/plan-check";
import { rateLimit } from "@/lib/rate-limit";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY || "",
});

function extractText(msg: { role?: string; content?: string; parts?: { type: string; text: string }[] }) {
  const role = msg.role === "assistant" ? "assistant" : "user";
  let content = msg.content || "";
  if (!content && msg.parts) {
    content = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("\n");
  }
  return { role, content: content || "" } as const;
}

function getModel() {
  const provider = process.env.AI_PROVIDER || "openrouter";
  const modelName = process.env.AI_MODEL || "openai/gpt-4o-mini";

  if (provider === "groq") {
    return groq(modelName);
  }
  return openrouter.chat(modelName);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }

    const rl = rateLimit(`chat:${session.user.id}`, 30, 60 * 1000);
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "Limite de mensagens excedido. Aguarde um momento." }), { status: 429 });
    }

    const planError = await requirePlan("assistant");
    if (planError) return planError;

    const body = await request.json();
    const rawMessages: unknown[] = body.messages || [];

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Mensagem obrigatória" }), { status: 400 });
    }

    const systemPrompt = await getUserContext(session.user.id);
    const messages = (rawMessages as { role?: string; content?: string; parts?: { type: string; text: string }[] }[]).map(extractText);

    const result = streamText({
      model: getModel(),
      system: systemPrompt || "Você é um assistente do sistema Receita Justa.",
      messages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno do assistente" }),
      { status: 500 }
    );
  }
}
