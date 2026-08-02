import { prisma } from "@/lib/db";
import { ProductList } from "./ProductList";

const PAGE_SIZE = 20;

export default async function ProductsPage(props: { searchParams?: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      include: { brand: true, purchases: { orderBy: { date: "desc" } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count(),
  ]);

  return <ProductList products={JSON.parse(JSON.stringify(products)) as any} total={total} page={page} />;
}
