import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export interface CreateProductInput {
  name: string;
  unit?: string;
  averagePrice?: number;
  category?: string;
}

export const productService = {
  async search(query?: string) {
    const where = query
      ? { name: { contains: query, mode: "insensitive" as const } }
      : {};

    logger.debug("Searching products", { query });
    return prisma.product.findMany({
      where,
      include: { purchases: { orderBy: { date: "desc" } } },
      orderBy: { name: "asc" },
      take: query ? 20 : undefined,
    });
  },

  async create(input: CreateProductInput) {
    if (!input.name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (input.name.length > 200) throw new ValidationError("Nome muito longo (máximo 200 caracteres)");

    const validatedPrice = typeof input.averagePrice === "number" && input.averagePrice >= 0
      ? input.averagePrice
      : 0;

    logger.info("Creating product", { name: input.name, price: validatedPrice });
    return prisma.product.create({
      data: {
        name: input.name.trim(),
        unit: input.unit || "un",
        averagePrice: validatedPrice,
        category: input.category?.trim(),
      },
      include: { purchases: { orderBy: { date: "desc" } } },
    });
  },

  async update(id: string, input: Partial<CreateProductInput>) {
    logger.debug("Updating product", { productId: id, ...input });
    return prisma.product.update({
      where: { id },
      data: input,
    });
  },

  async delete(id: string) {
    logger.info("Deleting product", { productId: id });
    await prisma.product.delete({ where: { id } });
  },

  async deleteAll() {
    logger.warn("Deleting ALL products");
    await prisma.purchase.deleteMany();
    await prisma.recipeProduct.deleteMany();
    await prisma.product.deleteMany();
  },

  async recordPurchase(
    productId: string,
    quantity: number,
    totalPrice: number,
    store?: string,
    notes?: string
  ) {
    if (quantity <= 0) throw new ValidationError("Quantidade deve ser maior que zero");
    if (totalPrice < 0) throw new ValidationError("Preço total não pode ser negativo");

    logger.info("Recording purchase", { productId, quantity, totalPrice, store });
    return prisma.purchase.create({
      data: { productId, quantity, totalPrice, store, notes },
    });
  },

  async listPurchases(productId?: string) {
    const where = productId ? { productId } : {};
    return prisma.purchase.findMany({
      where,
      include: { product: true },
      orderBy: { date: "desc" },
      take: 100,
    });
  },
};
