import { prisma } from "@/lib/db";
import type { PriceResult } from "@/lib/prices";

export const PRICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CachedPriceSearch {
  results: PriceResult[];
  source: string;
  fresh: boolean;
}

export async function getCachedPriceSearch(key: string): Promise<CachedPriceSearch | null> {
  try {
    const entry = await prisma.priceCache.findUnique({ where: { key } });
    if (!entry) return null;
    const fresh = Date.now() - entry.fetchedAt.getTime() < PRICE_CACHE_TTL_MS;
    return {
      results: (entry.results as unknown as PriceResult[]) || [],
      source: entry.source,
      fresh,
    };
  } catch {
    return null;
  }
}

export async function setCachedPriceSearch(key: string, results: PriceResult[], source: string): Promise<void> {
  try {
    await prisma.priceCache.upsert({
      where: { key },
      update: { results: results as unknown as object, source, fetchedAt: new Date() },
      create: { key, results: results as unknown as object, source, fetchedAt: new Date() },
    });
  } catch {
    // Cache is best-effort
  }
}

export async function recordPriceHistory(
  productId: string | null,
  productName: string,
  results: PriceResult[],
  source: string
): Promise<void> {
  if (!results.length || source === "fallback") return;
  try {
    const rows = results.slice(0, 6).map((r) => ({
      productId,
      productName,
      title: r.title,
      price: r.price,
      store: r.store,
      url: r.url,
      source,
    }));
    await prisma.priceHistory.createMany({ data: rows });
  } catch {
    // History is best-effort
  }
}
