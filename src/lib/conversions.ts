// Volume → gramas para ingredientes comuns (1 xícara = 240ml)
const VOLUME_TO_GRAMS: Record<string, number> = {
  "farinha de trigo": 120,
  "farinha": 120,
  "farinha de rosca": 100,
  "açúcar": 200,
  "açúcar refinado": 200,
  "açúcar cristal": 200,
  "açúcar mascavo": 180,
  "chocolate em pó": 100,
  "cacau em pó": 100,
  "achocolatado": 100,
  "leite em pó": 120,
  "manteiga": 200,
  "margarina": 200,
  "óleo": 240,
  "azeite": 240,
  "leite": 240,
  "creme de leite": 240,
  "iogurte": 240,
  "água": 240,
  "fermento em pó": 150,
  "fermento": 150,
  "amido de milho": 120,
  "maisena": 120,
  "fubá": 140,
  "fuba": 140,
  "milharina": 140,
  "aveia": 100,
  "cereal": 100,
  "granola": 120,
  "castanha": 140,
  "noz": 120,
  "amêndoa": 120,
  "amendoim": 140,
  "coco ralado": 100,
  "queijo ralado": 100,
  "parmesão ralado": 100,
  "presunto picado": 140,
  "arroz": 200,
  "feijão": 200,
  "lentilha": 200,
  "grão de bico": 200,
  "ervilha seca": 200,
};

// Peso médio em gramas por unidade de alimentos
const UNIT_WEIGHT: Record<string, number> = {
  "ovo": 50,
  "ovos": 50,
  "tomate": 150,
  "tomates": 150,
  "cebola": 150,
  "cebolas": 150,
  "cenoura": 100,
  "cenouras": 100,
  "batata": 200,
  "batatas": 200,
  "batata inglesa": 200,
  "batata doce": 200,
  "mandioca": 300,
  "pimentão": 150,
  "pimentões": 150,
  "pimentao": 150,
  "berinjela": 200,
  "abobrinha": 200,
  "chuchu": 150,
  "pepino": 150,
  "limão": 100,
  "limoes": 100,
  "limão tahiti": 80,
  "laranja": 200,
  "laranjas": 200,
  "banana": 100,
  "bananas": 100,
  "maçã": 150,
  "macas": 150,
  "maca": 150,
  "pera": 150,
  "manga": 300,
  "abacate": 400,
  "goiaba": 150,
  "mamão": 500,
  "mamao": 500,
  "alface": 150,
  "couve": 200,
  "espinafre": 100,
  "brócolis": 200,
  "brocolis": 200,
  "couve-flor": 400,
  "repolho": 500,
  "dente de alho": 5,
  "dentes de alho": 5,
  "alho dente": 5,
  "alho": 3,
  "ramo de salsinha": 10,
  "ramo de cebolinha": 10,
  "folha de louro": 1,
  "folhas de louro": 1,
};

// Palavras para remover do nome do ingrediente ao buscar produto
const STOP_WORDS = [
  "de", "da", "do", "das", "dos", "em", "com", "sem", "para", "a", "o", "as", "os", "e",
  "picado", "picada", "picados", "picadas",
  "ralado", "ralada", "ralados", "raladas",
  "fatiado", "fatiada", "fatiados", "fatiadas",
  "moido", "moida", "moída", "moído",
  "refogado", "refogada",
  "cozido", "cozida",
  "assado", "assada",
  "grelhado", "grelhada",
  "desfiado", "desfiada",
  "cortado", "cortada",
  "fresco", "fresca",
  "seco", "seca",
  "tempero", "temperos",
  "sal", "pimenta", "pimenta do reino", "orégano", "oregano",
  "a gosto", "à gosto",
];

export interface ParsedIngredient {
  name: string;
  cleanName: string;
  quantity: number;
  originalUnit: string;
  convertedUnit: string;
  convertedQuantity: number;
  productId: string | null;
  productName: string | null;
  productPrice: number;
  productUnit: string;
  estimatedCost: number;
  skipCalculation: boolean;
}

