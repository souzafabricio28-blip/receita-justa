import { prisma } from "@/lib/db";
import { getSerpApiQuota } from "@/lib/serpapi-quota";
import { sendEmail, isEmailConfigured } from "@/lib/services/email-service";
import { logger } from "@/lib/logger";

const NOTIFY_INTERVAL_MS = 24 * 60 * 60 * 1000;

function adminRecipientsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter((e) => e.includes("@"));
}

export async function maybeNotifyQuota(): Promise<void> {
  if (!isEmailConfigured()) return;

  const quota = await getSerpApiQuota();
  if (!quota) return;
  if (!quota.low && !quota.exhausted) return;

  const type = quota.exhausted ? "serpapi_quota_exhausted" : "serpapi_quota_low";

  const existing = await prisma.notificationLog.findUnique({ where: { type } }).catch(() => null);
  if (existing && Date.now() - existing.sentAt.getTime() < NOTIFY_INTERVAL_MS) {
    return;
  }

  const recipients = adminRecipientsFromEnv();
  if (recipients.length === 0) {
    logger.info("Sem destinatário de e-mail configurado para aviso de cota");
    return;
  }

  const pct = quota.searchesPerMonth > 0 ? Math.round((quota.used / quota.searchesPerMonth) * 100) : 0;
  const renewal = quota.renewalDate ? ` (renova em ${quota.renewalDate})` : "";
  const subject = quota.exhausted
    ? "[Receita Justa] Cota de buscas de preço esgotada"
    : "[Receita Justa] Cota de buscas de preço quase esgotada";

  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
  <h2 style="color:#0f766e">${quota.exhausted ? "⚠️ Cota de buscas esgotada" : "⚠️ Cota de buscas quase esgotada"}</h2>
  <p>Plano: <b>${quota.planName}</b> — ${quota.searchesPerMonth} buscas/mês</p>
  <p>Usadas: <b>${quota.used}</b> (${pct}%) · Restantes: <b>${quota.remaining}</b>${renewal}</p>
  <p>
    ${quota.exhausted
      ? "As buscas reais de preço (SerpAPI) terminaram. Os preços voltaram a usar o fallback (VTEX) ou estimativas. Assine o plano pago da SerpAPI ou aguarde a renovação mensal."
      : `Restam apenas ${quota.remaining} buscas reais. Quando acabar, os preços passam a usar o fallback.`}
  </p>
  <p style="color:#888;font-size:12px">Enviado automaticamente pelo Receita Justa.</p>
</div>`;

  let sentAny = false;
  for (const email of recipients) {
    const ok = await sendEmail(email, subject, html);
    if (ok) sentAny = true;
  }

  if (sentAny) {
    await prisma.notificationLog.upsert({
      where: { type },
      update: { sentAt: new Date() },
      create: { type },
    });
  }
}
