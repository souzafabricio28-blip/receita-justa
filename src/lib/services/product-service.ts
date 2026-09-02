import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";

export interface CreateProductInput {
  name: string;
  unit?: string;
  brandId?: string;
  userId: string;
}

const PAGE_SIZE = 20;

export const productService = {
  async search(userId: string, query?: string, page = 1) {
    const where = {
      userId,
      ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
    };

    logger.debug("Searching products", { userId, query, page });
    return prisma.product.findMany({
      where,
      include: { brand: true, purchases: { orderBy: { date: "desc" } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  },

  async getOwned(id: string, userId: string) {
    const product = await prisma.product.findFirst({ where: { id, userId } });
    if (!product) throw new NotFoundError("Produto não encontrado");
    return product;
  },

  async create(input: CreateProductInput) {
    if (!input.name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (input.name.length > 200) throw new ValidationError("Nome muito longo (máximo 200 caracteres)");

    if (input.brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: input.brandId, userId: input.userId },
      });
      if (!brand) throw new ValidationError("Marca não encontrada");
    }

    logger.info("Creating product", { name: input.name, userId: input.userId, brandId: input.brandId });
    return prisma.product.create({
      data: {
        userId: input.userId,
        name: input.name.trim(),
        unit: input.unit || "un",
        brandId: input.brandId?.trim() || null,
      },
      include: { purchases: { orderBy: { date: "desc" } } },
    });
  },

  async update(
    id: string,
    userId: string,
    input: Partial<Omit<CreateProductInput, "userId"> & { averagePrice?: number; currentStock?: number }>
  ) {
    await this.getOwned(id, userId);

    if (input.brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: input.brandId, userId },
      });
      if (!brand) throw new ValidationError("Marca não encontrada");
    }

    logger.debug("Updating product", { productId: id, userId, ...input });
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

  async delete(id: string, userId: string) {
    await this.getOwned(id, userId);
    logger.info("Deleting product", { productId: id, userId });
    await prisma.recipeProduct.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
  },

  async deleteAll(userId: string) {
    logger.warn("Deleting all products for user", { userId });
    const products = await prisma.product.findMany({
      where: { userId },
      select: { id: true },
    });
    const ids = products.map((p) => p.id);
    await prisma.$transaction([
      prisma.recipeProduct.deleteMany({ where: { productId: { in: ids } } }),
      prisma.purchase.deleteMany({ where: { userId } }),
      prisma.product.deleteMany({ where: { userId } }),
    ]);
  },

  async recordPurchase(
    userId: string,
    productId: string,
    quantity: number,
    totalPrice: number,
    store?: string,
    notes?: string
  ) {
    await this.getOwned(productId, userId);
    if (quantity <= 0) throw new ValidationError("Quantidade deve ser maior que zero");
    if (totalPrice < 0) throw new ValidationError("Preço total não pode ser negativo");

    logger.info("Recording purchase", { userId, productId, quantity, totalPrice, store });
    return prisma.purchase.create({
      data: { userId, productId, quantity, totalPrice, store, notes },
    });
  },

  async listBrands(userId: string) {
    return prisma.brand.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });
  },

  async listPurchases(userId: string, productId?: string) {
    return prisma.purchase.findMany({
      where: { userId, ...(productId ? { productId } : {}) },
      include: { product: true },
      orderBy: { date: "desc" },
      take: 100,
    });
  },
};