export function normalizeIngredientName(name: string): string {
  let clean = name.toLowerCase().trim();
  for (const word of STOP_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    clean = clean.replace(regex, "");
  }
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

export function matchProduct(
  name: string,
  products: { id: string; name: string; unit: string; averagePrice: number }[]
): { id: string; name: string; unit: string; averagePrice: number } | null {
  const clean = normalizeIngredientName(name);
  const lower = clean;

  // Tenta match exato
  let match = products.find((p) => p.name.toLowerCase() === lower);
  if (match) return match;

  // Tenta match parcial (nome do produto contém o termo ou vice-versa)
  match = products.find(
    (p) =>
      lower.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(lower)
  );
  if (match) return match;

  // Tenta com palavras-chave (primeira palavra significativa)
  const words = lower.split(" ").filter((w) => w.length > 2);
  for (const word of words) {
    match = products.find((p) =>
      p.name.toLowerCase().includes(word)
    );
    if (match) return match;
  }

  return null;
}

export function shouldSkipCalculation(name: string): boolean {
  const lower = name.toLowerCase();
  const skipWords = [
    "sal", "pimenta", "orégano", "oregano", "tempero", "temperos",
    "a gosto", "à gosto", "q.b.", "q.b", "quanto baste",
    "água", "agua", "gelo", "óleo para fritar", "oleo para fritar",
    "gordura", "manteiga para untar",
  ];
  return skipWords.some((w) => lower.includes(w));
}

export function convertIngredient(
  name: string,
  quantity: number,
  unit: string,
  products: { id: string; name: string; unit: string; averagePrice: number }[]
): ParsedIngredient {
  const skip = shouldSkipCalculation(name);
  if (skip) {
    return {
      name,
      cleanName: normalizeIngredientName(name),
      quantity,
      originalUnit: unit,
      convertedUnit: unit,
      convertedQuantity: quantity,
      productId: null,
      productName: null,
      productPrice: 0,
      productUnit: unit,
      estimatedCost: 0,
      skipCalculation: true,
    };
  }

  const cleanName = normalizeIngredientName(name);
  let convQty = quantity;
  let convUnit = unit;
  const product = matchProduct(name, products);

  // Conversão de volume → peso
  if (["xícara", "xicara", "xícaras", "xicaras"].includes(unit)) {
    const gPerCup = VOLUME_TO_GRAMS[cleanName] || VOLUME_TO_GRAMS[Object.keys(VOLUME_TO_GRAMS).find((k) => cleanName.includes(k)) || ""] || 120;
    convQty = quantity * gPerCup;
    convUnit = "g";
  }
  if (["colher", "colheres"].includes(unit)) {
    const base = VOLUME_TO_GRAMS[cleanName] || VOLUME_TO_GRAMS[Object.keys(VOLUME_TO_GRAMS).find((k) => cleanName.includes(k)) || ""];
    colher: if (base) {
      // 1 colher de sopa ≈ 1/16 da xícara ≈ 15ml
      const gPerTbsp = base / 16;
      convQty = quantity * gPerTbsp;
      convUnit = "g";
    } else {
      // Sem referência, assume 15g por colher de sopa
      convQty = quantity * 15;
      convUnit = "g";
    }
  }
  if (["copo", "copos"].includes(unit)) {
    // 1 copo ≈ 240ml, trata como xícara
    const gPerCup = VOLUME_TO_GRAMS[cleanName] || VOLUME_TO_GRAMS[Object.keys(VOLUME_TO_GRAMS).find((k) => cleanName.includes(k)) || ""] || 120;
    convQty = quantity * gPerCup;
    convUnit = "g";
  }

  // Conversão de unidades (ex: 1 tomate → gramas)
  if (unit === "un" && quantity > 0) {
    const avgWeight = UNIT_WEIGHT[cleanName] || UNIT_WEIGHT[Object.keys(UNIT_WEIGHT).find((k) => cleanName.includes(k)) || ""];
    if (avgWeight && product && product.unit === "kg") {
      convQty = quantity * avgWeight;
      convUnit = "g";
    }
  }

  // Converte gramas para kg se necessário para cálculo
  let calcQty = convQty;
  let calcUnit = convUnit;
  if (convUnit === "g" && convQty > 0) {
    calcQty = convQty / 1000;
    calcUnit = "kg";
  }
  if (convUnit === "ml" && convQty > 0) {
    calcQty = convQty / 1000;
    calcUnit = "L";
  }

  let estimatedCost = 0;
  if (product && product.averagePrice > 0) {
    if (calcUnit === "kg" && product.unit === "kg") {
      estimatedCost = calcQty * product.averagePrice;
    } else if (calcUnit === "L" && product.unit === "L") {
      estimatedCost = calcQty * product.averagePrice;
    } else if (product.unit === "un" || product.unit === "cx" || product.unit === "pct") {
      estimatedCost = quantity * product.averagePrice;
    } else if (product.unit === "kg" && unit === "un") {
      // Se não tem peso médio, usa o preço do kg direto (subestima)
      estimatedCost = (convQty / 1000) * product.averagePrice;
    } else if (product.unit === "kg" && calcUnit === "g") {
      const kg = convQty / 1000;
      estimatedCost = kg * product.averagePrice;
    } else {
      // Fallback: usa a quantidade original
      estimatedCost = quantity * product.averagePrice;
    }
  }

  return {
    name,
    cleanName,
    quantity,
    originalUnit: unit,
    convertedUnit: convUnit,
    convertedQuantity: convQty,
    productId: product?.id || null,
    productName: product?.name || null,
    productPrice: product?.averagePrice || 0,
    productUnit: product?.unit || unit,
    estimatedCost,
    skipCalculation: false,
  };
}
