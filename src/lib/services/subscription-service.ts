import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { PLANS } from "@/lib/plans";

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

export const subscriptionService = {
  async createCheckout(userId: string, plan: string) {
    if (plan !== "basico" && plan !== "premium") throw new ValidationError("Plano inválido");
    const planConfig = PLANS[plan as keyof typeof PLANS];

    logger.info("Creating subscription checkout", { userId, plan });

    if (!MP_ACCESS_TOKEN) {
      logger.error("MERCADO_PAGO_ACCESS_TOKEN não configurado");
      throw new ValidationError("Pagamento indisponível no momento. Tente novamente mais tarde.");
    }

    const preference = {
      items: [{
        id: plan,
        title: `Receita Justa - Plano ${planConfig.label}`,
        description: `Plano ${planConfig.label} - Acesso a todos os recursos`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: planConfig.price,
      }],
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/dashboard/subscription?success=true`,
        failure: `${process.env.NEXTAUTH_URL}/dashboard/subscription?failure=true`,
        pending: `${process.env.NEXTAUTH_URL}/dashboard/subscription?pending=true`,
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXTAUTH_URL}/api/subscription/webhook`,
      metadata: { userId, plan },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      logger.error("Mercado Pago preference creation failed", { error: err });
      throw new ValidationError("Erro ao criar pagamento no Mercado Pago");
    }

    const data = await mpRes.json();

    await prisma.subscription.upsert({
      where: { userId },
      update: { mpPreferenceId: data.id, plan: "premium", status: "pending" },
      create: { userId, plan: "premium", status: "pending", mpPreferenceId: data.id },
    });

    return { url: data.init_point };
  },

  async handleWebhook(bodyText: string, signature: string | null, requestId: string | null) {
    let body: { type?: string; data?: { id?: string } };
    try {
      body = JSON.parse(bodyText);
    } catch {
      return { success: false, status: 400 };
    }

    if (signature) {
      if (!this.verifySignature(body?.data?.id, requestId, signature)) {
        logger.warn("Invalid webhook signature");
        return { success: false, status: 401 };
      }
    } else if (MP_WEBHOOK_SECRET) {
      logger.warn("Missing webhook signature");
      return { success: false, status: 401 };
    }

    const { type, data } = body;

    if (type === "payment" && data?.id && MP_ACCESS_TOKEN) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        logger.error("Failed to query Mercado Pago payment", { paymentId: data.id });
        return { success: false, status: 500 };
      }

      const payment = await mpRes.json();
      const userId = payment.metadata?.userId;
      const plan = payment.metadata?.plan || "premium";
      const isApproved = payment.status === "approved";

      if (userId && isApproved) {
        logger.info("Activating subscription from webhook", { userId, plan, paymentId: payment.id });

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            status: "active",
            plan,
            mpPaymentId: String(payment.id),
            mpStatus: payment.status,
            startDate: new Date(),
          },
          create: {
            userId,
            plan,
            status: "active",
            mpPaymentId: String(payment.id),
            mpStatus: payment.status,
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { plan: "premium" },
        });
      }
    }

    return { success: true, status: 200 };
  },

  verifySignature(dataId: string | null | undefined, requestId: string | null | undefined, signature: string | null): boolean {
    if (!MP_WEBHOOK_SECRET || !dataId || !requestId || !signature) return false;

    const parts = Object.fromEntries(
      signature.split(",").map((p) => {
        const [k, v] = p.trim().split("=");
        return [k?.trim(), v?.trim()];
      })
    );

    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hmac = createHmac("sha256", MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    const a = Buffer.from(hmac);
    const b = Buffer.from(v1);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },
};
