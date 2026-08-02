import type { CheerioAPI } from "cheerio";
import { packageSizePenalty } from "@/lib/package-price";
import { refineSearchQuery } from "@/lib/services/ai-refine";

export interface PriceResult {
  title: string;
  price: number;
  store: string;
  url: string;
  score?: number;
}

interface SearchAdapter<T = unknown> {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string): Promise<PriceResult[]>;
}

const FALLBACK: Record<string, PriceResult[]> = {
  farinha: [
    { title: "Farinha de Trigo Dona Benta 1kg", price: 5.49, store: "Assaí", url: "" },
    { title: "Farinha de Trigo Renata 1kg", price: 5.99, store: "Carrefour", url: "" },
    { title: "Farinha de Trigo Tradicional 1kg", price: 4.99, store: "Extra", url: "" },
    { title: "Farinha de Arroz 500g", price: 6.99, store: "Assaí", url: "" },
    { title: "Farinha de Mandioca 1kg", price: 7.49, store: "Carrefour", url: "" },
  ],
  acucar: [
    { title: "Açúcar Refinado União 1kg", price: 4.99, store: "Carrefour", url: "" },
    { title: "Açúcar Cristal 1kg", price: 3.99, store: "Assaí", url: "" },
    { title: "Açúcar Mascavo 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Açúcar de Confeiteiro 1kg", price: 9.49, store: "Extra", url: "" },
  ],
  arroz: [
    { title: "Arroz Tipo 1 Camil 5kg", price: 28.90, store: "Assaí", url: "" },
    { title: "Arroz Tipo 1 Tio João 5kg", price: 32.90, store: "Extra", url: "" },
    { title: "Arroz Integral 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Arroz Arbóreo 500g", price: 12.90, store: "Carrefour", url: "" },
  ],
  feijao: [
    { title: "Feijão Carioca Kicaldo 1kg", price: 8.49, store: "Carrefour", url: "" },
    { title: "Feijão Carioca Camil 1kg", price: 7.99, store: "Assaí", url: "" },
    { title: "Feijão Preto 1kg", price: 8.99, store: "Assaí", url: "" },
    { title: "Feijão Branco 500g", price: 9.99, store: "Carrefour", url: "" },
  ],
  leite: [
    { title: "Leite Integral Itambé 1L", price: 5.99, store: "Carrefour", url: "" },
    { title: "Leite Integral Piracanjuba 1L", price: 5.79, store: "Assaí", url: "" },
    { title: "Leite Desnatado 1L", price: 5.49, store: "Extra", url: "" },
    { title: "Leite Zero Lactose 1L", price: 7.99, store: "Carrefour", url: "" },
    { title: "Leite Condensado Moça 395g", price: 6.99, store: "Assaí", url: "" },
    { title: "Creme de Leite Nestlé 200g", price: 4.99, store: "Carrefour", url: "" },
    { title: "Leite em Pó Ninho 400g", price: 12.99, store: "Assaí", url: "" },
  ],
  oleo: [
    { title: "Óleo de Soja Liza 900ml", price: 8.49, store: "Assaí", url: "" },
    { title: "Óleo de Soja Soya 900ml", price: 8.29, store: "Carrefour", url: "" },
    { title: "Azeite de Oliva Extra Virgem 500ml", price: 24.90, store: "Carrefour", url: "" },
    { title: "Óleo de Coco 200ml", price: 14.90, store: "Assaí", url: "" },
  ],
  manteiga: [
    { title: "Manteiga Qualy 200g", price: 9.99, store: "Carrefour", url: "" },
    { title: "Manteiga Aviação 200g", price: 16.90, store: "Extra", url: "" },
    { title: "Margarina Doriana 500g", price: 7.99, store: "Assaí", url: "" },
  ],
  ovo: [
    { title: "Ovos Brancos 30un", price: 16.99, store: "Assaí", url: "" },
    { title: "Ovos Vermelhos Granja 12un", price: 10.99, store: "Carrefour", url: "" },
    { title: "Ovos Caipira 12un", price: 14.99, store: "Extra", url: "" },
  ],
  sal: [
    { title: "Sal Refinado Cisne 1kg", price: 2.99, store: "Assaí", url: "" },
    { title: "Sal Refinado 1kg", price: 2.79, store: "Carrefour", url: "" },
    { title: "Sal Marinho 1kg", price: 5.99, store: "Extra", url: "" },
    { title: "Sal Grosso 1kg", price: 3.49, store: "Assaí", url: "" },
  ],
  cafe: [
    { title: "Café Torrado Moído Pilão 500g", price: 18.90, store: "Carrefour", url: "" },
    { title: "Café Torrado Moído 3 Corações 500g", price: 17.99, store: "Assaí", url: "" },
    { title: "Café Solúvel Nescafé 200g", price: 15.99, store: "Extra", url: "" },
  ],
  chocolate: [
    { title: "Chocolate em Pó Nescau 400g", price: 9.99, store: "Assaí", url: "" },
    { title: "Chocolate em Pó Toddy 400g", price: 8.99, store: "Carrefour", url: "" },
    { title: "Chocolate Meio Amargo 70% 100g", price: 7.99, store: "Extra", url: "" },
    { title: "Chocolate Branco 100g", price: 6.99, store: "Assaí", url: "" },
    { title: "Cacau em Pó 100% 200g", price: 14.90, store: "Carrefour", url: "" },
  ],
  fermento: [
    { title: "Fermento Biológico Seco Fleischmann 10g", price: 3.99, store: "Assaí", url: "" },
    { title: "Fermento Químico Royal 100g", price: 6.49, store: "Carrefour", url: "" },
    { title: "Fermento Biológico Fresco 15g", price: 2.49, store: "Assaí", url: "" },
    { title: "Bicarbonato de Sódio 100g", price: 4.99, store: "Extra", url: "" },
  ],
  macarrao: [
    { title: "Macarrão Espaguete Adria 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Espaguete Renata 500g", price: 5.29, store: "Carrefour", url: "" },
    { title: "Macarrão Penne 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Parafuso 500g", price: 4.99, store: "Extra", url: "" },
    { title: "Lasanha 500g", price: 6.99, store: "Carrefour", url: "" },
  ],
  batata: [
    { title: "Batata Inglesa 1kg", price: 4.99, store: "Hortifruti", url: "" },
    { title: "Batata Doce 1kg", price: 4.49, store: "Hortifruti", url: "" },
    { title: "Batata Asterix 1kg", price: 5.99, store: "Extra", url: "" },
  ],
  cebola: [
    { title: "Cebola 1kg", price: 5.99, store: "Hortifruti", url: "" },
    { title: "Cebola 1kg", price: 6.49, store: "Extra", url: "" },
    { title: "Cebola Roxa 1kg", price: 8.99, store: "Hortifruti", url: "" },
  ],
  alho: [
    { title: "Alho 100g", price: 3.99, store: "Hortifruti", url: "" },
    { title: "Alho 200g", price: 6.99, store: "Carrefour", url: "" },
    { title: "Alho Picado 300g", price: 8.99, store: "Assaí", url: "" },
  ],
  cenoura: [
    { title: "Cenoura 1kg", price: 3.99, store: "Hortifruti", url: "" },
    { title: "Cenoura 1kg", price: 4.99, store: "Extra", url: "" },
  ],
  tomate: [
    { title: "Tomate 1kg", price: 6.99, store: "Hortifruti", url: "" },
    { title: "Tomate 1kg", price: 7.49, store: "Extra", url: "" },
    { title: "Tomate Pelado Enlatado 400g", price: 5.99, store: "Carrefour", url: "" },
    { title: "Extrato de Tomate 300g", price: 4.99, store: "Assaí", url: "" },
  ],
  frango: [
    { title: "Peito de Frango 1kg", price: 19.99, store: "Assaí", url: "" },
    { title: "Peito de Frango 1kg", price: 22.99, store: "Carrefour", url: "" },
    { title: "Coxa de Frango 1kg", price: 12.99, store: "Assaí", url: "" },
    { title: "Frango Inteiro 1kg", price: 14.99, store: "Extra", url: "" },
  ],
  carne: [
    { title: "Carne Moída 1kg", price: 28.99, store: "Assaí", url: "" },
    { title: "Carne Moída 1kg", price: 32.99, store: "Carrefour", url: "" },
    { title: "Patinho 1kg", price: 36.90, store: "Assaí", url: "" },
    { title: "Coxão Mole 1kg", price: 38.90, store: "Carrefour", url: "" },
    { title: "Alcatra 1kg", price: 44.90, store: "Extra", url: "" },
  ],
  queijo: [
    { title: "Queijo Mussarela 1kg", price: 38.90, store: "Assaí", url: "" },
    { title: "Queijo Mussarela 1kg", price: 42.90, store: "Carrefour", url: "" },
    { title: "Queijo Minas 500g", price: 22.90, store: "Extra", url: "" },
    { title: "Queijo Prato 1kg", price: 44.90, store: "Carrefour", url: "" },
    { title: "Queijo Parmesão 100g", price: 9.99, store: "Assaí", url: "" },
    { title: "Requeijão Cremoso 200g", price: 8.99, store: "Carrefour", url: "" },
  ],
  presunto: [
    { title: "Presunto 1kg", price: 24.90, store: "Assaí", url: "" },
    { title: "Presunto 1kg", price: 28.90, store: "Carrefour", url: "" },
    { title: "Peito de Peru 1kg", price: 36.90, store: "Extra", url: "" },
  ],
  polpa: [
    { title: "Polpa de Tomate 300g", price: 3.99, store: "Assaí", url: "" },
    { title: "Polpa de Tomate 300g", price: 4.49, store: "Carrefour", url: "" },
    { title: "Polpa de Fruta 100g", price: 5.99, store: "Extra", url: "" },
  ],
  iogurte: [
    { title: "Iogurte Natural 170g", price: 3.99, store: "Carrefour", url: "" },
    { title: "Iogurte Grego 200g", price: 5.99, store: "Assaí", url: "" },
  ],
  creme: [
    { title: "Creme de Leite Nestlé 200g", price: 4.99, store: "Carrefour", url: "" },
    { title: "Creme de Leite Piracanjuba 200g", price: 4.49, store: "Assaí", url: "" },
  ],
  doce: [
    { title: "Doce de Leite Viçosa 400g", price: 12.99, store: "Carrefour", url: "" },
    { title: "Doce de Leite 400g", price: 11.99, store: "Assaí", url: "" },
    { title: "Goiabada 300g", price: 8.99, store: "Extra", url: "" },
  ],
  granola: [
    { title: "Granola 250g", price: 10.99, store: "Carrefour", url: "" },
    { title: "Granola 500g", price: 18.99, store: "Assaí", url: "" },
    { title: "Aveia em Flocos 250g", price: 5.99, store: "Extra", url: "" },
  ],
  aveia: [
    { title: "Aveia em Flocos 250g", price: 5.99, store: "Extra", url: "" },
    { title: "Aveia em Flocos 1kg", price: 11.99, store: "Carrefour", url: "" },
  ],
  gelatina: [
    { title: "Gelatina em Pó 20g", price: 2.49, store: "Assaí", url: "" },
    { title: "Gelatina em Pó 20g", price: 2.99, store: "Carrefour", url: "" },
    { title: "Gelatina sem Sabor 12g", price: 3.99, store: "Extra", url: "" },
  ],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function tokenize(str: string): string[] {
  return normalize(str)
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

const STOP_WORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "com", "sem", "para", "por", "um", "uma", "uns", "umas", "o", "a",
  "os", "as", "e", "ou", "que", "se", "é", "sao", "tem", "mais",
  "muito", "pouco", "sobre", "entre", "como", "sua", "seu",
]);

