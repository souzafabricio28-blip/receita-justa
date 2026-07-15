import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { subscriptionService } from "@/lib/services/subscription-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = getSessionOrThrow(await auth());

  const { plan } = await request.json();
  const result = await subscriptionService.createCheckout(session.user.id, plan);

  return NextResponse.json(result);
});
