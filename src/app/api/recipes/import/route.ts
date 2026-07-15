import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importService } from "@/lib/services/import-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("importText");
  if (planError) return planError;

  const { searchParams } = new URL(request.url);
  const forceFallback = searchParams.get("forceFallback") === "true";

  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  }

  const result = await importService.parseText(text, forceFallback);
  return NextResponse.json(result);
});
