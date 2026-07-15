"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/dashboard", label: "Visão Geral", icon: "📊" },
  { href: "/dashboard/recipes", label: "Receitas", icon: "📖" },
  { href: "/dashboard/products", label: "Produtos", icon: "🛒" },
  { href: "/dashboard/product-categories", label: "Cat. Produtos", icon: "📦" },
  { href: "/dashboard/categories", label: "Categorias", icon: "🏷️" },
  { href: "/dashboard/calculations", label: "Cálculos", icon: "💰" },
  { href: "/dashboard/subscription", label: "Planos", icon: "⭐" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4 flex flex-col">
      <Link href="/dashboard" className="text-xl font-bold text-emerald-700 mb-8">
        Receita Justa
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 mt-auto"
      >
        <span>🚪</span>
        Sair
      </button>
    </aside>
  );
}
