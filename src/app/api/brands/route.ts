import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler, UnauthorizedError, ValidationError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(brands);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { name } = await request.json();
  if (!name?.trim()) throw new ValidationError("Nome da marca é obrigatório");

  const brand = await prisma.brand.create({
    data: { name: name.trim() },
  });
  return NextResponse.json(brand, { status: 201 });
});
