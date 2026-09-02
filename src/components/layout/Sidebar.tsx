"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/dashboard", label: "Visão Geral", icon: "📊" },
  { href: "/dashboard/products", label: "Produtos", icon: "🛒" },
  { href: "/dashboard/estoque", label: "Estoque", icon: "📦" },
  { href: "/dashboard/recipes", label: "Receitas", icon: "📖" },
  { href: "/dashboard/categories", label: "Categorias", icon: "🏷️" },
  { href: "/dashboard/calculations", label: "Cálculos", icon: "💰" },
  { href: "/dashboard/subscription", label: "Planos", icon: "⭐" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Usuário";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const nav = (
    <>
      <div className="p-5 border-b border-gray-50">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm">
            RJ
          </div>
          <div>
            <span className="text-base font-bold text-gray-900">Receita Justa</span>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">Gestão de receitas</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Menu</p>
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs ${isActive ? "bg-white shadow-sm" : ""}`}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-50 space-y-0.5">
        <div className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-400">
          <div className="w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center text-gray-600 text-[10px] font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{userName}</span>
        </div>
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-lg text-xs bg-gray-50">🚪</span>
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl bg-gray-800 text-white flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col shadow-sm transform transition-transform md:transform-none ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
