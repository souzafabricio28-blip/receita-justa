import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeService } from "@/lib/services/recipe-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const session = getSessionOrThrow(await auth());
  const recipes = await recipeService.list(session.user.id);
  return NextResponse.json(recipes);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = getSessionOrThrow(await auth());
  const { title, description, instructions, yield: recipeYield } = await request.json();

  const recipe = await recipeService.create({
    title,
    description,
    instructions,
    yield: recipeYield,
    createdById: session.user.id,
  });

  return NextResponse.json(recipe, { status: 201 });
});
