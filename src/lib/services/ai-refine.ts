import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { logger } from "@/lib/logger";

const REFINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { query: string; at: number }>();

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function refineSearchQuery(productName: string, brandName?: string): Promise<string | null> {
  const key = `${productName}|${brandName || ""}`.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < REFINE_CACHE_TTL_MS) return cached.query;

  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const { text } = await generateText({
      model: openrouter.chat(process.env.AI_MODEL || "openai/gpt-4o-mini"),
      prompt: `Você é um especialista em supermercados brasileiros. Preciso de uma QUERY de busca eficaz para encontrar o preço de um ingrediente em e-commerces de supermercado (Assaí, Carrefour, Extra, Atacadão, Mercado Livre, etc).

Ingrediente: "${productName}"${brandName ? `\nMarca: "${brandName}"` : ""}

Escreva APENAS a query de busca, em português, curta e direta (máx. 6 palavras), usando o termo comercial mais comum. NÃO escreva explicações, não use aspas, não inclua a palavra "preço" nem "supermercado".

Exemplos:
- "Peito de Frango" → "peito de frango congelado"
- "Ovo" → "ovo branco caixa 30"
- "Farinha de Trigo" → "farinha de trigo tipo 1"
- "Azeite" → "azeite extra virgem"
- "Cebola" → "cebola kg"

Query:`,
      temperature: 0.2,
      maxOutputTokens: 20,
    });

    const query = text.trim().replace(/^["']+|["']+$/g, "").replace(/\s+/g, " ").slice(0, 60);
    if (!query || query.length < 2) return null;

    cache.set(key, { query, at: Date.now() });
    return query;
  } catch (err) {
    logger.warn("AI refine falhou", { productName, error: String(err) });
    return null;
  }
}
