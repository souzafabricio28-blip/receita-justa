import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculationService } from "@/lib/services/calculation-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("calcProfit");
  if (planError) return planError;

  const { recipeId, suggestedPrice, packagingCost, transportCost, laborCost, feePercent, desiredMargin } = await request.json();
  const calculation = await calculationService.calculateProfit({
    recipeId,
    suggestedPrice,
    packagingCost,
    transportCost,
    laborCost,
    feePercent,
    desiredMargin,
    userId: session.user.id,
  });

  return NextResponse.json(calculation, { status: 201 });
});
