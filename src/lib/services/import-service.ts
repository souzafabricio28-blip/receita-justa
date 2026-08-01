import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { convertIngredient } from "@/lib/conversions";
import { ValidationError } from "@/lib/errors";
import { lookup } from "node:dns/promises";

const API_KEY = process.env.OPENAI_API_KEY || "";
let API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
if (API_URL && !API_URL.endsWith("/chat/completions")) {
  API_URL = API_URL.replace(/\/+$/, "") + "/chat/completions";
}
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

interface RawIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface ParsedRecipe {
  title: string;
  description: string;
  instructions: string;
  yield: number;
  ingredients: RawIngredient[];
}

interface EnrichedIngredient extends RawIngredient {
  cleanName: string;
  convertedQuantity: number;
  convertedUnit: string;
  productId: string | null;
  productName: string | null;
  productPrice: number;
  productUnit: string;
  estimatedCost: number;
  skipCalculation: boolean;
}

export interface ImportResult {
  title: string;
  description: string;
  instructions: string;
  yield: number;
  ingredients: EnrichedIngredient[];
  hasProducts: boolean;
}

function enrichIngredients(
  ingredients: RawIngredient[],
  products: { id: string; name: string; unit: string; averagePrice: number }[]
): EnrichedIngredient[] {
  return ingredients.map((ing) => {
    const result = convertIngredient(ing.name, ing.quantity, ing.unit, products);
    return {
      name: result.name,
      quantity: result.quantity,
      unit: result.originalUnit,
      cleanName: result.cleanName,
      convertedQuantity: result.convertedQuantity,
      convertedUnit: result.convertedUnit,
      productId: result.productId,
      productName: result.productName,
      productPrice: result.productPrice,
      productUnit: result.productUnit,
      estimatedCost: result.estimatedCost,
      skipCalculation: result.skipCalculation,
    };
  });
}

export const importService = {
  async getProducts() {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, unit: true, averagePrice: true },
      orderBy: { name: "asc" },
    });
    return products.map((p) => ({ ...p, averagePrice: p.averagePrice ?? 0 }));
  },

  async parseText(text: string, forceFallback = false): Promise<ImportResult> {
    if (!text?.trim()) throw new ValidationError("Texto obrigatório");

    const products = await this.getProducts();
    const productList = products
      .map((p) => `- ${p.name} (${p.unit}, R$ ${(p.averagePrice ?? 0).toFixed(2).replace(".", ",")})`)
      .join("\n");

    let parsed: ParsedRecipe;

    if (forceFallback || !API_KEY) {
      parsed = fallbackParse(text);
    } else {
      parsed = await aiParse(text, productList);
    }

    const enriched = enrichIngredients(parsed.ingredients, products);

    return {
      ...parsed,
      ingredients: enriched,
      hasProducts: products.length > 0,
    };
  },

  async parseFromUrl(url: string): Promise<ImportResult> {
    if (!url?.trim()) throw new ValidationError("URL obrigatória");

    await assertPublicUrl(url);

    const blocked = ["tudogostoso.com.br", "www.tudogostoso.com.br"];
    const urlLower = url.toLowerCase();
    if (blocked.some((b) => urlLower.includes(b))) {
      throw new ValidationError("O site TudoGostoso não é suportado devido a bloqueios de acesso. Tente outra fonte (ex: Receiteria, Panelinha, Comida e Receitas).");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new ValidationError("Não foi possível acessar a URL");

    const html = await response.text();
    const { load } = await import("cheerio");
    const $ = load(html);

    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim() ||
      "";

    const description = $('meta[name="description"]').attr("content")?.trim() || "";

    const instructionSelectors = [
      ".recipe-instructions",
      ".modo-de-preparo",
      ".instructions",
      ".preparation",
      ".recipe-steps",
      '[itemprop="recipeInstructions"]',
      ".entry-content",
    ];

    let instructions = "";
    for (const sel of instructionSelectors) {
      const el = $(sel);
      if (el.length) {
        instructions = el.text().trim();
        break;
      }
    }

    if (!instructions) {
      instructions = $("article").text().trim().substring(0, 3000);
    }

    const combinedText = [title, description, instructions].filter(Boolean).join("\n\n");
    return this.parseText(combinedText, true);
  },

};

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIp(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(lower)) return true;
  const v4Mapped = lower.split("::ffff:")[1];
  if (v4Mapped) return isPrivateIpv4(v4Mapped);
  return false;
}

async function assertPublicUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError("URL inválida");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError("Apenas URLs http/https são permitidas");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "0.0.0.0") {
    throw new ValidationError("URL não permitida");
  }

  const addresses = await lookup(parsed.hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIp(address))) {
    throw new ValidationError("URL não permitida");
  }
}