function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

function fuzzyScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  if (a.length < 3 || b.length < 3) return 0;
  let matches = 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] === shorter[i]) matches++;
  }
  return matches / longer.length;
}

function countWholeTokenMatches(text: string, tokens: string[]): number {
  let matched = 0;
  for (const t of tokens) {
    const re = new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`, "i");
    if (re.test(text)) matched++;
  }
  return matched;
}

function scoreMatch(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const norm = normalize(text);
  const whole = countWholeTokenMatches(norm, tokens);
  if (whole === 0) return 0;
  let score = whole / tokens.length;
  const first = tokens[0];
  if (first && norm.trimStart().startsWith(first)) score += 0.2;
  return score;
}

function getFallback(query: string): PriceResult[] {
  const qTokens = removeStopWords(tokenize(query));
  if (qTokens.length === 0) return [];

  let bestKey = "";
  let bestScore = 0;
  for (const key of Object.keys(FALLBACK)) {
    const kTokens = removeStopWords(tokenize(key));
    let totalScore = 0;
    for (const qt of qTokens) {
      let maxWordScore = 0;
      for (const kt of kTokens) {
        const s = fuzzyScore(qt, kt);
        if (s > maxWordScore) maxWordScore = s;
      }
      totalScore += maxWordScore;
    }
    const avg = totalScore / qTokens.length;
    if (avg > bestScore) {
      bestScore = avg;
      bestKey = key;
    }
  }

  if (bestScore >= 0.5 && bestKey) {
    return [...FALLBACK[bestKey]];
  }
  return [];
}

// --- Adapters ---

class SerpApiAdapter implements SearchAdapter {
  readonly name = "serpapi";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || "";
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0 && !serpapiExhausted;
  }

  async search(query: string): Promise<PriceResult[]> {
    try {
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&hl=pt-BR&gl=br&num=10&api_key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        if (/credit|quota|limit|plan/i.test(body)) serpapiExhausted = true;
        return [];
      }

      const data = await res.json();
      const tokens = tokenize(query).filter(
        (t) => !STOP_WORDS.has(t) && t !== "preco" && t !== "supermercado" && t !== "brasil",
      );
      const scored: { result: PriceResult; score: number }[] = [];
      const seen = new Set<string>();

      for (const item of data.organic_results || []) {
        const title = String(item.title || "").trim();
        const snippet = String(item.snippet || "").trim();
        const text = `${title} ${snippet}`;
        if (isNoise(text, item.link || item.displayed_link || "")) continue;
        const priceMatch = text.match(/R\$\s*([0-9]+[.,][0-9]{2})/);
        if (!priceMatch) continue;
        const price = parseFloat(priceMatch[1].replace(/\./g, "").replace(",", "."));
        if (!(price > 0.5 && price < 100000)) continue;
        const store = extractStore(text) || domainLabel(item.displayed_link || item.link || "");
        const key = `${title}|${price}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const normText = normalize(text);
        const matched = countWholeTokenMatches(normText, tokens);
        let score = tokens.length > 0 ? matched / tokens.length : 1;
        if (tokens.length > 0 && matched === 0) continue;
        score += packageSizePenalty(title);
        if (score <= 0.25) continue;
        scored.push({
          result: {
            title: title.substring(0, 60) || query,
            price,
            store,
            url: item.link || "",
          },
          score,
        });
      }

      scored.sort((a, b) => b.score - a.score || a.result.price - b.result.price);

      const strict = scored.filter((s) => s.score >= 0.34 && (tokens.length === 0 || s.score * tokens.length >= 1));
      if (strict.length >= 2) return strict.slice(0, 6).map((s) => s.result);

      const relaxed = scored.filter((s) => tokens.length === 0 || s.score * tokens.length >= 1);
      if (relaxed.length >= 2) return relaxed.slice(0, 6).map((s) => s.result);

      return scored.slice(0, 6).map((s) => s.result);
    } catch {
      return [];
    }
  }
}

