import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";

export interface CreateRecipeInput {
  title: string;
  description?: string;
  instructions?: string;
  yield?: number;
  createdById: string;
}

export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  instructions?: string;
  yield?: number;
  categoryId?: string;
  imageUrl?: string;
}

const ALLOWED_UPDATE_FIELDS = ["title", "description", "instructions", "yield", "categoryId", "imageUrl"];

export const recipeService = {
  async list(userId: string) {
    logger.debug("Listing recipes", { userId });
    return prisma.recipe.findMany({
      where: { createdById: userId },
      include: {
        products: { include: { product: { include: { brand: true } } } },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string, userId: string) {
    logger.debug("Getting recipe", { recipeId: id, userId });
    const recipe = await prisma.recipe.findFirst({
      where: { id, createdById: userId },
      include: {
        products: { include: { product: { include: { brand: true } } } },
        category: true,
      },
    });

    if (!recipe) throw new NotFoundError("Receita não encontrada");
    return recipe;
  },

  async create(input: CreateRecipeInput) {
    if (!input.title?.trim()) throw new ValidationError("Título é obrigatório");

    logger.info("Creating recipe", { title: input.title, userId: input.createdById });
    return prisma.recipe.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim(),
        instructions: input.instructions?.trim(),
        yield: input.yield || 1,
        createdById: input.createdById,
      },
    });
  },

  async update(id: string, userId: string, input: UpdateRecipeInput) {
    await this.getById(id, userId);

    const data = Object.fromEntries(
      ALLOWED_UPDATE_FIELDS
        .filter((f) => f in input)
        .map((f) => [f, input[f as keyof UpdateRecipeInput]])
    );

    logger.info("Updating recipe", { recipeId: id, fields: Object.keys(data) });
    return prisma.recipe.updateMany({
      where: { id, createdById: userId },
      data,
    });
  },

  async delete(id: string, userId: string) {
    await this.getById(id, userId);

    logger.info("Deleting recipe", { recipeId: id, userId });
    await prisma.recipe.deleteMany({
      where: { id, createdById: userId },
    });
  },

  async addProduct(recipeId: string, userId: string, productId: string, quantity: number) {
    await this.getById(recipeId, userId);

    logger.debug("Adding product to recipe", { recipeId, productId, quantity });
    return prisma.recipeProduct.upsert({
      where: { recipeId_productId: { recipeId, productId } },
      update: { quantity },
      create: { recipeId, productId, quantity },
      include: {
        product: {
          include: {
            brand: true,
            purchases: { orderBy: { date: "desc" } },
          },
        },
      },
    });
  },

  async removeProduct(recipeId: string, userId: string, productId: string) {
    await this.getById(recipeId, userId);

    logger.debug("Removing product from recipe", { recipeId, productId });
    await prisma.recipeProduct.deleteMany({
      where: { recipeId, productId },
    });
  },
};