async function aiParse(text: string, productList: string): Promise<ParsedRecipe> {
  const systemPrompt = `Você é um assistente especializado em extrair receitas de textos não estruturados.

Retorne APENAS UM JSON VÁLIDO (sem markdown, sem texto extra) no formato:
{
  "title": "Nome da Receita",
  "description": "Breve descrição",
  "instructions": "Modo de preparo completo em texto corrido com parágrafos",
  "yield": 4,
  "ingredients": [
    { "name": "Farinha de Trigo", "quantity": 1, "unit": "kg" },
    { "name": "Açúcar", "quantity": 500, "unit": "g" }
  ]
}

REGRAS:
- title: obrigatório, nome claro da receita
- description: opcional, breve resumo
- instructions: modo de preparo completo, texto corrido
- yield: número de porções (padrão 1 se não especificado)
- ingredients: array de objetos. Se a unidade não for explícita, INFIRA baseado no ingrediente:
  * Líquidos (leite, água, óleo, azeite, creme): use ml ou L
  * Sólidos: use g ou kg
  * Unidades contáveis: un, dente, ramo, folha
- NÃO use xícara, colher, copo como unidade - converta para gramas (sólidos) ou ml (líquidos) sempre
- NÃO inclua ingredientes "a gosto" como sal, pimenta, orégano, tempero, água, óleo para fritar (quantidade=0, unit="q.b.")
- ingredients.name: use o nome mais limpo e próximo do produto real
- EXEMPLO: "100 leite" → {"name": "Leite", "quantity": 100, "unit": "ml"}
- EXEMPLO: "2 xícaras de farinha" → {"name": "Farinha de Trigo", "quantity": 240, "unit": "g"}
- EXEMPLO: "1 colher de sopa de açúcar" → {"name": "Açúcar", "quantity": 12, "unit": "g"}

Produtos disponíveis no sistema do usuário para referência:
${productList}

Use esses nomes quando possível para facilitar o matching.`;

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Extraia a receita deste texto:\n\n${text}` },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "HTTP-Referer": process.env.NEXTAUTH_URL || "https://receita-justa.vercel.app",
    },
    body,
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    logger.warn("AI parse failed, falling back to local parser", { status: res.status });
    return fallbackParse(text);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    logger.warn("AI returned invalid JSON, using fallback");
    return fallbackParse(text);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || "",
      description: parsed.description || "",
      instructions: parsed.instructions || "",
      yield: parsed.yield || 1,
      ingredients: (parsed.ingredients || [])
        .filter((i: any) => i.name && typeof i.name === "string")
        .map((i: any) => ({
          name: i.name.trim(),
          quantity: typeof i.quantity === "number" ? i.quantity : 0,
          unit: i.unit || "un",
        })),
    };
  } catch {
    logger.warn("Failed to parse AI JSON, using fallback");
    return fallbackParse(text);
  }
}

// ─── Local Fallback Parser ──────────────────────────────────────────────────

function cleanText(s: string): string {
  return s
    .replace(/^de\s+|^da\s+|^do\s+|^das\s+|^dos\s+/i, "")
    .replace(/\*\*/g, "")
    .replace(/__(.*?)__/g, "$1")
    .replace(/[*`#]/g, "")
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .trim();
}