class CheerioAdapter implements SearchAdapter {
  readonly name = "cheerio";

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<PriceResult[]> {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=pt-BR`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const html = await res.text();
      const { load } = await import("cheerio");
      const $: CheerioAPI = load(html);
      const results: PriceResult[] = [];

      $('[data-tts="results"] a, [jsname="UWckNb"] a, .BNeawe, .dr_header a').each((_, el) => {
        const text = $(el).text().trim();
        const priceMatch = text.match(/R?\$?\s*(\d+[.,]\d{2})/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(",", "."));
          const title = text.replace(priceMatch[0], "").trim().substring(0, 80);
          if (price > 0 && title.length > 5) {
            results.push({
              title: title.substring(0, 60),
              price,
              store: extractStore(text) || "Google Shopping",
              url: $(el).attr("href") || "",
            });
          }
        }
      });

      return results.slice(0, 5);
    } catch {
      return [];
    }
  }
}

const STORES = ["Assaí", "Carrefour", "Extra", "Pão de Açúcar", "Atacadão", "Sams Club", "Magazine Luiza", "Amazon", "Mercado Livre", "Shopee", "Americanas", "Hortifruti", "St Marche", "Oba"];

function extractStore(text: string): string {
  for (const store of STORES) {
    if (text.toLowerCase().includes(store.toLowerCase())) return store;
  }
  return "";
}

const NOISE_DOMAINS = [
  "bbc.com",
  "g1.globo.com",
  "globo.com",
  "uol.com.br",
  "terra.com.br",
  "timesbrasil",
  "instagram.com",
  "facebook.com",
  "youtube.com",
  "reclameaqui.com.br",
  "estadao.com.br",
  "folha.uol.com.br",
  "cnnbrasil.com.br",
];

const NOISE_WORDS = [
  "dispara",
  "recua",
  "preocupa",
  "dobra",
  "subiu",
  "caiu",
  "quase dobra",
  "chega a",
  "eleva",
  "avança",
  "sobe",
  "reajuste",
  "por que o preço",
];

function isNoise(text: string, link: string): boolean {
  const lower = `${text} ${link}`.toLowerCase();
  if (NOISE_DOMAINS.some((d) => lower.includes(d))) return true;
  return NOISE_WORDS.some((w) => lower.includes(w));
}

const DOMAIN_LABELS: { pattern: string; label: string }[] = [
  { pattern: "assai", label: "Assaí" },
  { pattern: "carrefour", label: "Carrefour" },
  { pattern: "pab.com.br", label: "Pão de Açúcar" },
  { pattern: "extra", label: "Extra" },
  { pattern: "atacadao", label: "Atacadão" },
  { pattern: "sams", label: "Sam's Club" },
  { pattern: "magazineluiza", label: "Magazine Luiza" },
  { pattern: "amazon", label: "Amazon" },
  { pattern: "mercadolivre", label: "Mercado Livre" },
  { pattern: "shopee", label: "Shopee" },
  { pattern: "americanas", label: "Americanas" },
  { pattern: "ifood", label: "iFood" },
  { pattern: "rappi", label: "Rappi" },
  { pattern: "muffato", label: "Muffato" },
  { pattern: "barbosa", label: "Barbosa" },
  { pattern: "mambo", label: "Mambo" },
  { pattern: "hada", label: "Hada" },
  { pattern: "semar", label: "Semar" },
];

function domainLabel(text: string): string {
  const host = text.toLowerCase();
  for (const { pattern, label } of DOMAIN_LABELS) {
    if (host.includes(pattern)) return label;
  }
  try {
    const u = new URL(text.startsWith("http") ? text : `https://${text}`);
    return u.hostname.replace(/^www\./, "").replace(/\.com\.br$/, "").replace(/\.br$/, "").replace(/\.com$/, "").replace(/\./, " ");
  } catch {
    return "Loja online";
  }
}

