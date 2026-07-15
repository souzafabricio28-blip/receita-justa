import { prisma } from "@/lib/db";
import { ProductList } from "./ProductList";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    include: { purchases: { orderBy: { date: "desc" } } },
    orderBy: { name: "asc" },
  });

  return <ProductList products={JSON.parse(JSON.stringify(products)) as any} />;
}
