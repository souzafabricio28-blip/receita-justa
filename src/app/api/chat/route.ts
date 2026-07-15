import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chatService } from "@/lib/services/chat-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler, getSessionOrThrow, ValidationError } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = getSessionOrThrow(await auth());

  const planError = await requirePlan("assistant");
  if (planError) return planError;

  const { message } = await request.json();
  if (!message?.trim()) throw new ValidationError("Mensagem obrigatória");

  const response = await chatService.respond(session.user.id, message);
  return NextResponse.json({ response });
});
