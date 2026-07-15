"use client";

import { useSession } from "next-auth/react";
import { checkPlan, PLANS } from "@/lib/plans";
import type { PlanConfig } from "@/lib/plans";

export function usePlan() {
  const { data: session } = useSession();
  const plan = (session?.user as any)?.plan || "basico";
  const planConfig = PLANS[plan as keyof typeof PLANS];

  return {
    plan,
    isPremium: plan === "premium",
    can: (feature: keyof PlanConfig["allowed"]) => checkPlan(plan, feature),
    planConfig,
    isLoaded: session !== undefined,
  };
}
