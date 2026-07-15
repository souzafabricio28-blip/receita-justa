import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/services/subscription-service";
import { withErrorHandler } from "@/lib/errors";

const processedIds = new Set<string>();
const IDEMPOTENCY_TTL = 5 * 60 * 1000;

setInterval(() => {
  processedIds.clear();
}, IDEMPOTENCY_TTL);

export const POST = withErrorHandler(async (request: Request) => {
  const bodyText = await request.text();
  const signature = request.headers.get("x-signature");
  const idempotencyKey = request.headers.get("x-idempotency-key");

  if (idempotencyKey) {
    if (processedIds.has(idempotencyKey)) {
      return NextResponse.json({ success: true, cached: true });
    }
    processedIds.add(idempotencyKey);
    setTimeout(() => processedIds.delete(idempotencyKey), IDEMPOTENCY_TTL);
  }

  const result = await subscriptionService.handleWebhook(bodyText, signature);
  if (!result.success) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: result.status });
  }

  return NextResponse.json({ success: true });
});
