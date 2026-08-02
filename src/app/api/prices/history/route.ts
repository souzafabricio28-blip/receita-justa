import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const productName = searchParams.get("name");
  const days = Math.min(Number(searchParams.get("days")) || 90, 365);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const where: { createdAt: { gte: Date }; productId?: string; productName?: string | { equals: string; mode: "insensitive" } } = {
    createdAt: { gte: since },
  };
  if (productId) where.productId = productId;
  else if (productName) where.productName = { equals: productName, mode: "insensitive" };

  try {
    const history = await prisma.priceHistory.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 500,
    });

    const points = history.map((h) => ({
      createdAt: h.createdAt.toISOString(),
      price: h.price,
      store: h.store,
      title: h.title,
      source: h.source,
    }));

    return NextResponse.json({ points, count: points.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ points: [], count: 0 });
  }
}
