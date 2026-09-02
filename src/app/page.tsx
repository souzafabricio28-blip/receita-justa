import Link from "next/link";
import { PLANS } from "@/lib/plans";

export default function Home() {
  const premium = PLANS.premium;

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Receita Justa</h1>
          <nav className="flex gap-3">
            <Link href="/login" className="text-neutral-300 hover:text-white font-medium px-3 py-2">
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-500 font-medium"
            >
              Criar conta grátis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-emerald-400 text-sm font-medium mb-3">Para confeitaria, marmita e doceria</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 max-w-3xl mx-auto">
            Saiba o custo real da receita antes de definir o preço
          </h2>
          <p className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto">
            Cadastre ingredientes, importe uma receita e veja custo por pote, fatia ou cento — em reais, com a conta da sua cozinha.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-emerald-500"
            >
              Começar grátis
            </Link>
            <Link
              href="/login"
              className="border border-white/20 text-neutral-200 px-8 py-3 rounded-lg text-lg font-medium hover:bg-white/5"
            >
              Já tenho conta
            </Link>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 pb-16">
          <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6 md:p-8 text-left">
            <p className="text-sm text-neutral-400 mb-2">Exemplo: bolo de pote</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Custo</p>
                <p className="text-2xl font-bold text-white">R$ 4,12</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Venda</p>
                <p className="text-2xl font-bold text-white">R$ 12,00</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Margem</p>
                <p className="text-2xl font-bold text-emerald-400">66%</p>
              </div>
            </div>
            <p className="text-sm text-neutral-500 mt-4">
              Sem chute: o sistema soma farinha, leite, embalagem e chega no preço mínimo para não vender no prejuízo.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-20 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 p-6">
            <p className="text-sm text-neutral-400 mb-1">Básico</p>
            <p className="text-3xl font-bold mb-4">Grátis</p>
            <ul className="space-y-2 text-sm text-neutral-300 mb-6">
              {PLANS.basico.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href="/register" className="inline-block text-emerald-400 font-medium hover:underline">
              Criar conta
            </Link>
          </div>
          <div className="rounded-2xl border border-emerald-500/50 p-6">
            <p className="text-sm text-emerald-400 mb-1">Premium</p>
            <p className="text-3xl font-bold mb-4">
              R$ {premium.price.toFixed(2).replace(".", ",")}
              <span className="text-base font-normal text-neutral-400"> /mês</span>
            </p>
            <ul className="space-y-2 text-sm text-neutral-300 mb-6">
              {premium.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Link href="/register" className="inline-block bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-500">
              Começar e assinar depois
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-neutral-500">
        © 2026 Receita Justa. Todos os direitos reservados.
      </footer>
    </div>
  );
}
