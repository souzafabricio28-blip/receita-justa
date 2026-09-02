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

  const planError = await requirePlan("importUrl");
  if (planError) return planError;

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }

  const result = await importService.parseFromUrl(url, session.user.id);
  return NextResponse.json(result);
});
