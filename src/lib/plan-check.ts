import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkPlan } from "@/lib/plans";
import type { PlanConfig } from "@/lib/plans";

export async function requirePlan(feature: keyof PlanConfig["allowed"]): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const plan = (session.user as any).plan || "basico";
  if (!checkPlan(plan, feature)) {
    return NextResponse.json(
      { error: "Funcionalidade exclusiva do plano Premium", code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }

  return null;
}
