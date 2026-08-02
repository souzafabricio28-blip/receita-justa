import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export interface CreateProductInput {
  name: string;
  unit?: string;
  brandId?: string;
}

export interface BrandOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

export const productService = {
  async search(query?: string, page = 1) {
    const where = query
      ? { name: { contains: query, mode: "insensitive" as const } }
      : {};

    logger.debug("Searching products", { query, page });
    return prisma.product.findMany({
      where,
      include: { brand: true, purchases: { orderBy: { date: "desc" } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  },

  async create(input: CreateProductInput) {
    if (!input.name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (input.name.length > 200) throw new ValidationError("Nome muito longo (máximo 200 caracteres)");

    logger.info("Creating product", { name: input.name, brandId: input.brandId });
    return prisma.product.create({
      data: {
        name: input.name.trim(),
        unit: input.unit || "un",
        brandId: input.brandId?.trim() || null,
      },
      include: { purchases: { orderBy: { date: "desc" } } },
    });
  },

  async update(id: string, input: Partial<CreateProductInput & { averagePrice?: number; currentStock?: number }>) {
    logger.debug("Updating product", { productId: id, ...input });
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.brandId !== undefined) data.brandId = input.brandId;
    if (input.averagePrice !== undefined) data.averagePrice = input.averagePrice;
    if (input.currentStock !== undefined) data.currentStock = input.currentStock;
    return prisma.product.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    logger.info("Deleting product", { productId: id });
    await prisma.product.delete({ where: { id } });
  },

  async deleteAll() {
    logger.warn("Deleting ALL products");
    await prisma.$transaction([
      prisma.purchase.deleteMany(),
      prisma.recipeProduct.deleteMany(),
      prisma.product.deleteMany(),
    ]);
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

  async listBrands() {
    return prisma.brand.findMany({
      orderBy: { name: "asc" },
    });
  },

  async adjustStock(productId: string, quantity: number) {
    logger.info("Adjusting stock", { productId, quantity });
    return prisma.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } },
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
