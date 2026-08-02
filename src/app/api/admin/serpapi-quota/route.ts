import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSerpApiQuota } from "@/lib/serpapi-quota";
import { maybeNotifyQuota } from "@/lib/services/quota-notify";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if ((session.user as any).plan !== "admin") {
    return NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 });
  }

  const quota = await getSerpApiQuota();
  void maybeNotifyQuota();
  return NextResponse.json({ quota }, { headers: { "Cache-Control": "no-store" } });
}
