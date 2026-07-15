import { NextResponse } from "next/server";
import { searchProductPrice } from "@/lib/prices";
import { requirePlan } from "@/lib/plan-check";

export async function GET(request: Request) {
  const planError = await requirePlan("searchPrices");
  if (planError) return planError;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!q) {
    return NextResponse.json({ error: "Parâmetro q é obrigatório" }, { status: 400 });
  }

  const location =
    lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : null;

  const results = await searchProductPrice(q, location);
  return NextResponse.json(
    { results },
    {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    }
  );
}
