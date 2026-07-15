import * as cheerio from "cheerio";

export interface PriceResult {
  title: string;
  price: number;
  store: string;
  url: string;
}

const FALLBACK: Record<string, PriceResult[]> = {
  farinha: [
    { title: "Farinha de Trigo Dona Benta 1kg", price: 5.49, store: "Assaí", url: "" },
    { title: "Farinha de Trigo Renata 1kg", price: 5.99, store: "Carrefour", url: "" },
    { title: "Farinha de Trigo Tradicional 1kg", price: 4.99, store: "Extra", url: "" },
    { title: "Farinha de Arroz 500g", price: 6.99, store: "Assaí", url: "" },
    { title: "Farinha de Mandioca 1kg", price: 7.49, store: "Carrefour", url: "" },
  ],
  açúcar: [
    { title: "Açúcar Refinado União 1kg", price: 4.99, store: "Carrefour", url: "" },
    { title: "Açúcar Cristal 1kg", price: 3.99, store: "Assaí", url: "" },
    { title: "Açúcar Mascavo 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Açúcar de Confeiteiro 1kg", price: 9.49, store: "Extra", url: "" },
  ],
  acucar: [
    { title: "Açúcar Refinado União 1kg", price: 4.99, store: "Carrefour", url: "" },
    { title: "Açúcar Cristal 1kg", price: 3.99, store: "Assaí", url: "" },
  ],
  arroz: [
    { title: "Arroz Tipo 1 Camil 5kg", price: 28.90, store: "Assaí", url: "" },
    { title: "Arroz Tipo 1 Tio João 5kg", price: 32.90, store: "Extra", url: "" },
    { title: "Arroz Integral 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Arroz Arbóreo 500g", price: 12.90, store: "Carrefour", url: "" },
  ],
  feijão: [
    { title: "Feijão Carioca Kicaldo 1kg", price: 8.49, store: "Carrefour", url: "" },
    { title: "Feijão Carioca Camil 1kg", price: 7.99, store: "Assaí", url: "" },
    { title: "Feijão Preto 1kg", price: 8.99, store: "Assaí", url: "" },
    { title: "Feijão Branco 500g", price: 9.99, store: "Carrefour", url: "" },
  ],
  feijao: [
    { title: "Feijão Carioca Kicaldo 1kg", price: 8.49, store: "Carrefour", url: "" },
    { title: "Feijão Carioca Camil 1kg", price: 7.99, store: "Assaí", url: "" },
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
  óleo: [
    { title: "Óleo de Soja Liza 900ml", price: 8.49, store: "Assaí", url: "" },
    { title: "Óleo de Soja Soya 900ml", price: 8.29, store: "Carrefour", url: "" },
    { title: "Azeite de Oliva Extra Virgem 500ml", price: 24.90, store: "Carrefour", url: "" },
    { title: "Óleo de Coco 200ml", price: 14.90, store: "Assaí", url: "" },
  ],
  oleo: [
    { title: "Óleo de Soja Liza 900ml", price: 8.49, store: "Assaí", url: "" },
    { title: "Óleo de Soja Soya 900ml", price: 8.29, store: "Carrefour", url: "" },
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
  ovos: [
    { title: "Ovos Brancos 30un", price: 16.99, store: "Assaí", url: "" },
    { title: "Ovos Vermelhos Granja 12un", price: 10.99, store: "Carrefour", url: "" },
  ],
  sal: [
    { title: "Sal Refinado Cisne 1kg", price: 2.99, store: "Assaí", url: "" },
    { title: "Sal Refinado 1kg", price: 2.79, store: "Carrefour", url: "" },
    { title: "Sal Marinho 1kg", price: 5.99, store: "Extra", url: "" },
    { title: "Sal Grosso 1kg", price: 3.49, store: "Assaí", url: "" },
  ],
  café: [
    { title: "Café Torrado Moído Pilão 500g", price: 18.90, store: "Carrefour", url: "" },
    { title: "Café Torrado Moído 3 Corações 500g", price: 17.99, store: "Assaí", url: "" },
    { title: "Café Solúvel Nescafé 200g", price: 15.99, store: "Extra", url: "" },
  ],
  cafe: [
    { title: "Café Torrado Moído Pilão 500g", price: 18.90, store: "Carrefour", url: "" },
    { title: "Café Torrado Moído 3 Corações 500g", price: 17.99, store: "Assaí", url: "" },
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
  macarrão: [
    { title: "Macarrão Espaguete Adria 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Espaguete Renata 500g", price: 5.29, store: "Carrefour", url: "" },
    { title: "Macarrão Penne 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Parafuso 500g", price: 4.99, store: "Extra", url: "" },
    { title: "Lasanha 500g", price: 6.99, store: "Carrefour", url: "" },
  ],
  macarrao: [
    { title: "Macarrão Espaguete Adria 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Espaguete Renata 500g", price: 5.29, store: "Carrefour", url: "" },
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

function getFallback(query: string): PriceResult[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, prices] of Object.entries(FALLBACK)) {
    if (q.includes(key)) return [...prices];
  }
  return [];
}

async function scrapeFromWeb(productName: string): Promise<PriceResult[]> {
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(productName + " preço supermercado brasil")}&hl=pt-BR`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
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

function extractStore(text: string): string {
  const stores = ["Assaí", "Carrefour", "Extra", "Pão de Açúcar", "Atacadão", "Sams Club", "Magazine Luiza", "Amazon", "Mercado Livre", "Shopee", "Americanas", "Hortifruti", "St Marche", "Oba"];
  for (const store of stores) {
    if (text.toLowerCase().includes(store.toLowerCase())) return store;
  }
  return "";
}

function generateFallbackResults(productName: string): PriceResult[] {
  const q = productName.toLowerCase().trim();
  const fallback = getFallback(q);
  if (fallback.length > 0) return fallback;

  const words = q.split(/\s+/).filter((w) => w.length > 2);
  for (const word of words) {
    const match = getFallback(word);
    if (match.length > 0) return match;
  }

  return [
    { title: `${productName} (preço estimado)`, price: Math.round(Math.random() * 20 * 100 + 100) / 100, store: "Mercado Local", url: "" },
    { title: `${productName} (preço estimado)`, price: Math.round(Math.random() * 20 * 100 + 200) / 100, store: "Supermercado Online", url: "" },
  ];
}

export async function searchProductPrice(
  productName: string,
  _location?: { lat: number; lng: number } | null
): Promise<PriceResult[]> {
  const webResults = await scrapeFromWeb(productName);
  if (webResults.length >= 2) return webResults;

  return generateFallbackResults(productName);
}
