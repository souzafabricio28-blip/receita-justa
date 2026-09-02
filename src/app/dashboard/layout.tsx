import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWidgetDynamic } from "@/components/chat/ChatWidgetDynamic";
import { SerpApiQuotaBanner } from "@/components/dashboard/SerpApiQuotaBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const plan = (session.user as any)?.plan;
  const isPremium = plan === "premium" || plan === "admin";
  const isAdmin = plan === "admin";

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 pt-16 md:p-8 md:pt-8 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {isAdmin && <SerpApiQuotaBanner />}
          {children}
        </div>
      </main>
      {isPremium && <ChatWidgetDynamic />}
    </div>
  );
}
