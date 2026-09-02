import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { categoryService } from "@/lib/services/category-service";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";

export const PUT = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  const { name, slug } = await request.json();
  const category = await categoryService.update(id, session.user.id, name, slug);
  return NextResponse.json(category);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  await categoryService.delete(id, session.user.id);
  return NextResponse.json({ success: true });
});
