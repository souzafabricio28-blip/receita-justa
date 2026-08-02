import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-emerald-700">Receita Justa</h1>
          <nav className="flex gap-4">
            <Link href="/login" className="text-gray-600 hover:text-emerald-700 font-medium">
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-medium"
            >
              Cadastrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4 max-w-2xl">
          Transforme suas receitas em <span style={{ color: "#6B9B6B", fontWeight: 700 }}>lucro real</span>
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-xl">
          Calcule custos, defina preços e maximize sua margem de lucro com nossa plataforma inteligente.
        </p>
        <div className="flex gap-4">
          <Link
            href="/register"
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-emerald-700"
          >
            Começar grátis
          </Link>
          <Link
            href="/login"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-50"
          >
            Já tenho conta
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
          <div className="p-6 border rounded-xl text-left">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold text-lg mb-2">Calcule Custos</h3>
            <p className="text-gray-600 text-sm">
              Adicione ingredientes e produtos com preços atualizados para saber o custo real de cada receita.
            </p>
          </div>
          <div className="p-6 border rounded-xl text-left">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-lg mb-2">Defina Margens</h3>
            <p className="text-gray-600 text-sm">
              Descubra o preço ideal de venda e sua margem de lucro por receita.
            </p>
          </div>
          <div className="p-6 border rounded-xl text-left">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="font-semibold text-lg mb-2">Acompanhe Resultados</h3>
            <p className="text-gray-600 text-sm">
              Visualize relatórios e tome decisões para aumentar sua lucratividade.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-gray-500">
        © 2026 Receita Justa. Todos os direitos reservados.
      </footer>
    </div>
  );
}
