interface UserData {
  name: string;
  recipes: {
    title: string;
    productCost: number;
    ingredientCount: number;
    profit?: { profit: number; margin: number; price: number };
  }[];
}

const RECIPE_DB: Record<string, { ingredients: string[]; instructions: string }> = {
  "torta de frango": {
    ingredients: [
      "3 xícaras de farinha de trigo",
      "200g de manteiga",
      "1 ovo",
      "500g de peito de frango desfiado",
      "1 cebola picada",
      "2 dentes de alho",
      "1 lata de milho",
      "1 xícara de requeijão",
      "1 tomate picado",
      "sal e temperos a gosto",
    ],
    instructions: "Massa: misture farinha, manteiga, ovo e uma pitada de sal até formar uma massa homogênea. Abra metade da massa em uma forma de torta. Recheio: refogue a cebola e o alho, adicione o frango desfiado, tomate, milho e temperos. Misture o requeijão. Coloque o recheio sobre a massa, cubra com o restante da massa. Asse em forno preaquecido a 180°C por 35-40 minutos ou até dourar.",
  },
  "bolo de cenoura": {
    ingredients: [
      "3 cenouras médias picadas",
      "3 ovos",
      "1 xícara de óleo",
      "2 xícaras de açúcar",
      "2 xícaras de farinha de trigo",
      "1 colher de sopa de fermento",
    ],
    instructions: "Bata no liquidificador as cenouras, ovos e óleo. Em uma tigela, misture o açúcar, farinha e fermento. Adicione a mistura do liquidificador e mexa bem. Despeje em forma untada e enfarinhada. Asse em forno preaquecido a 180°C por 40 minutos.",
  },
  "bolo de chocolate": {
    ingredients: [
      "3 ovos",
      "1 xícara de açúcar",
      "1 xícara de chocolate em pó",
      "1 xícara de óleo",
      "2 xícaras de farinha de trigo",
      "1 xícara de água quente",
      "1 colher de sopa de fermento",
    ],
    instructions: "Bata os ovos, açúcar, chocolate e óleo. Adicione a farinha e a água quente alternadamente. Por último o fermento. Asse em forma untada a 180°C por 35 minutos.",
  },
  "strogonoff": {
    ingredients: [
      "500g de carne (filé mignon ou frango)",
      "1 cebola picada",
      "2 dentes de alho",
      "1 lata de creme de leite",
      "3 colheres de sopa de ketchup",
      "2 colheres de sopa de mostarda",
      "1 xícara de champignon",
      "sal e pimenta a gosto",
    ],
    instructions: "Corte a carne em tiras finas. Refogue a cebola e alho, adicione a carne e frite até dourar. Adicione ketchup, mostarda e champignon. Cozinhe por 5 minutos. Desligue o fogo e adicione o creme de leite. Sirva com arroz branco e batata palha.",
  },
  "pão de queijo": {
    ingredients: [
      "500g de polvilho azedo",
      "250ml de leite",
      "100ml de óleo",
      "2 ovos",
      "300g de queijo minas meia cura ralado",
      "sal a gosto",
    ],
    instructions: "Ferva o leite com o óleo. Escalde o polvilho com a mistura fervente. Deixe amornar, adicione os ovos e o queijo. Misture bem até formar uma massa homogênea. Faça bolinhas e asse em forno preaquecido a 180°C por 25 minutos ou até dourar.",
  },
  "pavê": {
    ingredients: [
      "1 lata de leite condensado",
      "2 latas de leite",
      "2 gemas",
      "1 colher de sopa de amido de milho",
      "200g de biscoito champanhe",
      "1 xícara de leite para umedecer",
      "3 claras em neve",
      "3 colheres de açúcar",
      "chocolate granulado",
    ],
    instructions: "Cozinhe o leite condensado, leite, gemas e amido até engrossar. Deixe esfriar. Prepare o merengue: bata as claras em neve com açúcar. Monte camadas de biscoito umedecido, creme e merengue. Finalize com chocolate granulado. Leve à geladeira por 4 horas.",
  },
  "lasanha": {
    ingredients: [
      "500g de massa para lasanha",
      "500g de carne moída",
      "1 cebola picada",
      "2 dentes de alho",
      "1 lata de molho de tomate",
      "500g de queijo mussarela fatiado",
      "500ml de leite",
      "3 colheres de farinha de trigo",
      "3 colheres de manteiga",
      "sal e orégano a gosto",
    ],
    instructions: "Refogue a cebola e alho, adicione a carne moída e cozinhe até dourar. Adicione o molho de tomate. Prepare o molho branco: derreta a manteiga, adicione a farinha, mexa bem, adicione o leite aos poucos até engrossar. Monte camadas: molho, massa, carne, molho branco, mussarela. Repita. Finalize com queijo e orégano. Asse a 180°C por 30 minutos.",
  },
  "feijoada": {
    ingredients: [
      "500g de feijão preto",
      "300g de carne seca",
      "200g de costelinha de porco",
      "200g de linguiça calabresa",
      "200g de bacon",
      "1 cebola picada",
      "4 dentes de alho",
      "2 folhas de louro",
      "sal e pimenta a gosto",
    ],
    instructions: "Deixe o feijão de molho de véspera. Cozinhe o feijão com as carnes (dessalgadas) e louro até macio. Refogue cebola e alho e adicione ao feijão. Acerte o sal. Sirva com arroz, couve refogada, farofa e laranja.",
  },
};

