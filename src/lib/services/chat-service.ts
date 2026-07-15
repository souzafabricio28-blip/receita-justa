import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fallbackResponse } from "@/lib/assistant";

const API_KEY = process.env.OPENAI_API_KEY || "";
const API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

interface UserRecipe {
  title: string;
  productCost: number;
  ingredientCount: number;
  profit?: { profit: number; margin: number; price: number };
}

async function buildUserData(userId: string): Promise<{ name: string; recipes: UserRecipe[] }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      recipes: {
        include: {
          products: { include: { product: true } },
          calculations: { orderBy: { createdAt: "desc" } },
        },
        take: 20,
      },
    },
  });

  const recipes = (user?.recipes || []).map((r) => ({
    title: r.title,
    productCost: r.products.reduce((s, rp) => s + rp.product.averagePrice * rp.quantity, 0),
    ingredientCount: r.products.length,
    profit: r.calculations[0]
      ? {
          profit: r.calculations[0].profit,
          margin: r.calculations[0].profitMargin,
          price: r.calculations[0].suggestedPrice,
        }
      : undefined,
  }));

  return { name: user?.name || "Usuário", recipes };
}

export const chatService = {
  async respond(userId: string, message: string): Promise<string> {
    if (!message?.trim()) return "Digite uma mensagem para eu poder ajudar.";

    const userData = await buildUserData(userId);
    const recipeSummary = userData.recipes
      .map(
        (r) =>
          `- ${r.title}: custo R$ ${r.productCost.toFixed(2)}, ${r.ingredientCount} ingredientes${r.profit ? `, lucro sugerido ${r.profit.margin.toFixed(0)}%` : ""}`
      )
      .join("\n") || "Nenhuma receita cadastrada.";

    if (!API_KEY) {
      return fallbackResponse(message, userData);
    }

    const systemPrompt = `Você é um assistente especializado do sistema "Receita Justa", uma plataforma de gestão de receitas culinárias.

## O que o sistema faz:
- Cadastro de receitas com ingredientes e quantidades
- Cadastro de produtos com preços por unidade (kg, g, L, ml, un)
- Cálculo de custo total por receita e por porção
- Pesquisa de preços de mercado na internet
- Comparação entre preço cadastrado e preço de mercado
- Cálculo de lucro: receita - custos = lucro e margem

## Dados do usuário:
Nome: ${userData.name}
Receitas cadastradas:
${recipeSummary}

## Orientações:
- Responda em português brasileiro, de forma clara e amigável
- Quando o usuário digitar APENAS o nome de uma comida (ex: "torta de frango"), ENTENDA que ele quer a receita completa
- SEMPRE formate receitas com as seções "**Ingredientes:**" e "**Modo de Preparo:**" para que o botão de importar funcione
- Ajude o usuário a interpretar os custos, margens e lucros
- Sugira estratégias para reduzir custos ou precificar melhor
- Use os dados reais do usuário para dar conselhos específicos
- Se perguntar sobre preços de mercado, sugira usar o botão 🔍 Buscar Preços
- Seja breve e direto, sem enrolação`;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          "HTTP-Referer": process.env.NEXTAUTH_URL || "https://receita-justa.vercel.app",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        logger.warn("AI chat API failed, using fallback", { status: res.status });
        const errText = await res.text();
        if (errText.includes("quota") || errText.includes("insufficient") || res.status === 429) {
          return "⚠️ A API está com saldo insuficiente. Respondendo com base nos seus dados:\n\n" +
            fallbackResponse(message, userData);
        }
        return fallbackResponse(message, userData);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content || fallbackResponse(message, userData);
    } catch (error) {
      logger.error("AI chat request failed", { error: String(error) });
      return fallbackResponse(message, userData);
    }
  },
};
