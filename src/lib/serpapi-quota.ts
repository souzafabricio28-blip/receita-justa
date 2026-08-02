export interface SerpApiQuota {
  planName: string;
  searchesPerMonth: number;
  used: number;
  remaining: number;
  renewalDate: string;
  exhausted: boolean;
  low: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: SerpApiQuota; at: number } | null = null;

function remainingFromData(data: Record<string, unknown>): number {
  if (typeof data.total_searches_left === "number") return data.total_searches_left;
  if (typeof data.plan_searches_left === "number") return data.plan_searches_left;
  return 0;
}

export async function getSerpApiQuota(): Promise<SerpApiQuota | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) return null;

  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${apiKey}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return cache?.data ?? null;

    const data = (await res.json()) as Record<string, unknown>;
    const searchesPerMonth = Number(data.searches_per_month) || 250;
    const used = Number(data.this_month_usage) || 0;
    const remaining = remainingFromData(data);
    const result: SerpApiQuota = {
      planName: String(data.plan_name || "Free"),
      searchesPerMonth,
      used,
      remaining,
      renewalDate: String(data.plan_renewal_date || ""),
      exhausted: remaining <= 0,
      low: remaining > 0 && remaining / searchesPerMonth < 0.2,
    };
    cache = { data: result, at: Date.now() };
    return result;
  } catch {
    return cache?.data ?? null;
  }
}