function parseQuantity(s: string): number {
  s = s.trim().replace(",", ".");
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const range = s.match(/^(\d+)\s*-\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  return Number(s) || 0;
}

const UNIT_MAP: Record<string, string> = {
  kg: "kg", quilo: "kg", quilos: "kg", kilo: "kg", kilos: "kg",
  g: "g", grama: "g", gramas: "g",
  l: "L", litro: "L", litros: "L",
  ml: "ml", mililitro: "ml", mililitros: "ml",
  un: "un", unidade: "un", unidades: "un", und: "un",
  cx: "cx", caixa: "cx", caixas: "cx", lata: "cx", latas: "cx",
  pct: "pct", pacote: "pct", pacotes: "pct", envelope: "pct", envelopes: "pct",
  dente: "un", dentes: "un",
  ramo: "un", ramos: "un",
  folha: "un", folhas: "un",
  pitada: "g", pitadas: "g",
  fatia: "un", fatias: "un",
};

const KNOWN_UNITS = Object.keys(UNIT_MAP);

const LIQUID_KEYWORDS = [
  "leite", "creme", "óleo", "oleo", "azeite", "água", "agua", "vinho",
  "vinagre", "shoyu", "molho", "caldo", "essência", "essencia",
  "extrato", "iogurte", "iorgute", "chantilly", "leite condensado",
  "leite em pó", "creme de leite",
];

function inferUnit(name: string, quantity: number): string {
  const lower = name.toLowerCase();
  if (LIQUID_KEYWORDS.some((k) => lower.includes(k))) {
    return quantity >= 3 ? "L" : "ml";
  }
  return quantity >= 3 ? "g" : "un";
}

const BULLET_RE = /^[-•*∙●◦‣⁃⁌⁍]\s*/;

function isBulletLine(line: string): boolean {
  return /^[-•*∙●◦‣⁃⁌⁍]\s/.test(line) || /^\d/.test(line) || /^\d+\//.test(line);
}

function parseIngredientLine(line: string): RawIngredient | null {
  const clean = line.replace(BULLET_RE, "").trim();
  if (!clean) return null;

  const unitPattern = KNOWN_UNITS.join("|");
  const regex = new RegExp(
    `^(?:([\\d.,/\\s]+?))\\s*(?:(${unitPattern})\\s+)?(.+)$`,
    "i"
  );

  const match = clean.match(regex);
  if (match) {
    let qty = parseQuantity(match[1]);
    let unit = match[2] ? UNIT_MAP[match[2].toLowerCase()] || match[2] : inferUnit(match[3] || clean, qty);
    let name = match[3]?.trim() || clean;
    name = cleanText(name);
    if (!name) return null;
    return { name, quantity: qty || 1, unit };
  }

  const simpleUnit = clean.match(new RegExp(`^(\\d+)\\s+(${unitPattern})\\s+(.+)$`, "i"));
  if (simpleUnit) {
    return {
      name: cleanText(simpleUnit[3]),
      quantity: Number(simpleUnit[1]) || 1,
      unit: UNIT_MAP[simpleUnit[2].toLowerCase()] || simpleUnit[2],
    };
  }

  const name = cleanText(clean);
  if (!name) return null;
  return { name, quantity: 1, unit: "un" };
}

function fallbackParse(text: string): ParsedRecipe {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const ingMarkers = ["ingrediente", "ingredientes:", "ingredientes\n", "ingredientes\r"];
  const prepMarkers = [
    "modo de preparo", "preparo:", "instruções", "instrucoes",
    "modo de fazer:", "como fazer", "preparação", "modo de preparo:",
  ];

  let ingStart = -1;
  let prepStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (prepStart === -1 && prepMarkers.some((m) => lower.includes(m))) {
      prepStart = i;
    }
    if (ingStart === -1 && ingMarkers.some((m) => lower.includes(m))) {
      ingStart = i;
    }
  }

  const ingredientLines: string[] = [];
  if (ingStart !== -1) {
    const end = prepStart !== -1 && prepStart > ingStart ? prepStart : lines.length;
    for (let i = ingStart + 1; i < end; i++) {
      const l = lines[i];
      if (prepMarkers.some((m) => l.toLowerCase().includes(m))) break;
      if (isBulletLine(l)) {
        ingredientLines.push(l);
      }
    }
  }

  if (ingredientLines.length === 0) {
    for (const l of lines) {
      if (ingMarkers.some((m) => l.toLowerCase().includes(m))) continue;
      if (prepMarkers.some((m) => l.toLowerCase().includes(m))) break;
      if (/^[-•*∙●◦‣⁃⁌⁍]\s/.test(l)) {
        ingredientLines.push(l);
      }
    }
  }

  const ingredients = ingredientLines
    .map(parseIngredientLine)
    .filter((x): x is RawIngredient => x !== null);

  const titleLine = lines.find((l) => {
    const lower = l.toLowerCase();
    return !ingMarkers.some((m) => lower.includes(m))
      && !prepMarkers.some((m) => lower.includes(m))
      && !/^[-•*]\s/.test(l)
      && !/^\d/.test(l)
      && l.length > 3;
  });

  const title = titleLine ? cleanText(titleLine) : lines[0] || "";

  let instructions = "";
  if (prepStart !== -1) {
    instructions = lines.slice(prepStart + 1)
      .filter((l) => !ingMarkers.some((m) => l.toLowerCase().includes(m)))
      .join("\n")
      .trim();
  }

  if (!instructions && ingStart !== -1) {
    const beforeIng = lines.slice(0, ingStart).filter(
      (l) => l !== titleLine && !ingMarkers.some((m) => l.toLowerCase().includes(m))
    );
    const afterPrep = prepStart !== -1
      ? lines.slice(prepStart + 1)
      : [];
    instructions = [...beforeIng, ...afterPrep].join("\n").trim();
  }

  return { title, description: "", instructions, yield: 1, ingredients };
}
