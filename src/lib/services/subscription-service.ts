import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { PLANS } from "@/lib/plans";

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

export const subscriptionService = {
  async createCheckout(userId: string, plan: string) {
    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) throw new ValidationError("Plano inválido");

    logger.info("Creating subscription checkout", { userId, plan });

    if (!MP_ACCESS_TOKEN) {
      await prisma.subscription.upsert({
        where: { userId },
        update: { plan: "premium", status: "active", startDate: new Date() },
        create: { userId, plan: "premium", status: "active" },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { plan: "premium" },
      });

      return { url: "/dashboard/subscription?upgraded=true" };
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

  async handleWebhook(bodyText: string, signature: string | null) {
    if (!this.verifySignature(bodyText, signature ?? null)) {
      logger.warn("Invalid webhook signature");
      return { success: false, status: 401 };
    }

    const body = JSON.parse(bodyText);
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

  verifySignature(body: string, signature: string | null): boolean {
    if (!MP_WEBHOOK_SECRET) return false;

    const parts = Object.fromEntries(
      (signature || "").split(",").map((p) => {
        const [k, v] = p.trim().split("=");
        return [k?.trim(), v?.trim()];
      })
    );

    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const manifest = `${ts}.${body}`;
    const hmac = createHmac("sha256", MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    return hmac === v1;
  },
};
