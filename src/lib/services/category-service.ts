import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError } from "@/lib/errors";

export const categoryService = {
  async list(userId: string) {
    return prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { recipes: true } } },
      orderBy: { name: "asc" },
    });
  },

  async create(userId: string, name: string, slug: string) {
    if (!name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (!slug?.trim()) throw new ValidationError("Slug é obrigatório");

    logger.info("Creating category", { userId, name, slug });
    return prisma.category.create({
      data: { userId, name: name.trim(), slug: slug.trim() },
    });
  },

  async update(id: string, userId: string, name: string, slug: string) {
    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundError("Categoria não encontrada");
    logger.debug("Updating category", { categoryId: id, userId, name, slug });
    return prisma.category.update({ where: { id }, data: { name, slug } });
  },

  async delete(id: string, userId: string) {
    const category = await prisma.category.findFirst({ where: { id, userId } });
    if (!category) throw new NotFoundError("Categoria não encontrada");
    logger.info("Deleting category", { categoryId: id, userId });
    await prisma.recipe.updateMany({
      where: { categoryId: id, createdById: userId },
      data: { categoryId: null },
    });
    await prisma.category.delete({ where: { id } });
  },
};
