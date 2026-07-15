import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/services/subscription-service";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const bodyText = await request.text();
  const signature = request.headers.get("x-signature");

  const result = await subscriptionService.handleWebhook(bodyText, signature);
  if (!result.success) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: result.status });
  }

  return NextResponse.json({ success: true });
});
