import { NextResponse } from "next/server";
import { searchProductPrice } from "@/lib/prices";
import { requirePlan } from "@/lib/plan-check";
import { getCachedPriceSearch, setCachedPriceSearch, recordPriceHistory } from "@/lib/price-cache";
import { maybeNotifyQuota } from "@/lib/services/quota-notify";

function cacheKey(q: string, brand?: string, refine?: boolean): string {
  return `price|${q.trim().toLowerCase()}|${(brand || "").trim().toLowerCase()}|${refine ? "ai" : "std"}`;
}

export async function GET(request: Request) {
  const planError = await requirePlan("searchPrices");
  if (planError) return planError;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const brand = searchParams.get("brand");
  const productId = searchParams.get("productId");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const refine = searchParams.get("refine") === "1";

  if (!q) {
    return NextResponse.json({ error: "Parâmetro q é obrigatório" }, { status: 400 });
  }

  const location =
    lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : null;

  const key = cacheKey(q, brand || undefined, refine);

  const cached = await getCachedPriceSearch(key);
  if (cached && cached.fresh && cached.source !== "fallback") {
    return NextResponse.json(
      { results: cached.results, source: cached.source, cached: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const { results, source } = await searchProductPrice(q, location, brand || undefined, { refine });

  if (source !== "fallback" && results.length > 0) {
    await setCachedPriceSearch(key, results, source);
    await recordPriceHistory(productId || null, q.trim(), results, source);
  }

  if (source === "fallback") {
    // Fire-and-forget: alerta de cota via e-mail (uma vez por dia)
    void maybeNotifyQuota();
  }

  return NextResponse.json(
    { results, source, cached: false },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
