import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWidgetDynamic } from "@/components/chat/ChatWidgetDynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isPremium = session?.user && (session.user as any)?.plan === "premium";

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 p-8">{children}</main>
      {isPremium && <ChatWidgetDynamic />}
    </div>
  );
}
