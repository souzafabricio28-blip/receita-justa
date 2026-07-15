import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError } from "@/lib/errors";

export const categoryService = {
  async list() {
    return prisma.category.findMany({
      include: { _count: { select: { recipes: true } } },
      orderBy: { name: "asc" },
    });
  },

  async create(name: string, slug: string) {
    if (!name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (!slug?.trim()) throw new ValidationError("Slug é obrigatório");

    logger.info("Creating category", { name, slug });
    return prisma.category.create({ data: { name: name.trim(), slug: slug.trim() } });
  },

  async update(id: string, name: string, slug: string) {
    logger.debug("Updating category", { categoryId: id, name, slug });
    return prisma.category.update({ where: { id }, data: { name, slug } });
  },

  async delete(id: string) {
    logger.info("Deleting category", { categoryId: id });
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError("Categoria não encontrada");
    await prisma.category.delete({ where: { id } });
  },
};
