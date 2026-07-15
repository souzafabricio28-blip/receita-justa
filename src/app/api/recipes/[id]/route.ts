import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeService } from "@/lib/services/recipe-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const recipe = await recipeService.getById(id, session.user.id);
  return NextResponse.json(recipe);
});

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const body = await request.json();
  await recipeService.update(id, session.user.id, body);
  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  await recipeService.delete(id, session.user.id);
  return NextResponse.json({ success: true });
});
