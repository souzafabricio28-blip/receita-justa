import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export interface CreateProductInput {
  name: string;
  unit?: string;
  averagePrice?: number;
  category?: string;
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
      include: { purchases: { orderBy: { date: "desc" } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
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

  async listCategories() {
    return prisma.productCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
  },

  async createCategory(name: string, slug: string) {
    if (!name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (!slug?.trim()) throw new ValidationError("Slug é obrigatório");
    return prisma.productCategory.create({ data: { name: name.trim(), slug: slug.trim() } });
  },

  async updateCategory(id: string, name: string, slug: string) {
    return prisma.productCategory.update({ where: { id }, data: { name, slug } });
  },

  async deleteCategory(id: string) {
    const cat = await prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new ValidationError("Categoria não encontrada");
    await prisma.productCategory.delete({ where: { id } });
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