function generateFallbackResults(productName: string, brandName?: string): PriceResult[] {
  const q = `${productName} ${brandName || ""}`.trim();
  const fallback = getFallback(q);
  if (fallback.length > 0) return fallback;

  const qTokens = removeStopWords(tokenize(q));
  for (const token of qTokens) {
    const match = getFallback(token);
    if (match.length > 0) return match;
  }

  return [
    { title: `${productName}${brandName ? ` - ${brandName}` : ""} (preço estimado)`, price: Number((Math.random() * 20 + 5).toFixed(2)), store: "Mercado Local", url: "" },
    { title: `${productName}${brandName ? ` - ${brandName}` : ""} (preço estimado)`, price: Number((Math.random() * 25 + 8).toFixed(2)), store: "Supermercado Online", url: "" },
  ];
}

class VtexAdapter implements SearchAdapter {
  readonly name = "vtex";

  private stores: { name: string; host: string }[] = [
    { name: "Atacadão", host: "https://www.atacadao.com.br" },
    { name: "Sam's Club", host: "https://www.samsclub.com.br" },
    { name: "Zona Sul", host: "https://www.zonasul.com.br" },
  ];

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<PriceResult[]> {
    const cleanQuery = query
      .replace(/\bpreço\b|\bpreco\b|\bsupermercado\b|\bbrasil\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    for (const store of this.stores) {
      try {
        const url = `${store.host}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(cleanQuery)}&_from=0&_to=9`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            Accept: "application/json",
            "Accept-Language": "pt-BR,pt;q=0.9",
          },
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) continue;

        const data = (await res.json()) as unknown;
        if (!Array.isArray(data)) continue;

        const tokens = tokenize(cleanQuery).filter((t) => !STOP_WORDS.has(t));
        const results: PriceResult[] = [];
        const seen = new Set<string>();

        for (const item of data) {
          const product = item as {
            productName?: string;
            link?: string;
            items?: { sellers?: { commertialOffer?: { Price?: number; IsAvailable?: boolean } }[] }[];
          };
          const name = String(product.productName || "").trim();
          const offer = product.items?.[0]?.sellers?.[0]?.commertialOffer;
          const price = typeof offer?.Price === "number" ? offer.Price : undefined;
          if (!name || typeof price !== "number" || price <= 0.5) continue;
          if (offer?.IsAvailable === false) continue;

          const normName = normalize(name);
          const whole = countWholeTokenMatches(normName, tokens);
          if (tokens.length > 0 && whole === 0) continue;
          let score = tokens.length > 0 ? whole / tokens.length : 1;
          score += packageSizePenalty(name);
          if (tokens.length > 0 && score <= 0.25) continue;

          const key = `${name}|${price}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            title: name.substring(0, 60),
            price,
            store: store.name,
            url: product.link || "",
            score,
          });
        }

        results.sort((a, b) => (b as { score: number }).score - (a as { score: number }).score);
        if (results.length >= 2) {
          return results.slice(0, 6).map(({ score: _s, ...r }) => r);
        }
      } catch {
        // Try next store
      }
    }

    return [];
  }
}

const adapters: SearchAdapter[] = [
  new SerpApiAdapter(),
  new VtexAdapter(),
  new CheerioAdapter(),
];

let serpapiExhausted = false;

export interface PriceSearchResult {
  results: PriceResult[];
  source: "serpapi" | "vtex" | "cheerio" | "fallback";
}

export async function searchProductPrice(
  productName: string,
  _location?: { lat: number; lng: number } | null,
  brandName?: string,
  opts?: { refine?: boolean },
): Promise<PriceSearchResult> {
  const query = `${productName} ${brandName || ""} preço supermercado brasil`.trim();
  const result = await searchWithAdapters(query);
  if (result.source !== "fallback") return result;

  if (opts?.refine !== false) {
    const refined = await refineSearchQuery(productName, brandName);
    if (refined && refined.toLowerCase() !== query.toLowerCase()) {
      const refinedResult = await searchWithAdapters(`${refined} preço supermercado brasil`);
      if (refinedResult.source !== "fallback") return refinedResult;
    }
  }

  return { results: generateFallbackResults(productName, brandName), source: "fallback" };
}

async function searchWithAdapters(query: string): Promise<PriceSearchResult> {
  for (const adapter of adapters) {
    if (!adapter.isAvailable()) continue;
    try {
      const results = await adapter.search(query);
      if (results.length >= 2) {
        const name = adapter.name;
        return {
          results,
          source: name === "serpapi" ? "serpapi" : name === "vtex" ? "vtex" : "cheerio",
        };
      }
    } catch {
      // Fall through — adapter failed silently, try next
    }
  }
  return { results: [], source: "fallback" };
}
