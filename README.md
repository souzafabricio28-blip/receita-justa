# Receita Justa

Gestão de custo e lucro de receitas para confeitaria, marmita e doceria.

App: https://receita-justa.vercel.app

## O que faz

- Cadastro de receitas, insumos, marcas e estoque (isolados por usuário)
- Custo da receita e custo por porção
- Importação por texto ou URL, busca de preços e cálculo de lucro (plano Premium)

## Planos

- **Básico** — grátis: receitas, produtos, custo automático e dashboard
- **Premium** — R$ 49,90/mês: importação com IA, preços de mercado e cálculo de lucro

## Desenvolvimento

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Nunca commite `.env`.