function findRecipe(text: string): { title: string; ingredients: string[]; instructions: string } | null {
  const lower = text.toLowerCase().trim();
  for (const [name, recipe] of Object.entries(RECIPE_DB)) {
    if (lower.includes(name) || name.includes(lower)) {
      return { title: name, ...recipe };
    }
  }
  return null;
}

function formatRecipeResponse(title: string, ingredients: string[], instructions: string): string {
  const ings = ingredients.map((i) => `- ${i}`).join("\n");
  return `**${title}**\n\n**Ingredientes:**\n${ings}\n\n**Modo de Preparo:**\n${instructions}\n\n---\n📥 Clique em "Importar Receita" abaixo para adicionar ao sistema!`;
}

function isRecipeRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const stopWords = ["lucro", "custo", "preço", "preço", "oi", "olá", "obrigado", "valeu", "mercad", "internet", "pesquisar", "buscar", "quanto", "qual", "como", "onde", "quando"];
  if (stopWords.some((w) => lower.includes(w))) return false;
  if (lower.length < 3 || lower.length > 60) return false;
  return true;
}

export function fallbackResponse(message: string, data: UserData): string {
  const msg = message.toLowerCase();

  const recipeCount = data.recipes.length;
  const totalCost = data.recipes.reduce((s, r) => s + r.productCost, 0);
  const totalProfit = data.recipes.reduce((s, r) => s + (r.profit?.profit || 0), 0);
  const avgMargin = data.recipes.length > 0
    ? data.recipes.reduce((s, r) => s + (r.profit?.margin || 0), 0) / data.recipes.length
    : 0;

  if (msg.includes("lucro") || msg.includes("margem") || msg.includes("rentável") || msg.includes("faturamento")) {
    if (recipeCount === 0) return "Você ainda não tem receitas cadastradas. Crie uma receita com ingredientes para começar a calcular lucros.";
    if (data.recipes.every((r) => !r.profit)) return `Você tem ${recipeCount} receita(s), mas ainda não calculou o lucro de nenhuma. Vá em uma receita e clique em "Calcular Lucro" para começar.`;

    const best = data.recipes.filter((r) => r.profit).sort((a, b) => (b.profit?.margin || 0) - (a.profit?.margin || 0))[0];
    return `📊 **Análise de Lucro**\n\nTotal de receitas: ${recipeCount}\nLucro total estimado: R$ ${totalProfit.toFixed(2).replace(".", ",")}\nMargem média: ${avgMargin.toFixed(1).replace(".", ",")}%\n\n💰 **Mais lucrativa:** ${best?.title} — margem de ${best?.profit?.margin.toFixed(1).replace(".", ",")}% (R$ ${best?.profit?.profit.toFixed(2).replace(".", ",")} de lucro)`;
  }

  if (msg.includes("custo") || msg.includes("gasto") || msg.includes("caro") || msg.includes("barato")) {
    if (recipeCount === 0) return "Nenhuma receita cadastrada. Cadastre uma para ver os custos.";
    const cheapest = [...data.recipes].sort((a, b) => a.productCost - b.productCost)[0];
    const mostExpensive = [...data.recipes].sort((a, b) => b.productCost - a.productCost)[0];
    return `💰 **Análise de Custos**\n\nCusto médio por receita: R$ ${(totalCost / recipeCount).toFixed(2).replace(".", ",")}\n\n✅ Mais barata: ${cheapest.title} — R$ ${cheapest.productCost.toFixed(2).replace(".", ",")}\n⚠️  Mais cara: ${mostExpensive.title} — R$ ${mostExpensive.productCost.toFixed(2).replace(".", ",")}\n\n💡 Dica: Pesquise os ingredientes mais caros com o botão 🔍 em Produtos para encontrar melhores preços.`;
  }

  if (msg.includes("preço") || msg.includes("precif") || msg.includes("vender") || msg.includes("quanto cobrar")) {
    if (recipeCount === 0) return "Cadastre uma receita primeiro. Depois posso ajudar a definir o preço!";
    return `💵 **Dicas de Precificação**\n\n1. **Custo + margem:** Preço = custo ÷ (1 - margem desejada). Ex: custo R$ 10, margem 30% → preço R$ 14,29\n2. **Pesquise o mercado:** Use 🔍 em Produtos para ver preços praticados\n3. **Considere:** mão de obra, embalagem, energia, impostos (custos indiretos)\n4. **Margem saudável:** 40-60% para alimentos\n\nUse o botão "Calcular Lucro" na receita para simular cenários.`;
  }

  if (msg.includes("ingrediente") || msg.includes("produto") || msg.includes("receita")) {
    if (recipeCount === 0) return "Você ainda não tem receitas cadastradas. Vá em Receitas → Nova Receita para começar.";
    const list = data.recipes.map((r) => `• ${r.title}: ${r.ingredientCount} ingredientes, custo R$ ${r.productCost.toFixed(2).replace(".", ",")}`).join("\n");
    return `📖 **Suas Receitas (${recipeCount})**\n\n${list}\n\n💡 Clique em uma receita para ver detalhes ou criar nova.`;
  }

  if (msg.includes("oi") || msg.includes("olá") || msg.includes("bom dia") || msg.includes("boa tarde") || msg.includes("boa noite")) {
    return `Olá, ${data.name || "usuário"}! 😊 Como posso ajudar? Posso falar sobre:\n\n📖 Suas receitas\n💰 Custos e lucros\n💵 Precificação\n🛒 Produtos e ingredientes\n🔍 Preços de mercado\n\nOu se quiser, é só digitar o nome de uma receita (ex: "torta de frango") que eu te mostro os ingredientes!`;
  }

  if (msg.includes("obrigado") || msg.includes("valeu") || msg.includes("brigado")) {
    return "Por nada! 😊 Estou aqui para ajudar. Se quiser uma receita, é só digitar o nome!";
  }

  if (msg.includes("mercad") || msg.includes("internet") || msg.includes("pesquisar") || msg.includes("buscar")) {
    return "🔍 Para pesquisar preços de mercado:\n\n1. Vá em **Produtos** no menu\n2. Clique em **🔍 Buscar Preços**\n3. O sistema busca preços online para todos os produtos\n\nNa página da **Receita**, também dá para pesquisar ingrediente por ingrediente!";
  }

  const recipe = findRecipe(msg);
  if (recipe) {
    return formatRecipeResponse(recipe.title, recipe.ingredients, recipe.instructions);
  }

  if (isRecipeRequest(msg)) {
    const title = msg.charAt(0).toUpperCase() + msg.slice(1);
    return `Infelizmente não tenho a receita de "${title}" no meu banco de dados ainda. 😕\n\nMas você pode:\n\n📝 **Criar manualmente:** Vá em Receitas → Nova Receita\n🤖 **Pedir ajuda à IA:** Se tiver uma chave de API configurada, posso gerar receitas!\n\nPor enquanto, que tal experimentar uma das receitas que já tenho?\n\nDigite: "torta de frango", "bolo de cenoura", "strogonoff", "lasanha", "feijoada" ou "pão de queijo"`;
  }

  return `Olá! Posso ajudar com:\n\n📖 **Receitas** — Digite o nome de uma receita (ex: "torta de frango")\n💰 **Custos** — "Quanto estou gastando?"\n💵 **Lucro** — "Estou lucrando?"\n💲 **Precificação** — "Quanto cobrar?"\n🔍 **Mercado** — "Preços da internet"\n\nO que você quer saber?`;
}
