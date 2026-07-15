"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao cadastrar");
      setLoading(false);
      return;
    }

    router.push("/login?registered=true");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-emerald-700">
            Receita Justa
          </Link>
          <p className="text-gray-600 mt-2">Crie sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nome" name="name" required placeholder="Seu nome" />
          <Input label="Email" name="email" type="email" required placeholder="seu@email.com" />
          <div className="relative">
            <Input label="Senha" name="password" type={showPassword ? "text" : "password"} required placeholder="Mínimo 8 caracteres" minLength={8} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-sm text-gray-400 hover:text-gray-600">
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <div className="relative">
            <Input label="Confirmar senha" name="confirmPassword" type={showConfirm ? "text" : "password"} required placeholder="Repita a senha" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[34px] text-sm text-gray-400 hover:text-gray-600">
              {showConfirm ? "🙈" : "👁️"}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Já tem conta?{" "}
          <Link href="/login" className="text-emerald-600 font-medium hover:underline">
            Entre aqui
          </Link>
        </p>
      </div>
    </div>
  );
}
