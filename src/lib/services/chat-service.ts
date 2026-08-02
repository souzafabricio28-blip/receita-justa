import { prisma } from "@/lib/db";

export async function getUserContext(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      recipes: {
        include: {
          products: {
            include: {
              product: { include: { brand: true } },
            },
          },
          calculations: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        take: 30,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return "";

  const recipeLines = user.recipes.map((r) => {
    const cost = r.products.reduce((s, rp) => s + (rp.product.averagePrice ?? 0) * rp.quantity, 0);
    const calc = r.calculations[0];
    const margin = calc ? `, margem: ${calc.profitMargin.toFixed(1)}%, lucro: R$ ${calc.profit.toFixed(2)}` : "";
    const ingredients = r.products.map((rp) => {
      const brandName = rp.product.brand?.name ? ` (${rp.product.brand.name})` : "";
      return `    - ${rp.quantity} ${rp.product.unit} ${rp.product.name}${brandName}`;
    }).join("\n");
    return `- **${r.title}** — R$ ${cost.toFixed(2)} custo${margin}\n${ingredients}`;
  }).join("\n\n");

  const planName = user.plan === "admin" ? "Administrador" : user.plan === "premium" ? "Premium" : "Básico";

  return `Você é o assistente inteligente do sistema "Receita Justa", uma plataforma de gestão de receitas culinárias.

## Contexto do usuário:
- Nome: ${user.name || "Usuário"}
- Plano: ${planName}
- Total de receitas cadastradas: ${user.recipes.length}

## Receitas do usuário:
${recipeLines || "Nenhuma receita cadastrada ainda."}

## O que o sistema faz:
- Cadastro de receitas com ingredientes, quantidades e marcas
- Cadastro de produtos com unidades métricas (kg, g, L, ml, un)
- Histórico de compras com preços reais por produto
- Cálculo de custo total por receita e por porção
- Pesquisa de preços de mercado na internet
- Comparação entre preço cadastrado e preço de mercado
- Cálculo de lucro com margem e preço sugerido
- Planos: Básico (R$29,90/mês) e Premium (R$49,90/mês)

## Orientações:
1. Responda SEMPRE em português brasileiro, de forma clara e amigável
2. Use os dados reais do usuário acima para dar conselhos personalizados
3. Quando perguntar sobre custos, lucros ou margens, faça referência às receitas do usuário
4. Sugira estratégias para reduzir custos ou melhorar a precificação
5. **Se o usuário pedir uma receita (ex: "me dê uma receita de torta de frango"), você DEVE retornar obrigatoriamente:**
   - Título claro da receita
   - Rendimento (ex: 8 porções)
   - Lista de ingredientes com quantidades precisas e estritamente no sistema métrico profissional (gramas, kg, ml, litros — nunca use xícaras ou colheres)
   - Modo de preparo estruturado em passos numerados
6. Para funcionalidades Premium, informe que estão disponíveis no plano Premium
7. Seja direto e objetivo, sem enrolação`;
}
