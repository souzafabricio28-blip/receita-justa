import { NextResponse } from "next/server";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class PlanLimitError extends AppError {
  constructor(message = "Seu plano não permite esta funcionalidade") {
    super(message, 403, "PLAN_LIMIT");
    this.name = "PlanLimitError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(error.message, {
          statusCode: error.statusCode,
          code: error.code,
          ...error.context,
        });
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      const message = error instanceof Error ? error.message : "Erro interno do servidor";
      logger.error(message, { error: String(error) });
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  };
}

export function getSessionOrThrow(session: unknown): { user: { id: string } } {
  if (!session || typeof session !== "object" || !("user" in session) || !session.user || typeof session.user !== "object" || !("id" in session.user)) {
    throw new UnauthorizedError();
  }
  return session as { user: { id: string } };
}
