export type PlanId = "basico" | "premium";

export interface PlanConfig {
  label: string;
  price: number;
  features: string[];
  limits: {
    maxRecipes: number;
    maxProducts: number;
  };
  allowed: {
    importText: boolean;
    importUrl: boolean;
    searchPrices: boolean;
    calcProfit: boolean;
    purchases: boolean;
    assistant: boolean;
    exportPdf: boolean;
    deleteAllProducts: boolean;
  };
}

export const PLANS: Record<PlanId, PlanConfig> = {
  basico: {
    label: "Básico",
    price: 29.90,
    features: [
      "Receitas ilimitadas",
      "Produtos ilimitados",
      "Adicionar ingredientes",
      "Ajustar rendimento",
      "Custo automático",
      "Dashboard",
      "Baixar PDF",
    ],
    limits: { maxRecipes: 999, maxProducts: 999 },
    allowed: {
      importText: false,
      importUrl: false,
      searchPrices: false,
      calcProfit: false,
      purchases: false,
      assistant: false,
      deleteAllProducts: false,
      exportPdf: true,
    },
  },
  premium: {
    label: "Premium",
    price: 49.90,
    features: [
      "Tudo do Básico",
      "Importar receita por texto (IA)",
      "Importar receita por URL",
      "Buscar preços reais na web",
      "Calcular lucro (margem + preço)",
      "Preço de compra real",
      "Assistente IA",
      "Comparação preço de mercado",
    ],
    limits: { maxRecipes: 999, maxProducts: 999 },
    allowed: {
      importText: true,
      importUrl: true,
      searchPrices: true,
      calcProfit: true,
      purchases: true,
      assistant: true,
      deleteAllProducts: true,
      exportPdf: true,
    },
  },
};

export function checkPlan(plan: string, feature: keyof PlanConfig["allowed"]): boolean {
  const cfg = PLANS[plan as PlanId];
  if (!cfg) return false;
  return cfg.allowed[feature] ?? false;
}
