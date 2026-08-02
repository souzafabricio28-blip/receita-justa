# Receita Justa — Contexto para Análise Gemini

## Stack
- **Next.js:** 16.2.7
- **React:** 19.2.4
- **Prisma:** ^7.8.0
- **Banco:** PostgreSQL (Neon)
- **Auth:** NextAuth v5 beta
- **AI:** Groq (llama3-70b)
- **Pagamento:** Mercado Pago
- **Deploy:** https://receita-justa.vercel.app

---
## Schema Prisma
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String         @id @default(cuid())
  name         String?
  email        String         @unique
  password     String
  plan         String         @default("basico")
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  subscription Subscription?
  recipes      Recipe[]
  calculations ProfitCalculation[]

  @@index([email])
  @@index([plan])
}

model Subscription {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  status         String   @default("active")
  plan           String   @default("basico")
  startDate      DateTime @default(now())
  endDate        DateTime?
  mpPreferenceId String?
  mpPaymentId    String?
  mpStatus       String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([mpPreferenceId])
}

model Category {
  id      String   @id @default(cuid())
  name    String   @unique
  slug    String   @unique
  recipes Recipe[]
}

model Brand {
  id        String   @id @default(cuid())
  name      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  products  Product[]

  @@index([name])
}

model ProductCategory {
  id       String    @id @default(cuid())
  name     String    @unique
  slug     String    @unique
  products Product[]

  @@index([slug])
}

model Recipe {
  id           String            @id @default(cuid())
  title        String
  description  String?
  categoryId   String?
  category     Category?         @relation(fields: [categoryId], references: [id])
  instructions String?
  imageUrl     String?
  yield        Int?              @default(1)
  isPremium    Boolean           @default(false)
  createdById  String
  createdBy    User              @relation(fields: [createdById], references: [id])
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt
  products     RecipeProduct[]
  calculations ProfitCalculation[]

  @@index([createdById])
  @@index([categoryId])
  @@index([createdById, createdAt])
}

model Product {
  id              String          @id @default(cuid())
  name            String
  unit            String          @default("un")
  averagePrice    Float?
  brandId         String?
  brand           Brand?          @relation(fields: [brandId], references: [id])
  categoryId      String?
  productCategory ProductCategory? @relation(fields: [categoryId], references: [id])
  recipes         RecipeProduct[]
  purchases       Purchase[]

  @@index([name])
  @@index([brandId])
  @@index([categoryId])
  @@index([name, unit])
}

model Purchase {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  quantity   Float    @default(0)
  totalPrice Float    @default(0)
  store      String?
  notes      String?
  date       DateTime @default(now())
  createdAt  DateTime @default(now())

  @@index([productId])
  @@index([productId, date])
  @@index([date])
}

model RecipeProduct {
  id        String  @id @default(cuid())
  recipeId  String
  recipe    Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Float   @default(0)

  @@unique([recipeId, productId])
  @@index([recipeId])
  @@index([productId])
}

model ProfitCalculation {
  id              String   @id @default(cuid())
  recipeId        String
  recipe          Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  productCost     Float    @default(0)
  packagingCost   Float    @default(0)
  transportCost   Float    @default(0)
  laborCost       Float    @default(0)
  feePercent      Float    @default(0)
  desiredMargin   Float    @default(0)
  suggestedPrice  Float    @default(0)
  profit          Float    @default(0)
  profitMargin    Float    @default(0)
  createdAt       DateTime @default(now())

  @@index([userId])
  @@index([recipeId])
  @@index([userId, createdAt])
}
```

---
## .env
```
DATABASE_URL="***"
NEXTAUTH_URL="https://receita-justa.vercel.app"
NEXTAUTH_SECRET="***"
OPENAI_API_KEY="***"
OPENAI_API_URL="https://openrouter.ai/api/v1/chat/completions"
AI_MODEL="openai/gpt-4o-mini"
GROQ_API_KEY="***"
# MERCADO_PAGO_ACCESS_TOKEN="TEST-3141567109910125-062808-ec34f4b84f71d514e24f29a652a14e18-134136431"
MERCADO_PAGO_WEBHOOK_SECRET="***"
```

---
## Rotas da API

### /api/auth/register
```typescript
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`register:${ip}`, 5, 5 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em alguns minutos." },
        { status: 429 }
      );
    }

    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato de email inválido" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Senha deve ter no mínimo 8 caracteres" },
        { status: 400 }
      );
    }

    if (name && name.length > 100) {
      return NextResponse.json(
        { error: "Nome muito longo (máximo 100 caracteres)" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      );
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
```

### /api/auth/[...nextauth]
```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

### /api/brands
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler, UnauthorizedError, ValidationError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(brands);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { name } = await request.json();
  if (!name?.trim()) throw new ValidationError("Nome da marca é obrigatório");

  const brand = await prisma.brand.create({
    data: { name: name.trim() },
  });
  return NextResponse.json(brand, { status: 201 });
});
```

### /api/calculations
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculationService } from "@/lib/services/calculation-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("calcProfit");
  if (planError) return planError;

  const { recipeId, suggestedPrice, packagingCost, transportCost, laborCost, feePercent, desiredMargin } = await request.json();
  const calculation = await calculationService.calculateProfit({
    recipeId,
    suggestedPrice,
    packagingCost,
    transportCost,
    laborCost,
    feePercent,
    desiredMargin,
    userId: session.user.id,
  });

  return NextResponse.json(calculation, { status: 201 });
});
```

### /api/categories
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { categoryService } from "@/lib/services/category-service";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const categories = await categoryService.list();
  return NextResponse.json(categories);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { name, slug } = await request.json();
  const category = await categoryService.create(name, slug);
  return NextResponse.json(category, { status: 201 });
});
```

### /api/categories/[id]
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { categoryService } from "@/lib/services/category-service";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";

export const PUT = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  const { name, slug } = await request.json();
  const category = await categoryService.update(id, name, slug);
  return NextResponse.json(category);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  await categoryService.delete(id);
  return NextResponse.json({ success: true });
});
```

### /api/chat
```typescript
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getUserContext } from "@/lib/services/chat-service";
import { requirePlan } from "@/lib/plan-check";
import { rateLimit } from "@/lib/rate-limit";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { groq } from "@ai-sdk/groq";

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENAI_API_KEY || "",
});

function extractText(msg: { role?: string; content?: string; parts?: { type: string; text: string }[] }) {
  const role = msg.role === "assistant" ? "assistant" : "user";
  let content = msg.content || "";
  if (!content && msg.parts) {
    content = msg.parts.filter((p) => p.type === "text").map((p) => p.text).join("\n");
  }
  return { role, content: content || "" } as const;
}

function getModel() {
  const provider = process.env.AI_PROVIDER || "openrouter";
  const modelName = process.env.AI_MODEL || "openai/gpt-4o-mini";

  if (provider === "groq") {
    return groq(modelName);
  }
  return openrouter.chat(modelName);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401 });
    }

    const rl = rateLimit(`chat:${session.user.id}`, 30, 60 * 1000);
    if (!rl.ok) {
      return new Response(JSON.stringify({ error: "Limite de mensagens excedido. Aguarde um momento." }), { status: 429 });
    }

    const planError = await requirePlan("assistant");
    if (planError) return planError;

    const body = await request.json();
    const rawMessages: unknown[] = body.messages || [];

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Mensagem obrigatória" }), { status: 400 });
    }

    const systemPrompt = await getUserContext(session.user.id);
    const messages = (rawMessages as { role?: string; content?: string; parts?: { type: string; text: string }[] }[]).map(extractText);

    const result = streamText({
      model: getModel(),
      system: systemPrompt || "Você é um assistente do sistema Receita Justa.",
      messages,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno do assistente" }),
      { status: 500 }
    );
  }
}
```

### /api/prices/search
```typescript
import { NextResponse } from "next/server";
import { searchProductPrice } from "@/lib/prices";
import { requirePlan } from "@/lib/plan-check";

export async function GET(request: Request) {
  const planError = await requirePlan("searchPrices");
  if (planError) return planError;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const brand = searchParams.get("brand");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!q) {
    return NextResponse.json({ error: "Parâmetro q é obrigatório" }, { status: 400 });
  }

  const location =
    lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))
      ? { lat: Number(lat), lng: Number(lng) }
      : null;

  const results = await searchProductPrice(q, location, brand || undefined);
  return NextResponse.json(
    { results },
    {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    }
  );
}
```

### /api/product-categories
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const categories = await productService.listCategories();
  return NextResponse.json(categories);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { name, slug } = await request.json();
  const category = await productService.createCategory(name, slug);
  return NextResponse.json(category, { status: 201 });
});
```

### /api/product-categories/[id]
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { withErrorHandler, UnauthorizedError } from "@/lib/errors";

export const PUT = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  const { name, slug } = await request.json();
  const category = await productService.updateCategory(id, name, slug);
  return NextResponse.json(category);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const { id } = await params;
  await productService.deleteCategory(id);
  return NextResponse.json({ success: true });
});
```

### /api/products
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const products = await productService.search(q || undefined, page);

  return NextResponse.json(products, {
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  });
});

export const POST = withErrorHandler(async (request: Request) => {
  const { name, unit, brandId, categoryId } = await request.json();
  const product = await productService.create({ name, unit, brandId, categoryId });
  return NextResponse.json(product, { status: 201 });
});

export const DELETE = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("deleteAllProducts");
  if (planError) return planError;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("all") !== "true") {
    return NextResponse.json({ error: "Parâmetro inválido" }, { status: 400 });
  }

  await productService.deleteAll();
  return NextResponse.json({ success: true });
});
```

### /api/products/[id]
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { withErrorHandler } from "@/lib/errors";

export const PATCH = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const allowedFields = ["name", "unit", "brandId", "averagePrice", "categoryId"];
  const data = Object.fromEntries(
    allowedFields.filter((f) => f in body).map((f) => [f, body[f]])
  );

  const product = await productService.update(id, data);
  return NextResponse.json(product);
});

export const DELETE = withErrorHandler(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await productService.delete(id);
  return NextResponse.json({ success: true });
});
```

### /api/purchases
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { productService } from "@/lib/services/product-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("purchases");
  if (planError) return planError;

  const { productId, quantity, totalPrice, store, notes } = await request.json();
  const purchase = await productService.recordPurchase(productId, quantity, totalPrice, store, notes);
  return NextResponse.json(purchase, { status: 201 });
});

export const GET = withErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const purchases = await productService.listPurchases(productId || undefined);
  return NextResponse.json(purchases);
});
```

### /api/recipes/import/from-url
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importService } from "@/lib/services/import-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("importUrl");
  if (planError) return planError;

  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }

  const result = await importService.parseFromUrl(url);
  return NextResponse.json(result);
});
```

### /api/recipes/import
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importService } from "@/lib/services/import-service";
import { requirePlan } from "@/lib/plan-check";
import { withErrorHandler } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const planError = await requirePlan("importText");
  if (planError) return planError;

  const { searchParams } = new URL(request.url);
  const forceFallback = searchParams.get("forceFallback") === "true";

  const { text } = await request.json();
  if (!text) {
    return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });
  }

  const result = await importService.parseText(text, forceFallback);
  return NextResponse.json(result);
});
```

### /api/recipes/import/save
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { shouldSkipCalculation } from "@/lib/conversions";
import { withErrorHandler, getSessionOrThrow, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

interface SaveIngredient {
  name: string;
  quantity: number;
  unit: string;
  productId?: string;
  productName?: string;
  averagePrice?: number;
  skipCalculation?: boolean;
}

export const POST = withErrorHandler(async (request: Request) => {
  const session = getSessionOrThrow(await auth());

  const { title, description, instructions, yield: recipeYield, ingredients } = await request.json();
  if (!title?.trim()) throw new ValidationError("Título é obrigatório");

  logger.info("Saving imported recipe", { title, ingredientCount: ingredients?.length });

  const recipe = await prisma.recipe.create({
    data: {
      title: title.trim(),
      description: description?.trim(),
      instructions: instructions?.trim(),
      yield: recipeYield || 1,
      createdById: session.user.id,
    },
  });

  if (Array.isArray(ingredients)) {
    for (const ing of ingredients as SaveIngredient[]) {
      if (shouldSkipCalculation(ing.name)) continue;

      let productId = ing.productId;

      if (!productId && ing.productName) {
        const existing = await prisma.product.findFirst({
          where: { name: { contains: ing.productName, mode: "insensitive" } },
        });
        productId = existing?.id;
      }

      if (!productId && ing.productName) {
        const created = await prisma.product.create({
          data: {
            name: ing.productName.trim(),
            unit: ing.unit || "un",
            averagePrice: 0,
          },
        });
        productId = created.id;
      }

      if (!productId) continue;

      if (ing.averagePrice && ing.averagePrice > 0) {
        await prisma.product.update({
          where: { id: productId },
          data: { averagePrice: ing.averagePrice },
        });
      }

      await prisma.recipeProduct.upsert({
        where: { recipeId_productId: { recipeId: recipe.id, productId } },
        update: { quantity: ing.quantity ?? 0 },
        create: { recipeId: recipe.id, productId, quantity: ing.quantity ?? 0 },
      });
    }
  }

  return NextResponse.json({ success: true, recipeId: recipe.id }, { status: 201 });
});
```

### /api/recipes
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeService } from "@/lib/services/recipe-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const session = getSessionOrThrow(await auth());
  const recipes = await recipeService.list(session.user.id);
  return NextResponse.json(recipes);
});

export const POST = withErrorHandler(async (request: Request) => {
  const session = getSessionOrThrow(await auth());
  const { title, description, instructions, yield: recipeYield } = await request.json();

  const recipe = await recipeService.create({
    title,
    description,
    instructions,
    yield: recipeYield,
    createdById: session.user.id,
  });

  return NextResponse.json(recipe, { status: 201 });
});
```

### /api/recipes/[id]/products
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeService } from "@/lib/services/recipe-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

function getLastPurchasePrice(purchases: { totalPrice: number; quantity: number }[]): number | null {
  if (purchases.length === 0) return null;
  const last = purchases[0];
  return last.quantity > 0 ? last.totalPrice / last.quantity : null;
}

export const POST = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const { productId, quantity } = await request.json();

  const result = await recipeService.addProduct(id, session.user.id, productId, quantity ?? 0);
  const enriched = {
    ...result,
    product: {
      ...result.product,
      realAveragePrice: getLastPurchasePrice(result.product.purchases || []),
      averagePrice: result.product.averagePrice,
      brand: result.product.brand,
      brandId: result.product.brandId,
    },
  };
  return NextResponse.json(enriched);
});

export const DELETE = withErrorHandler(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const { productId } = await request.json();

  await recipeService.removeProduct(id, session.user.id, productId);
  return NextResponse.json({ success: true });
});
```

### /api/recipes/[id]
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recipeService } from "@/lib/services/recipe-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const GET = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const recipe = await recipeService.getById(id, session.user.id);
  return NextResponse.json(recipe);
});

export const PUT = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  const body = await request.json();
  await recipeService.update(id, session.user.id, body);
  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = getSessionOrThrow(await auth());
  const { id } = await params;
  await recipeService.delete(id, session.user.id);
  return NextResponse.json({ success: true });
});
```

### /api/subscription/checkout
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { subscriptionService } from "@/lib/services/subscription-service";
import { withErrorHandler, getSessionOrThrow } from "@/lib/errors";

export const POST = withErrorHandler(async (request: Request) => {
  const session = getSessionOrThrow(await auth());

  const { plan } = await request.json();
  const result = await subscriptionService.createCheckout(session.user.id, plan);

  return NextResponse.json(result);
});
```

### /api/subscription/webhook
```typescript
import { NextResponse } from "next/server";
import { subscriptionService } from "@/lib/services/subscription-service";
import { withErrorHandler } from "@/lib/errors";

const processedIds = new Set<string>();
const IDEMPOTENCY_TTL = 5 * 60 * 1000;

setInterval(() => {
  processedIds.clear();
}, IDEMPOTENCY_TTL);

export const POST = withErrorHandler(async (request: Request) => {
  const bodyText = await request.text();
  const signature = request.headers.get("x-signature");
  const idempotencyKey = request.headers.get("x-idempotency-key");

  if (idempotencyKey) {
    if (processedIds.has(idempotencyKey)) {
      return NextResponse.json({ success: true, cached: true });
    }
    processedIds.add(idempotencyKey);
    setTimeout(() => processedIds.delete(idempotencyKey), IDEMPOTENCY_TTL);
  }

  const result = await subscriptionService.handleWebhook(bodyText, signature);
  if (!result.success) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: result.status });
  }

  return NextResponse.json({ success: true });
});
```

---
## Serviços (lib/services)

### calculation-service.ts
```typescript
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getRealAveragePrices } from "@/lib/cost";

export interface CalculateProfitInput {
  recipeId: string;
  suggestedPrice: number;
  packagingCost?: number;
  transportCost?: number;
  laborCost?: number;
  feePercent?: number;
  desiredMargin?: number;
  userId: string;
}

export const calculationService = {
  async calculateProfit(input: CalculateProfitInput) {
    const { recipeId, suggestedPrice, userId } = input;
    const packagingCost = input.packagingCost ?? 0;
    const transportCost = input.transportCost ?? 0;
    const laborCost = input.laborCost ?? 0;
    const feePercent = input.feePercent ?? 0;
    const desiredMargin = input.desiredMargin ?? 0;

    if (!recipeId) throw new ValidationError("recipeId é obrigatório");
    if (suggestedPrice <= 0) throw new ValidationError("Preço sugerido deve ser maior que zero");

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, createdById: userId },
      include: { products: { include: { product: true } } },
    });

    if (!recipe) throw new NotFoundError("Receita não encontrada");

    const productIds = recipe.products.map((rp) => rp.product.id);
    const priceMap = await getRealAveragePrices(productIds);

    const productCost = recipe.products.reduce((total, rp) => {
      const unitPrice = priceMap[rp.product.id] ?? 0;
      return total + unitPrice * rp.quantity;
    }, 0);

    const operationalCost = packagingCost + transportCost + laborCost;
    const totalCost = productCost + operationalCost;
    const feeDeduction = suggestedPrice * (feePercent / 100);
    const profit = suggestedPrice - totalCost - feeDeduction;
    const profitMargin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;

    logger.info("Profit calculated", {
      recipeId,
      productCost,
      packagingCost,
      transportCost,
      laborCost,
      feePercent,
      desiredMargin,
      totalCost,
      suggestedPrice,
      profit,
      profitMargin,
    });

    return prisma.profitCalculation.create({
      data: {
        recipeId,
        userId,
        productCost,
        packagingCost,
        transportCost,
        laborCost,
        feePercent,
        desiredMargin,
        suggestedPrice,
        profit,
        profitMargin,
      },
    });
  },

  async listByUser(userId: string) {
    return prisma.profitCalculation.findMany({
      where: { userId },
      include: { recipe: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    });
  },
};
```

### category-service.ts
```typescript
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError } from "@/lib/errors";

export const categoryService = {
  async list() {
    return prisma.category.findMany({
      include: { _count: { select: { recipes: true } } },
      orderBy: { name: "asc" },
    });
  },

  async create(name: string, slug: string) {
    if (!name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (!slug?.trim()) throw new ValidationError("Slug é obrigatório");

    logger.info("Creating category", { name, slug });
    return prisma.category.create({ data: { name: name.trim(), slug: slug.trim() } });
  },

  async update(id: string, name: string, slug: string) {
    logger.debug("Updating category", { categoryId: id, name, slug });
    return prisma.category.update({ where: { id }, data: { name, slug } });
  },

  async delete(id: string) {
    logger.info("Deleting category", { categoryId: id });
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundError("Categoria não encontrada");
    await prisma.category.delete({ where: { id } });
  },
};
```

### chat-service.ts
```typescript
import { prisma } from "@/lib/db";

export async function getUserContext(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      recipes: {
        include: {
          products: {
            include: {
              product: { include: { brand: true } },
            },
          },
          calculations: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        take: 30,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) return "";

  const recipeLines = user.recipes.map((r) => {
    const cost = r.products.reduce((s, rp) => s + (rp.product.averagePrice ?? 0) * rp.quantity, 0);
    const calc = r.calculations[0];
    const margin = calc ? `, margem: ${calc.profitMargin.toFixed(1)}%, lucro: R$ ${calc.profit.toFixed(2)}` : "";
    const ingredients = r.products.map((rp) => {
      const brandName = rp.product.brand?.name ? ` (${rp.product.brand.name})` : "";
      return `    - ${rp.quantity} ${rp.product.unit} ${rp.product.name}${brandName}`;
    }).join("\n");
    return `- **${r.title}** — R$ ${cost.toFixed(2)} custo${margin}\n${ingredients}`;
  }).join("\n\n");

  const planName = user.plan === "admin" ? "Administrador" : user.plan === "premium" ? "Premium" : "Básico";

  return `Você é o assistente inteligente do sistema "Receita Justa", uma plataforma de gestão de receitas culinárias.

## Contexto do usuário:
- Nome: ${user.name || "Usuário"}
- Plano: ${planName}
- Total de receitas cadastradas: ${user.recipes.length}

## Receitas do usuário:
${recipeLines || "Nenhuma receita cadastrada ainda."}

## O que o sistema faz:
- Cadastro de receitas com ingredientes, quantidades e marcas
- Cadastro de produtos com unidades métricas (kg, g, L, ml, un)
- Histórico de compras com preços reais por produto
- Cálculo de custo total por receita e por porção
- Pesquisa de preços de mercado na internet
- Comparação entre preço cadastrado e preço de mercado
- Cálculo de lucro com margem e preço sugerido
- Planos: Básico (R$29,90/mês) e Premium (R$49,90/mês)

## Orientações:
1. Responda SEMPRE em português brasileiro, de forma clara e amigável
2. Use os dados reais do usuário acima para dar conselhos personalizados
3. Quando perguntar sobre custos, lucros ou margens, faça referência às receitas do usuário
4. Sugira estratégias para reduzir custos ou melhorar a precificação
5. **Se o usuário pedir uma receita (ex: "me dê uma receita de torta de frango"), você DEVE retornar obrigatoriamente:**
   - Título claro da receita
   - Rendimento (ex: 8 porções)
   - Lista de ingredientes com quantidades precisas e estritamente no sistema métrico profissional (gramas, kg, ml, litros — nunca use xícaras ou colheres)
   - Modo de preparo estruturado em passos numerados
6. Para funcionalidades Premium, informe que estão disponíveis no plano Premium
7. Seja direto e objetivo, sem enrolação`;
}
```

### import-service.ts
```typescript
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { convertIngredient } from "@/lib/conversions";
import { ValidationError } from "@/lib/errors";

const API_KEY = process.env.OPENAI_API_KEY || "";
let API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
if (API_URL && !API_URL.endsWith("/chat/completions")) {
  API_URL = API_URL.replace(/\/+$/, "") + "/chat/completions";
}
const MODEL = process.env.AI_MODEL || "gpt-4o-mini";

interface RawIngredient {
  name: string;
  quantity: number;
  unit: string;
}

interface ParsedRecipe {
  title: string;
  description: string;
  instructions: string;
  yield: number;
  ingredients: RawIngredient[];
}

interface EnrichedIngredient extends RawIngredient {
  cleanName: string;
  convertedQuantity: number;
  convertedUnit: string;
  productId: string | null;
  productName: string | null;
  productPrice: number;
  productUnit: string;
  estimatedCost: number;
  skipCalculation: boolean;
}

export interface ImportResult {
  title: string;
  description: string;
  instructions: string;
  yield: number;
  ingredients: EnrichedIngredient[];
  hasProducts: boolean;
}

function enrichIngredients(
  ingredients: RawIngredient[],
  products: { id: string; name: string; unit: string; averagePrice: number }[]
): EnrichedIngredient[] {
  return ingredients.map((ing) => {
    const result = convertIngredient(ing.name, ing.quantity, ing.unit, products);
    return {
      name: result.name,
      quantity: result.quantity,
      unit: result.originalUnit,
      cleanName: result.cleanName,
      convertedQuantity: result.convertedQuantity,
      convertedUnit: result.convertedUnit,
      productId: result.productId,
      productName: result.productName,
      productPrice: result.productPrice,
      productUnit: result.productUnit,
      estimatedCost: result.estimatedCost,
      skipCalculation: result.skipCalculation,
    };
  });
}

export const importService = {
  async getProducts() {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, unit: true, averagePrice: true },
      orderBy: { name: "asc" },
    });
    return products.map((p) => ({ ...p, averagePrice: p.averagePrice ?? 0 }));
  },

  async parseText(text: string, forceFallback = false): Promise<ImportResult> {
    if (!text?.trim()) throw new ValidationError("Texto obrigatório");

    const products = await this.getProducts();
    const productList = products
      .map((p) => `- ${p.name} (${p.unit}, R$ ${(p.averagePrice ?? 0).toFixed(2).replace(".", ",")})`)
      .join("\n");

    let parsed: ParsedRecipe;

    if (forceFallback || !API_KEY) {
      parsed = fallbackParse(text);
    } else {
      parsed = await aiParse(text, productList);
    }

    const enriched = enrichIngredients(parsed.ingredients, products);

    return {
      ...parsed,
      ingredients: enriched,
      hasProducts: products.length > 0,
    };
  },

  async parseFromUrl(url: string): Promise<ImportResult> {
    if (!url?.trim()) throw new ValidationError("URL obrigatória");

    const blocked = ["tudogostoso.com.br", "www.tudogostoso.com.br"];
    const urlLower = url.toLowerCase();
    if (blocked.some((b) => urlLower.includes(b))) {
      throw new ValidationError("O site TudoGostoso não é suportado devido a bloqueios de acesso. Tente outra fonte (ex: Receiteria, Panelinha, Comida e Receitas).");
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new ValidationError("Não foi possível acessar a URL");

    const html = await response.text();
    const { load } = await import("cheerio");
    const $ = load(html);

    const title =
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim() ||
      "";

    const description = $('meta[name="description"]').attr("content")?.trim() || "";

    const instructionSelectors = [
      ".recipe-instructions",
      ".modo-de-preparo",
      ".instructions",
      ".preparation",
      ".recipe-steps",
      '[itemprop="recipeInstructions"]',
      ".entry-content",
    ];

    let instructions = "";
    for (const sel of instructionSelectors) {
      const el = $(sel);
      if (el.length) {
        instructions = el.text().trim();
        break;
      }
    }

    if (!instructions) {
      instructions = $("article").text().trim().substring(0, 3000);
    }

    const combinedText = [title, description, instructions].filter(Boolean).join("\n\n");
    return this.parseText(combinedText, true);
  },

};

async function aiParse(text: string, productList: string): Promise<ParsedRecipe> {
  const systemPrompt = `Você é um assistente especializado em extrair receitas de textos não estruturados.

Retorne APENAS UM JSON VÁLIDO (sem markdown, sem texto extra) no formato:
{
  "title": "Nome da Receita",
  "description": "Breve descrição",
  "instructions": "Modo de preparo completo em texto corrido com parágrafos",
  "yield": 4,
  "ingredients": [
    { "name": "Farinha de Trigo", "quantity": 1, "unit": "kg" },
    { "name": "Açúcar", "quantity": 500, "unit": "g" }
  ]
}

REGRAS:
- title: obrigatório, nome claro da receita
- description: opcional, breve resumo
- instructions: modo de preparo completo, texto corrido
- yield: número de porções (padrão 1 se não especificado)
- ingredients: array de objetos. Se a unidade não for explícita, INFIRA baseado no ingrediente:
  * Líquidos (leite, água, óleo, azeite, creme): use ml ou L
  * Sólidos: use g ou kg
  * Unidades contáveis: un, dente, ramo, folha
- NÃO use xícara, colher, copo como unidade - converta para gramas (sólidos) ou ml (líquidos) sempre
- NÃO inclua ingredientes "a gosto" como sal, pimenta, orégano, tempero, água, óleo para fritar (quantidade=0, unit="q.b.")
- ingredients.name: use o nome mais limpo e próximo do produto real
- EXEMPLO: "100 leite" → {"name": "Leite", "quantity": 100, "unit": "ml"}
- EXEMPLO: "2 xícaras de farinha" → {"name": "Farinha de Trigo", "quantity": 240, "unit": "g"}
- EXEMPLO: "1 colher de sopa de açúcar" → {"name": "Açúcar", "quantity": 12, "unit": "g"}

Produtos disponíveis no sistema do usuário para referência:
${productList}

Use esses nomes quando possível para facilitar o matching.`;

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Extraia a receita deste texto:\n\n${text}` },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  });

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "HTTP-Referer": process.env.NEXTAUTH_URL || "https://receita-justa.vercel.app",
    },
    body,
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    logger.warn("AI parse failed, falling back to local parser", { status: res.status });
    return fallbackParse(text);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    logger.warn("AI returned invalid JSON, using fallback");
    return fallbackParse(text);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || "",
      description: parsed.description || "",
      instructions: parsed.instructions || "",
      yield: parsed.yield || 1,
      ingredients: (parsed.ingredients || [])
        .filter((i: any) => i.name && typeof i.name === "string")
        .map((i: any) => ({
          name: i.name.trim(),
          quantity: typeof i.quantity === "number" ? i.quantity : 0,
          unit: i.unit || "un",
        })),
    };
  } catch {
    logger.warn("Failed to parse AI JSON, using fallback");
    return fallbackParse(text);
  }
}

// ─── Local Fallback Parser ──────────────────────────────────────────────────

function cleanText(s: string): string {
  return s
    .replace(/^de\s+|^da\s+|^do\s+|^das\s+|^dos\s+/i, "")
    .replace(/\*\*/g, "")
    .replace(/__(.*?)__/g, "$1")
    .replace(/[*`#]/g, "")
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .trim();
}

function parseQuantity(s: string): number {
  s = s.trim().replace(",", ".");
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const range = s.match(/^(\d+)\s*-\s*(\d+)/);
  if (range) return (Number(range[1]) + Number(range[2])) / 2;
  return Number(s) || 0;
}

const UNIT_MAP: Record<string, string> = {
  kg: "kg", quilo: "kg", quilos: "kg", kilo: "kg", kilos: "kg",
  g: "g", grama: "g", gramas: "g",
  l: "L", litro: "L", litros: "L",
  ml: "ml", mililitro: "ml", mililitros: "ml",
  un: "un", unidade: "un", unidades: "un", und: "un",
  cx: "cx", caixa: "cx", caixas: "cx", lata: "cx", latas: "cx",
  pct: "pct", pacote: "pct", pacotes: "pct", envelope: "pct", envelopes: "pct",
  dente: "un", dentes: "un",
  ramo: "un", ramos: "un",
  folha: "un", folhas: "un",
  pitada: "g", pitadas: "g",
  fatia: "un", fatias: "un",
};

const KNOWN_UNITS = Object.keys(UNIT_MAP);

const LIQUID_KEYWORDS = [
  "leite", "creme", "óleo", "oleo", "azeite", "água", "agua", "vinho",
  "vinagre", "shoyu", "molho", "caldo", "essência", "essencia",
  "extrato", "iogurte", "iorgute", "chantilly", "leite condensado",
  "leite em pó", "creme de leite",
];

function inferUnit(name: string, quantity: number): string {
  const lower = name.toLowerCase();
  if (LIQUID_KEYWORDS.some((k) => lower.includes(k))) {
    return quantity >= 3 ? "L" : "ml";
  }
  return quantity >= 3 ? "g" : "un";
}

const BULLET_RE = /^[-•*∙●◦‣⁃⁌⁍]\s*/;

function isBulletLine(line: string): boolean {
  return /^[-•*∙●◦‣⁃⁌⁍]\s/.test(line) || /^\d/.test(line) || /^\d+\//.test(line);
}

function parseIngredientLine(line: string): RawIngredient | null {
  const clean = line.replace(BULLET_RE, "").trim();
  if (!clean) return null;

  const unitPattern = KNOWN_UNITS.join("|");
  const regex = new RegExp(
    `^(?:([\\d.,/\\s]+?))\\s*(?:(${unitPattern})\\s+)?(.+)$`,
    "i"
  );

  const match = clean.match(regex);
  if (match) {
    let qty = parseQuantity(match[1]);
    let unit = match[2] ? UNIT_MAP[match[2].toLowerCase()] || match[2] : inferUnit(match[3] || clean, qty);
    let name = match[3]?.trim() || clean;
    name = cleanText(name);
    if (!name) return null;
    return { name, quantity: qty || 1, unit };
  }

  const simpleUnit = clean.match(new RegExp(`^(\\d+)\\s+(${unitPattern})\\s+(.+)$`, "i"));
  if (simpleUnit) {
    return {
      name: cleanText(simpleUnit[3]),
      quantity: Number(simpleUnit[1]) || 1,
      unit: UNIT_MAP[simpleUnit[2].toLowerCase()] || simpleUnit[2],
    };
  }

  const name = cleanText(clean);
  if (!name) return null;
  return { name, quantity: 1, unit: "un" };
}

function fallbackParse(text: string): ParsedRecipe {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const ingMarkers = ["ingrediente", "ingredientes:", "ingredientes\n", "ingredientes\r"];
  const prepMarkers = [
    "modo de preparo", "preparo:", "instruções", "instrucoes",
    "modo de fazer:", "como fazer", "preparação", "modo de preparo:",
  ];

  let ingStart = -1;
  let prepStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (prepStart === -1 && prepMarkers.some((m) => lower.includes(m))) {
      prepStart = i;
    }
    if (ingStart === -1 && ingMarkers.some((m) => lower.includes(m))) {
      ingStart = i;
    }
  }

  const ingredientLines: string[] = [];
  if (ingStart !== -1) {
    const end = prepStart !== -1 && prepStart > ingStart ? prepStart : lines.length;
    for (let i = ingStart + 1; i < end; i++) {
      const l = lines[i];
      if (prepMarkers.some((m) => l.toLowerCase().includes(m))) break;
      if (isBulletLine(l)) {
        ingredientLines.push(l);
      }
    }
  }

  if (ingredientLines.length === 0) {
    for (const l of lines) {
      if (ingMarkers.some((m) => l.toLowerCase().includes(m))) continue;
      if (prepMarkers.some((m) => l.toLowerCase().includes(m))) break;
      if (/^[-•*∙●◦‣⁃⁌⁍]\s/.test(l)) {
        ingredientLines.push(l);
      }
    }
  }

  const ingredients = ingredientLines
    .map(parseIngredientLine)
    .filter((x): x is RawIngredient => x !== null);

  const titleLine = lines.find((l) => {
    const lower = l.toLowerCase();
    return !ingMarkers.some((m) => lower.includes(m))
      && !prepMarkers.some((m) => lower.includes(m))
      && !/^[-•*]\s/.test(l)
      && !/^\d/.test(l)
      && l.length > 3;
  });

  const title = titleLine ? cleanText(titleLine) : lines[0] || "";

  let instructions = "";
  if (prepStart !== -1) {
    instructions = lines.slice(prepStart + 1)
      .filter((l) => !ingMarkers.some((m) => l.toLowerCase().includes(m)))
      .join("\n")
      .trim();
  }

  if (!instructions && ingStart !== -1) {
    const beforeIng = lines.slice(0, ingStart).filter(
      (l) => l !== titleLine && !ingMarkers.some((m) => l.toLowerCase().includes(m))
    );
    const afterPrep = prepStart !== -1
      ? lines.slice(prepStart + 1)
      : [];
    instructions = [...beforeIng, ...afterPrep].join("\n").trim();
  }

  return { title, description: "", instructions, yield: 1, ingredients };
}
```

### product-service.ts
```typescript
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export interface CreateProductInput {
  name: string;
  unit?: string;
  brandId?: string;
  categoryId?: string;
}

export interface BrandOption {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

export const productService = {
  async search(query?: string, page = 1) {
    const where = query
      ? { name: { contains: query, mode: "insensitive" as const } }
      : {};

    logger.debug("Searching products", { query, page });
    return prisma.product.findMany({
      where,
      include: { brand: true, purchases: { orderBy: { date: "desc" } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  },

  async create(input: CreateProductInput) {
    if (!input.name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (input.name.length > 200) throw new ValidationError("Nome muito longo (máximo 200 caracteres)");

    logger.info("Creating product", { name: input.name, brandId: input.brandId });
    return prisma.product.create({
      data: {
        name: input.name.trim(),
        unit: input.unit || "un",
        brandId: input.brandId?.trim() || null,
        categoryId: input.categoryId?.trim() || null,
      },
      include: { purchases: { orderBy: { date: "desc" } } },
    });
  },

  async update(id: string, input: Partial<CreateProductInput>) {
    logger.debug("Updating product", { productId: id, ...input });
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.unit !== undefined) data.unit = input.unit;
    if (input.brandId !== undefined) data.brandId = input.brandId;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    return prisma.product.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    logger.info("Deleting product", { productId: id });
    await prisma.product.delete({ where: { id } });
  },

  async deleteAll() {
    logger.warn("Deleting ALL products");
    await prisma.$transaction([
      prisma.purchase.deleteMany(),
      prisma.recipeProduct.deleteMany(),
      prisma.product.deleteMany(),
    ]);
  },

  async recordPurchase(
    productId: string,
    quantity: number,
    totalPrice: number,
    store?: string,
    notes?: string
  ) {
    if (quantity <= 0) throw new ValidationError("Quantidade deve ser maior que zero");
    if (totalPrice < 0) throw new ValidationError("Preço total não pode ser negativo");

    logger.info("Recording purchase", { productId, quantity, totalPrice, store });
    return prisma.purchase.create({
      data: { productId, quantity, totalPrice, store, notes },
    });
  },

  async listBrands() {
    return prisma.brand.findMany({
      orderBy: { name: "asc" },
    });
  },

  async listCategories() {
    return prisma.productCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
  },

  async createCategory(name: string, slug: string) {
    if (!name?.trim()) throw new ValidationError("Nome é obrigatório");
    if (!slug?.trim()) throw new ValidationError("Slug é obrigatório");
    return prisma.productCategory.create({ data: { name: name.trim(), slug: slug.trim() } });
  },

  async updateCategory(id: string, name: string, slug: string) {
    return prisma.productCategory.update({ where: { id }, data: { name, slug } });
  },

  async deleteCategory(id: string) {
    const cat = await prisma.productCategory.findUnique({ where: { id } });
    if (!cat) throw new ValidationError("Categoria não encontrada");
    await prisma.productCategory.delete({ where: { id } });
  },

  async listPurchases(productId?: string) {
    const where = productId ? { productId } : {};
    return prisma.purchase.findMany({
      where,
      include: { product: true },
      orderBy: { date: "desc" },
      take: 100,
    });
  },
};
```

### recipe-service.ts
```typescript
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError, ValidationError } from "@/lib/errors";

export interface CreateRecipeInput {
  title: string;
  description?: string;
  instructions?: string;
  yield?: number;
  createdById: string;
}

export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  instructions?: string;
  yield?: number;
  categoryId?: string;
  imageUrl?: string;
}

const ALLOWED_UPDATE_FIELDS = ["title", "description", "instructions", "yield", "categoryId", "imageUrl"];

export const recipeService = {
  async list(userId: string) {
    logger.debug("Listing recipes", { userId });
    return prisma.recipe.findMany({
      where: { createdById: userId },
      include: {
        products: { include: { product: { include: { brand: true } } } },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getById(id: string, userId: string) {
    logger.debug("Getting recipe", { recipeId: id, userId });
    const recipe = await prisma.recipe.findFirst({
      where: { id, createdById: userId },
      include: {
        products: { include: { product: { include: { brand: true } } } },
        category: true,
      },
    });

    if (!recipe) throw new NotFoundError("Receita não encontrada");
    return recipe;
  },

  async create(input: CreateRecipeInput) {
    if (!input.title?.trim()) throw new ValidationError("Título é obrigatório");

    logger.info("Creating recipe", { title: input.title, userId: input.createdById });
    return prisma.recipe.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim(),
        instructions: input.instructions?.trim(),
        yield: input.yield || 1,
        createdById: input.createdById,
      },
    });
  },

  async update(id: string, userId: string, input: UpdateRecipeInput) {
    await this.getById(id, userId);

    const data = Object.fromEntries(
      ALLOWED_UPDATE_FIELDS
        .filter((f) => f in input)
        .map((f) => [f, input[f as keyof UpdateRecipeInput]])
    );

    logger.info("Updating recipe", { recipeId: id, fields: Object.keys(data) });
    return prisma.recipe.updateMany({
      where: { id, createdById: userId },
      data,
    });
  },

  async delete(id: string, userId: string) {
    await this.getById(id, userId);

    logger.info("Deleting recipe", { recipeId: id, userId });
    await prisma.recipe.deleteMany({
      where: { id, createdById: userId },
    });
  },

  async addProduct(recipeId: string, userId: string, productId: string, quantity: number) {
    await this.getById(recipeId, userId);

    logger.debug("Adding product to recipe", { recipeId, productId, quantity });
    return prisma.recipeProduct.upsert({
      where: { recipeId_productId: { recipeId, productId } },
      update: { quantity },
      create: { recipeId, productId, quantity },
      include: {
        product: {
          include: {
            brand: true,
            purchases: { orderBy: { date: "desc" } },
          },
        },
      },
    });
  },

  async removeProduct(recipeId: string, userId: string, productId: string) {
    await this.getById(recipeId, userId);

    logger.debug("Removing product from recipe", { recipeId, productId });
    await prisma.recipeProduct.deleteMany({
      where: { recipeId, productId },
    });
  },
};
```

### subscription-service.ts
```typescript
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";
import { PLANS } from "@/lib/plans";

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

export const subscriptionService = {
  async createCheckout(userId: string, plan: string) {
    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) throw new ValidationError("Plano inválido");

    logger.info("Creating subscription checkout", { userId, plan });

    if (!MP_ACCESS_TOKEN) {
      await prisma.subscription.upsert({
        where: { userId },
        update: { plan: "premium", status: "active", startDate: new Date() },
        create: { userId, plan: "premium", status: "active" },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { plan: "premium" },
      });

      return { url: "/dashboard/subscription?upgraded=true" };
    }

    const preference = {
      items: [{
        id: plan,
        title: `Receita Justa - Plano ${planConfig.label}`,
        description: `Plano ${planConfig.label} - Acesso a todos os recursos`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: planConfig.price,
      }],
      back_urls: {
        success: `${process.env.NEXTAUTH_URL}/dashboard/subscription?success=true`,
        failure: `${process.env.NEXTAUTH_URL}/dashboard/subscription?failure=true`,
        pending: `${process.env.NEXTAUTH_URL}/dashboard/subscription?pending=true`,
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXTAUTH_URL}/api/subscription/webhook`,
      metadata: { userId, plan },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      logger.error("Mercado Pago preference creation failed", { error: err });
      throw new ValidationError("Erro ao criar pagamento no Mercado Pago");
    }

    const data = await mpRes.json();

    await prisma.subscription.upsert({
      where: { userId },
      update: { mpPreferenceId: data.id, plan: "premium", status: "pending" },
      create: { userId, plan: "premium", status: "pending", mpPreferenceId: data.id },
    });

    return { url: data.init_point };
  },

  async handleWebhook(bodyText: string, signature: string | null) {
    if (!this.verifySignature(bodyText, signature ?? null)) {
      logger.warn("Invalid webhook signature");
      return { success: false, status: 401 };
    }

    const body = JSON.parse(bodyText);
    const { type, data } = body;

    if (type === "payment" && data?.id && MP_ACCESS_TOKEN) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpRes.ok) {
        logger.error("Failed to query Mercado Pago payment", { paymentId: data.id });
        return { success: false, status: 500 };
      }

      const payment = await mpRes.json();
      const userId = payment.metadata?.userId;
      const plan = payment.metadata?.plan || "premium";
      const isApproved = payment.status === "approved";

      if (userId && isApproved) {
        logger.info("Activating subscription from webhook", { userId, plan, paymentId: payment.id });

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            status: "active",
            plan,
            mpPaymentId: String(payment.id),
            mpStatus: payment.status,
            startDate: new Date(),
          },
          create: {
            userId,
            plan,
            status: "active",
            mpPaymentId: String(payment.id),
            mpStatus: payment.status,
          },
        });

        await prisma.user.update({
          where: { id: userId },
          data: { plan: "premium" },
        });
      }
    }

    return { success: true, status: 200 };
  },

  verifySignature(body: string, signature: string | null): boolean {
    if (!MP_WEBHOOK_SECRET) return false;

    const parts = Object.fromEntries(
      (signature || "").split(",").map((p) => {
        const [k, v] = p.trim().split("=");
        return [k?.trim(), v?.trim()];
      })
    );

    const ts = parts["ts"];
    const v1 = parts["v1"];
    if (!ts || !v1) return false;

    const manifest = `${ts}.${body}`;
    const hmac = createHmac("sha256", MP_WEBHOOK_SECRET)
      .update(manifest)
      .digest("hex");

    return hmac === v1;
  },
};
```

---
## Hooks (lib/hooks)

### use-category-assign.ts
```typescript
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";

interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

export function useCategoryAssign(recipeId: string, initialCategoryId: string) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryId);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  async function assignCategory(categoryId: string) {
    setAssigning(true);
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: categoryId || null }),
      });
      if (res.ok) {
        setSelectedCategory(categoryId);
        if (categoryId) toast("Categoria atualizada", "success");
      }
    } catch {
      toast("Erro ao atualizar categoria", "error");
    } finally {
      setAssigning(false);
    }
  }

  return { categories, selectedCategory, assigning, assignCategory, setCategories };
}
```

### use-profit-calculation.ts
```typescript
"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface CalcData {
  createdAt: string;
  profit: number;
  profitMargin: number;
  suggestedPrice: number;
}

interface SaveData {
  suggestedPrice: number;
  packagingCost: number;
  transportCost: number;
  laborCost: number;
  feePercent: number;
  desiredMargin: number;
}

export function useProfitCalculation(recipeId: string, initialCalc: CalcData | null) {
  const [showModal, setShowModal] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [lastCalc, setLastCalc] = useState<CalcData | null>(initialCalc);
  const { toast } = useToast();

  async function calculateProfit(data: SaveData) {
    setCalculating(true);
    try {
      const res = await fetch("/api/calculations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId, ...data }),
      });
      if (res.ok) {
        const calcData = await res.json();
        setLastCalc(calcData);
        setShowModal(false);
        toast("Lucro calculado!", "success");
      } else {
        const err = await res.json();
        toast(err.error || "Erro ao calcular lucro", "error");
      }
    } catch {
      toast("Erro ao calcular lucro", "error");
    } finally {
      setCalculating(false);
    }
  }

  return {
    showModal,
    setShowModal,
    calculating,
    lastCalc,
    calculateProfit,
  };
}
```

### use-recipe-products.ts
```typescript
"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface BrandInfo {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
  brand: BrandInfo | null;
  brandId: string | null;
}

interface RecipeProductData {
  id: string;
  quantity: number;
  product: ProductData;
}

export function useRecipeProducts(recipeId: string, initialProducts: RecipeProductData[]) {
  const [products, setProducts] = useState(initialProducts);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pricesMap, setPricesMap] = useState<Record<string, { title: string; price: number; store: string; url: string }[]>>({});
  const [loadingPrices, setLoadingPrices] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  function getPrice(rp: RecipeProductData): number {
    return rp.product.realAveragePrice ?? rp.product.averagePrice ?? 0;
  }

  function getScaledCost(rp: RecipeProductData, scale: number): number {
    return getPrice(rp) * rp.quantity * scale;
  }

  const custoReal = (scale: number) => products.reduce((sum, rp) => sum + getScaledCost(rp, scale), 0);
  const hasRealPrices = products.some((rp) => rp.product.realAveragePrice !== null);

  function marketTotalCost(scale: number): number {
    return products.reduce((sum, rp) => {
      const prices = pricesMap[rp.product.id];
      if (!prices || prices.length === 0) return sum + getPrice(rp) * rp.quantity * scale;
      const avg = prices.reduce((s, p) => s + p.price, 0) / prices.length;
      return sum + avg * rp.quantity * scale;
    }, 0);
  }

  async function searchProductPrice(productId: string, productName: string, brandName?: string) {
    setLoadingPrices((prev) => ({ ...prev, [productId]: true }));
    try {
      const params = new URLSearchParams({ q: productName });
      if (brandName) params.set("brand", brandName);
      const res = await fetch(`/api/prices/search?${params}`);
      const data = await res.json();
      setPricesMap((prev) => ({ ...prev, [productId]: data.results || [] }));
    } catch {
      // Silently fail
    } finally {
      setLoadingPrices((prev) => ({ ...prev, [productId]: false }));
    }
  }

  async function addProduct(productId: string, quantity: number) {
    try {
      const res = await fetch(`/api/recipes/${recipeId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      if (res.ok) {
        const rp = await res.json();
        setProducts((prev) => [...prev, rp]);
        toast("Ingrediente adicionado!", "success");
      }
    } catch {
      toast("Erro ao adicionar ingrediente", "error");
    }
  }

  async function removeProduct(productId: string) {
    setRemovingId(productId);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/products`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((rp) => rp.product.id !== productId));
        toast("Ingrediente removido", "info");
      }
    } catch {
      toast("Erro ao remover ingrediente", "error");
    } finally {
      setRemovingId(null);
    }
  }

  return {
    products,
    pricesMap,
    loadingPrices,
    removingId,
    custoReal,
    marketTotalCost,
    hasRealPrices,
    searchProductPrice,
    addProduct,
    removeProduct,
  };
}
```

---
## Componentes

### AddProductSearch.tsx
```tsx
"use client";

import { useState, useEffect, useRef } from "react";

interface Brand {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
  brand: Brand | null;
  brandId: string | null;
}

export function AddProductSearch({
  existingProductIds,
  onAdd,
}: {
  existingProductIds: string[];
  onAdd: (productId: string, quantity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ProductData[]>([]);
  const [searching, setSearching] = useState(false);
  const [addQty, setAddQty] = useState<Record<string, number>>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductData | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchResults([]);
        setSelectedProduct(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!searchTerm.trim() || !open) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(searchTerm)}`);
        const data = await res.json();
        setSearchResults(data.filter((p: ProductData) => !existingProductIds.includes(p.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, existingProductIds, open]);

  function handleSelect(product: ProductData) {
    setSelectedProduct(product);
  }

  async function handleAdd(productId: string) {
    const qty = addQty[productId] || 1;
    setAddingId(productId);
    await onAdd(productId, qty);
    setAddingId(null);
    setSearchResults([]);
    setSearchTerm("");
    setSelectedProduct(null);
    setAddQty({});
    setOpen(false);
  }

  function handleBack() {
    setSelectedProduct(null);
  }

  if (open && selectedProduct) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={handleBack}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm text-gray-500">Selecionar outro produto</span>
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
              {selectedProduct.brand && (
                <p className="text-xs text-gray-500">Marca: <span className="font-medium text-gray-700">{selectedProduct.brand.name}</span></p>
              )}
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Quantidade</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={addQty[selectedProduct.id] || ""}
                  onChange={(e) => setAddQty((prev) => ({ ...prev, [selectedProduct.id]: Number(e.target.value) || 0 }))}
                  placeholder="Qtd"
                  className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm"
                />
                <span className="text-sm font-medium text-gray-600">{selectedProduct.unit}</span>
              </div>
            </div>
            <button
              onClick={() => handleAdd(selectedProduct.id)}
              disabled={addingId === selectedProduct.id}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingId === selectedProduct.id ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Adicionando...
                </span>
              ) : "Adicionar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md ${
          open
            ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
            : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
        }`}
      >
        {open ? "Cancelar" : "+ Adicionar Ingrediente"}
      </button>

      {open && (
        <div ref={searchRef} className="relative mt-4">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto por nome..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm"
              autoFocus
            />
          </div>
          {(searchResults.length > 0 || searching) && (
            <div className="absolute z-10 top-full mt-1.5 w-full bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-200/50 max-h-72 overflow-y-auto">
              {searching ? (
                <div className="p-5 text-sm text-gray-400 text-center">
                  <span className="inline-block animate-pulse">Buscando...</span>
                </div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className="w-full flex items-center gap-3 p-3.5 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 border-b border-gray-50 last:border-0 transition-all text-left group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-700 transition-colors">{p.name}</span>
                        {p.brand && (
                          <span className="text-xs text-gray-400 font-normal">({p.brand.name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{p.unit}</span>
                        {p.realAveragePrice !== null ? (
                          <span className="text-xs font-medium text-emerald-600">R$ {p.realAveragePrice.toFixed(2).replace(".", ",")}/{p.unit}</span>
                        ) : p.averagePrice !== null ? (
                          <span className="text-xs text-gray-400">R$ {p.averagePrice.toFixed(2).replace(".", ",")}/{p.unit}</span>
                        ) : null}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### chat/ChatWidget.tsx
```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { useToast } from "@/components/ui/toast";

export function ChatWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat" }),
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", text: "Olá! Sou o assistente da **Receita Justa**. Pergunte sobre suas receitas, custos, margens, ou peça uma receita nova! 😊" }],
      },
    ],
  });

  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const isLoading = status === "streaming" || status === "submitted";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput("");
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="bg-white rounded-2xl w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-10rem)] flex flex-col shadow-2xl border border-gray-200 mb-4">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-t-2xl px-5 py-4 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" /></svg>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Assistente IA</p>
                <p className="text-xs text-emerald-100/80">Receita Justa</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${(msg.role as string) === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  (msg.role as string) === "user"
                    ? "bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-br-md shadow-sm"
                    : "bg-white text-gray-800 rounded-bl-md shadow-sm border border-gray-100"
                }`}>
                  <div className="prose prose-sm max-w-none">
                    {msg.parts?.map((part, j) =>
                      part.type === "text"
                        ? <div key={j} className={`whitespace-pre-wrap ${j > 0 ? "mt-1.5" : ""}`}>{part.text}</div>
                        : null
                    )}
                  </div>
                  {(msg.role as string) === "assistant" && msg.id !== "welcome" && (
                    <button
                      onClick={async () => {
                        const text = msg.parts?.filter(p => p.type === "text").map(p => p.text).join("\n") || "";
                        if (!text.trim()) return;
                        setSavingId(msg.id);
                        try {
                          const res = await fetch("/api/recipes/import", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text }),
                          });
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({}));
                            toast(err.error || "Erro ao processar receita", "error");
                            setSavingId(null);
                            return;
                          }
                          const data = await res.json();
                          sessionStorage.setItem("import_recipe_data", JSON.stringify(data));
                          if (!data.ingredients?.length) {
                            sessionStorage.setItem("import_recipe_text", text);
                          } else {
                            sessionStorage.removeItem("import_recipe_text");
                          }
                          setSavingId(null);
                          router.push("/dashboard/recipes/import");
                        } catch {
                          toast("Erro ao conectar. Tente novamente.", "error");
                          setSavingId(null);
                        }
                      }}
                      disabled={savingId === msg.id}
                      className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      {savingId === msg.id ? "⏳ Processando..." : "📥 Salvar Receita"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (messages[messages.length - 1]?.role as string) === "user" && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 text-sm text-gray-400 border border-gray-100 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-xs text-red-600">
                  {error.message || error.toString?.() || "Erro de conexão. Tente novamente."}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua dúvida..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 hover:bg-white transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                )}
                {isLoading ? "" : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
          title="Abrir assistente"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      )}
    </div>
  );
}
```

### chat/ChatWidgetDynamic.tsx
```tsx
"use client";

import dynamic from "next/dynamic";

const ChatWidget = dynamic(
  () => import("@/components/chat/ChatWidget").then((m) => m.ChatWidget),
  { ssr: false }
);

export function ChatWidgetDynamic() {
  return <ChatWidget />;
}
```

### CostSummary.tsx
```tsx
"use client";

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
}

interface RecipeProductData {
  id: string;
  quantity: number;
  product: ProductData;
}

function getPrice(rp: RecipeProductData): number {
  return rp.product.realAveragePrice ?? rp.product.averagePrice ?? 0;
}

function calcTotals(products: RecipeProductData[], scale: number) {
  const byUnit: Record<string, { total: number; count: number }> = {};
  let custoManual = 0;
  let custoReal = 0;

  for (const rp of products) {
    const qty = rp.quantity * scale;
    custoManual += (rp.product.averagePrice ?? 0) * qty;
    custoReal += getPrice(rp) * qty;
    const unit = rp.product.unit;
    if (!byUnit[unit]) byUnit[unit] = { total: 0, count: 0 };
    byUnit[unit].total += qty;
    byUnit[unit].count++;
  }

  return { custoManual, custoReal, byUnit };
}

export function CostSummary({
  products,
  scale,
  portions,
  hasRealPrices,
}: {
  products: RecipeProductData[];
  scale: number;
  portions: number;
  hasRealPrices: boolean;
}) {
  const { custoManual, custoReal, byUnit } = calcTotals(products, scale);
  const costPerPortionReal = custoReal / portions;

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-xs text-gray-500 mb-1">Custo ({hasRealPrices ? "compras" : "manual"})</p>
          <p className="text-xl font-bold text-gray-900">R$ {custoReal.toFixed(2).replace(".", ",")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-purple-100 text-purple-600 mb-2">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-xs text-gray-500 mb-1">Custo / porção</p>
          <p className="text-xl font-bold text-gray-900">R$ {costPerPortionReal.toFixed(2).replace(".", ",")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-600 mb-2">
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <p className="text-xs text-gray-500 mb-1">Rendimento</p>
          <p className="text-xl font-bold text-gray-900">{portions} porções</p>
        </div>
      </div>

      {hasRealPrices && custoManual !== custoReal && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-xl text-sm mb-6 flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-amber-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Custo manual: <strong>R$ {custoManual.toFixed(2).replace(".", ",")}</strong>
          </span>
          <span className="text-amber-700 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Custo real (compras): <strong>R$ {custoReal.toFixed(2).replace(".", ",")}</strong>
          </span>
          <span className={`font-medium ${custoReal > custoManual ? "text-red-600" : "text-emerald-600"}`}>
            ({(((custoReal - custoManual) / custoManual) * 100).toFixed(0)}% vs manual)
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(byUnit).map(([unit, { total }]) => {
          const icons: Record<string, string> = { kg: "⚖️", g: "⚖️", L: "🧴", ml: "🧴", un: "📦" };
          const label: Record<string, string> = { kg: "Peso total", g: "Peso total", L: "Volume total", ml: "Volume total", un: "Unidades" };
          return (
            <div key={unit} className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow">
              <span className="text-lg">{icons[unit] || "📏"}</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">{total.toFixed(2).replace(".", ",")} {unit}</p>
              <p className="text-emerald-600 text-xs">{label[unit] || unit}</p>
            </div>
          );
        })}
      </div>
    </>
  );
}
```

### dashboard/AnalyticsCharts.tsx
```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

export type ChartDataItem = {
  name: string;
  custoTotal: number;
  lucroLiquido: number;
};

export function AnalyticsCharts({ data }: { data: ChartDataItem[] }) {
  if (data.length === 0) return null;

  const top5 = [...data]
    .sort((a, b) => b.lucroLiquido - a.lucroLiquido)
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Top 5 Receitas — Custo vs Lucro
      </h2>
      <p className="text-xs text-gray-400 mb-6">Comparativo entre custo total e lucro líquido por receita</p>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={top5} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              fontSize: 13,
            }}
            formatter={(value, name) => [
              `R$ ${Number(value).toFixed(2)}`,
              name === "custoTotal" ? "Custo Total" : "Lucro Líquido",
            ]}
          />
          <Bar dataKey="custoTotal" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {top5.map((_, i) => (
              <Cell key={`c-${i}`} fill="#94a3b8" />
            ))}
          </Bar>
          <Bar dataKey="lucroLiquido" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {top5.map((_, i) => (
              <Cell key={`l-${i}`} fill="#10b981" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-gray-400" />
          Custo Total
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Lucro Líquido
        </span>
      </div>
    </div>
  );
}
```

### IngredientTable.tsx
```tsx
"use client";

interface Brand {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
  realAveragePrice: number | null;
  brand: Brand | null;
  brandId: string | null;
}

interface RecipeProductData {
  id: string;
  quantity: number;
  product: ProductData;
}

interface PriceResult {
  title: string;
  price: number;
  store: string;
  url: string;
}

function getPrice(rp: RecipeProductData): number {
  return rp.product.realAveragePrice ?? rp.product.averagePrice ?? 0;
}

function PriceBadge({ userPrice, marketPrice }: { userPrice: number; marketPrice: number }) {
  if (userPrice === 0) return null;
  const diff = marketPrice > 0 ? ((userPrice - marketPrice) / marketPrice) * 100 : 0;
  const isAbove = diff > 5;
  const isBelow = diff < -5;
  if (!isAbove && !isBelow) return <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>mercado</span>;
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${isAbove ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
      {isAbove ? `+${diff.toFixed(0)}% acima` : `${diff.toFixed(0)}% abaixo`}
    </span>
  );
}

function MarketPrices({ prices }: { prices: PriceResult[] }) {
  if (!prices.length) return null;
  return (
    <details className="text-xs mt-1.5">
      <summary className="cursor-pointer text-emerald-600 hover:text-emerald-700 hover:underline font-medium">
        {prices.length} preço{prices.length > 1 ? "s" : ""} online
      </summary>
      <div className="mt-1.5 space-y-1 bg-gray-50 rounded-lg p-2">
        {prices.map((p, i) => (
          <div key={i} className="flex justify-between text-gray-500">
            <span className="truncate max-w-[120px]">{p.title.slice(0, 30)}</span>
            <span className="font-medium text-gray-700">R$ {p.price.toFixed(2).replace(".", ",")}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

export function IngredientTable({
  products,
  scale,
  pricesMap,
  loadingPrices,
  removingId,
  onSearchPrice,
  onRemove,
  kitchenMode,
}: {
  products: RecipeProductData[];
  scale: number;
  pricesMap: Record<string, PriceResult[]>;
  loadingPrices: Record<string, boolean>;
  removingId: string | null;
  onSearchPrice: (productId: string, productName: string) => void;
  onRemove: (productId: string) => void;
  kitchenMode?: boolean;
}) {
  if (products.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-8">Nenhum ingrediente adicionado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="pb-3 font-medium">Produto</th>
              <th className="pb-3 font-medium">Quantidade</th>
              {!kitchenMode && <th className="pb-3 font-medium">Preço</th>}
              {!kitchenMode && <th className="pb-3 font-medium">Real (compras)</th>}
              {!kitchenMode && <th className="pb-3 font-medium">Mercado</th>}
              {!kitchenMode && <th className="pb-3 font-medium">Subtotal</th>}
              {!kitchenMode && <th className="pb-3 font-medium"></th>}
            </tr>
          </thead>
        <tbody>
          {products.map((rp, idx) => {
            const scaledQty = rp.quantity * scale;
            const realP = rp.product.realAveragePrice;
            const unitPrice = getPrice(rp);
            const prices = pricesMap[rp.product.id];
            const marketAvg = prices && prices.length > 0
              ? prices.reduce((s, p) => s + p.price, 0) / prices.length
              : null;

            return (
              <tr key={rp.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{rp.product.name}</span>
                    {rp.product.brand && (
                      <span className="text-xs text-gray-400 font-normal">({rp.product.brand.name})</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span className={`font-medium ${scale !== 1 ? "text-emerald-600" : "text-gray-900"}`}>
                    {scaledQty.toFixed(2).replace(".", ",").replace(/,00$/, "")}
                  </span>
                  <span className="text-gray-500 ml-1">{rp.product.unit}</span>
                  {scale !== 1 && <span className="text-gray-400 text-xs ml-2">(base: {rp.quantity})</span>}
                </td>
                {!kitchenMode && (
                  <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                    {rp.product.averagePrice !== null ? (
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                        R$ {rp.product.averagePrice.toFixed(2).replace(".", ",")} /{rp.product.unit}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {realP !== null ? (
                      <span className="font-medium text-gray-900">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                          R$ {realP.toFixed(2).replace(".", ",")} /{rp.product.unit}
                        </span>
                        {(rp.product.averagePrice ?? 0) > 0 && (
                          <span className={`text-xs ml-1.5 ${realP > (rp.product.averagePrice ?? 0) ? "text-red-500" : "text-emerald-500"}`}>
                            ({(((realP - (rp.product.averagePrice ?? 0)) / (rp.product.averagePrice ?? 0)) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3 pr-4">
                    {marketAvg !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 font-medium">R$ {marketAvg.toFixed(2).replace(".", ",")}</span>
                        <PriceBadge userPrice={unitPrice} marketPrice={marketAvg} />
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {prices && <MarketPrices prices={prices} />}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3 pr-4 font-medium text-gray-900 whitespace-nowrap">
                    R$ {(unitPrice * scaledQty).toFixed(2).replace(".", ",")}
                  </td>
                )}
                {!kitchenMode && (
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onSearchPrice(rp.product.id, rp.product.name)}
                        disabled={loadingPrices[rp.product.id]}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-30"
                        aria-label="Buscar preços"
                        title="Buscar preços"
                      >
                        {loadingPrices[rp.product.id] ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        )}
                      </button>
                      <button
                        onClick={() => onRemove(rp.product.id)}
                        disabled={removingId === rp.product.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                        aria-label="Remover ingrediente"
                        title="Remover"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

### layout/Sidebar.tsx
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/dashboard", label: "Visão Geral", icon: "📊" },
  { href: "/dashboard/products", label: "Produtos", icon: "🛒" },
  { href: "/dashboard/recipes", label: "Receitas", icon: "📖" },
  { href: "/dashboard/product-categories", label: "Cat. Produtos", icon: "📦" },
  { href: "/dashboard/categories", label: "Categorias", icon: "🏷️" },
  { href: "/dashboard/calculations", label: "Cálculos", icon: "💰" },
  { href: "/dashboard/subscription", label: "Planos", icon: "⭐" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Usuário";

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col shadow-sm">
      {/* Logo */}
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

      {/* Navigation */}
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

      {/* Bottom */}
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
    </aside>
  );
}
```

### layout/ThemeToggle.tsx
```tsx
"use client";

export function ThemeToggle() {
  return (
    <div className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500">
      <span className="flex items-center justify-center w-7 h-7 rounded-lg text-xs bg-gray-800">🌙</span>
      Modo Escuro (fixo)
    </div>
  );
}
```

### ProfitCalculatorModal.tsx
```tsx
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface SaveData {
  suggestedPrice: number;
  packagingCost: number;
  transportCost: number;
  laborCost: number;
  feePercent: number;
  desiredMargin: number;
}

export function ProfitCalculatorModal({
  open,
  onClose,
  custoReal,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  custoReal: number;
  onSave: (data: SaveData) => Promise<void>;
}) {
  const [packaging, setPackaging] = useState("");
  const [transport, setTransport] = useState("");
  const [labor, setLabor] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [marginInput, setMarginInput] = useState("50");
  const [saving, setSaving] = useState(false);

  const pkg = Number(packaging) || 0;
  const trp = Number(transport) || 0;
  const lab = Number(labor) || 0;
  const fee = Number(feePercent) || 0;
  const desiredMargin = Number(marginInput) || 0;

  const totalCost = custoReal + pkg + trp + lab;

  const suggestedPrice = useMemo(() => {
    if (desiredMargin <= 0 || desiredMargin >= 100) return 0;
    return totalCost / (1 - desiredMargin / 100);
  }, [totalCost, desiredMargin]);

  const grossProfit = suggestedPrice > 0 ? suggestedPrice - totalCost : 0;
  const feeDeduction = suggestedPrice > 0 ? suggestedPrice * (fee / 100) : 0;
  const netProfit = suggestedPrice > 0 ? suggestedPrice - totalCost - feeDeduction : 0;
  const effectiveMargin = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;
  const markup = totalCost > 0 ? ((suggestedPrice / totalCost) - 1) * 100 : 0;

  if (!open) return null;

  async function handleSave() {
    setSaving(true);
    await onSave({
      suggestedPrice: Math.round(suggestedPrice * 100) / 100,
      packagingCost: pkg,
      transportCost: trp,
      laborCost: lab,
      feePercent: fee,
      desiredMargin,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-2">💰 Calcular Lucro</h3>
        <p className="text-xs text-gray-400 mb-5">
          Preencha os custos abaixo para calcular o preço de venda sugerido.
        </p>

        <div className="space-y-6">

          {/* Seção 1 — Custo de Insumos */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">1. Custo de Insumos</h4>
            <div className="glass-card p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <label className="text-sm font-medium text-gray-700">Ingredientes da receita</label>
              <p className="text-2xl font-bold text-gray-900 mt-1">R$ {custoReal.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-gray-400 mt-1">Calculado automaticamente com base nos ingredientes.</p>
            </div>
          </div>

          {/* Seção 2 — Custos Operacionais */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">2. Custos Operacionais (R$)</h4>
            <div className="glass-card p-4 rounded-xl bg-white border space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Embalagem</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Transporte / Entrega</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mão de Obra / Gás</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                />
              </div>
            </div>
          </div>

          {/* Seção 3 — Taxas e Impostos */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">3. Taxas e Impostos</h4>
            <div className="glass-card p-4 rounded-xl bg-white border">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Taxa da plataforma / cartão (%)</label>
                <span className="group relative inline-flex cursor-help" title="Percentual descontado sobre o preço de venda (ex: taxa do iFood, Mercado Pago, cartão de crédito).">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
                placeholder="3,5"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">Ex: 3,5% para cartão de crédito ou iFood.</p>
            </div>
          </div>

          {/* Margem desejada */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">4. Margem Desejada</h4>
            <div className="glass-card p-4 rounded-xl bg-white border">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Margem de lucro desejada (%)</label>
                <span className="group relative inline-flex cursor-help" title="Margem é o percentual do lucro sobre o preço de venda. Ex: 50% de margem = o lucro é metade do preço. Diferente de markup (lucro sobre o custo).">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={marginInput}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setMarginInput(v === "" || v === "0" ? "" : v);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mt-1"
                placeholder="50"
              />
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400">Margem sobre o preço de venda</p>
                {desiredMargin > 0 && suggestedPrice > 0 && (
                  <span className="text-xs text-blue-500">
                    (markup: {markup.toFixed(1).replace(".", ",")}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Custo de insumos</span>
              <strong>R$ {custoReal.toFixed(2).replace(".", ",")}</strong>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Custos operacionais</span>
              <strong>R$ {(pkg + trp + lab).toFixed(2).replace(".", ",")}</strong>
            </div>
            {fee > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Taxas ({fee.toFixed(1).replace(".", ",")}%)</span>
                <strong className="text-red-500">- R$ {feeDeduction.toFixed(2).replace(".", ",")}</strong>
              </div>
            )}
            <div className="border-t border-emerald-200 pt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Custo total</span>
                <span className="font-semibold">R$ {totalCost.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Preço de venda</span>
                <span className="text-lg font-bold text-emerald-700">R$ {suggestedPrice > 0 ? suggestedPrice.toFixed(2).replace(".", ",") : "—"}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Lucro líquido</span>
                <strong>R$ {netProfit.toFixed(2).replace(".", ",")}</strong>
              </div>
              <div className="flex justify-between text-sm font-semibold text-emerald-700">
                <span>Margem líquida</span>
                <span>{effectiveMargin.toFixed(1).replace(".", ",")}%</span>
              </div>
            </div>
          </div>

        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <Button onClick={handleSave} disabled={saving || suggestedPrice <= 0}>
            {saving ? "Calculando..." : "Salvar Cálculo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### RecipeDetail.tsx
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CostSummary } from "@/components/CostSummary";
import { AddProductSearch } from "@/components/AddProductSearch";
import { IngredientTable } from "@/components/IngredientTable";
import { ProfitCalculatorModal } from "@/components/ProfitCalculatorModal";
import { usePlan } from "@/lib/use-plan";
import { useRecipeProducts } from "@/lib/hooks/use-recipe-products";
import { useProfitCalculation } from "@/lib/hooks/use-profit-calculation";
import { useCategoryAssign } from "@/lib/hooks/use-category-assign";

interface CalcData {
  createdAt: string;
  profit: number;
  profitMargin: number;
  suggestedPrice: number;
}

interface RecipeData {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  yield: number | null;
  category: { id: string; name: string } | null;
  products: {
    id: string;
    quantity: number;
    product: { id: string; name: string; unit: string; averagePrice: number | null; realAveragePrice: number | null; brand: { id: string; name: string } | null; brandId: string | null };
  }[];
  calculations: CalcData[];
}

export function RecipeDetail({ recipe }: { recipe: RecipeData }) {
  const router = useRouter();
  const { toast } = useToast();

  const baseYield = recipe.yield || 1;
  const [portions, setPortions] = useState(baseYield);
  const [portionsInput, setPortionsInput] = useState(String(baseYield));
  const scale = portions / baseYield;

  const {
    products, pricesMap, loadingPrices, removingId,
    custoReal, marketTotalCost, hasRealPrices,
    searchProductPrice, addProduct, removeProduct,
  } = useRecipeProducts(recipe.id, recipe.products);

  const {
    showModal: showCalcModal, setShowModal: setShowCalcModal,
    calculating, lastCalc, calculateProfit,
  } = useProfitCalculation(recipe.id, recipe.calculations?.[0] || null);

  const { categories, selectedCategory, assigning, assignCategory, setCategories } = useCategoryAssign(recipe.id, recipe.category?.id || "");

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(recipe.title);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [kitchenMode, setKitchenMode] = useState(false);
  const { can } = usePlan();

  const handlePrint = (mode: "gerencial" | "cozinha") => {
    setKitchenMode(mode === "cozinha");
    setTimeout(() => {
      window.print();
      setTimeout(() => setKitchenMode(false), 500);
    }, 100);
  };

  const totalCost = custoReal(scale);
  const marketCost = marketTotalCost(scale);
  const savings = marketCost - totalCost;

  async function saveTitle() {
    if (!newTitle.trim() || newTitle === recipe.title) { setEditingTitle(false); return; }
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        recipe.title = newTitle.trim();
        toast("Nome atualizado", "success");
      }
    } catch {
      toast("Erro ao atualizar nome", "error");
    } finally {
      setEditingTitle(false);
    }
  }

  async function createAndAssignCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug: name.toLowerCase().replace(/\s+/g, "-") }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories((prev: any[]) => [...prev, cat]);
        await assignCategory(cat.id);
        setNewCategoryName("");
      }
    } catch {
      toast("Erro ao criar categoria", "error");
    } finally {
      setCreatingCategory(false);
    }
  }

  async function deleteRecipe() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Receita excluída", "success");
        router.push("/dashboard/recipes");
      }
    } catch {
      toast("Erro ao excluir receita", "error");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`@media print {
        nav, header, footer, .fixed, .z-50,
        .hidden-print { display: none !important; }
        body { background: white !important; font-size: 11pt; color: #000 !important; }
        .max-w-4xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
        .print-only { display: block !important; }
        .print\\:hidden { display: none !important; }
        * { box-shadow: none !important; text-shadow: none !important; }
        .bg-gradient-to-br, .bg-gradient-to-r { background: #f8fafc !important; color: #000 !important; }
        table { background: white !important; border-collapse: collapse; }
        th, td { border-color: #e2e8f0 !important; }
        select, input, textarea { display: none !important; }
        a { color: #000 !important; text-decoration: none !important; }
        .rounded-2xl { border: 1px solid #e2e8f0 !important; }
      }
      .print-only { display: none; }`}</style>

      {/* Print-only header */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-800 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
            <p className="text-gray-500 mt-1">Ficha Técnica {kitchenMode ? 'Operacional' : 'Gerencial'}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Rendimento: {portions} porções</p>
            <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 hidden-print">
        <Link href="/dashboard/recipes" className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Voltar
        </Link>
        <div className="flex gap-2">
          <button onClick={() => handlePrint("gerencial")} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            🖨️ PDF (Gerencial)
          </button>
          <button onClick={() => handlePrint("cozinha")} className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 px-3 py-2 border border-emerald-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            🧑‍🍳 PDF (Cozinha)
          </button>
          <Link href={`/dashboard/recipes/${recipe.id}/edit`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar
          </Link>
          <button onClick={() => setDeleteConfirm(true)} className="inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Excluir
          </button>
        </div>
      </div>

      {/* Hero section */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-8 mb-8 shadow-lg shadow-emerald-200/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                className="text-3xl font-bold text-white bg-white/20 backdrop-blur-sm w-full px-4 py-2 rounded-xl placeholder-white/50 outline-none focus:ring-2 focus:ring-white/50"
              />
            ) : (
              <h1
                className="text-3xl font-bold text-white cursor-pointer hover:opacity-90 transition-opacity group inline-flex items-center gap-2"
                onClick={() => { setNewTitle(recipe.title); setEditingTitle(true); }}
                title="Clique para editar"
              >
                {recipe.title}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 text-lg">✏️</span>
              </h1>
            )}
            {recipe.description && (
              <p className="text-emerald-100 mt-2 text-sm">{recipe.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
            <select
              value={selectedCategory}
              onChange={(e) => {
                if (e.target.value === "__new__") return;
                assignCategory(e.target.value);
              }}
              disabled={assigning}
              className="bg-transparent text-white text-sm outline-none cursor-pointer appearance-none [&>option]:text-gray-900"
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
              <option value="__new__" className="text-emerald-600 font-medium">+ Nova categoria</option>
            </select>
          </div>
        </div>

        {/* New category inline */}
        <div className="flex items-center gap-2 mt-3">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createAndAssignCategory(); }}
            placeholder="Nova categoria..."
            className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-sm placeholder-white/50 outline-none focus:ring-2 focus:ring-white/30 w-44"
          />
          {newCategoryName.trim() && (
            <button
              onClick={createAndAssignCategory}
              disabled={creatingCategory}
              className="text-xs bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg hover:bg-white/30 transition-all disabled:opacity-50"
            >
              {creatingCategory ? "..." : "Criar"}
            </button>
          )}
        </div>
      </div>

      {/* Portions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-4 mb-6 flex items-center gap-4 hidden-print">
        <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Porções:</label>
        <input
          type="text"
          inputMode="numeric"
          value={portionsInput}
          onChange={(e) => setPortionsInput(e.target.value.replace(/\D/g, ""))}
          onBlur={() => {
            const v = Math.max(1, Number(portionsInput) || baseYield);
            setPortions(v);
            setPortionsInput(String(v));
          }}
          className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 hover:bg-white transition-colors"
        />
        {portions !== baseYield && <span className="text-xs text-gray-400">(base: {baseYield})</span>}
      </div>

      {/* Cost Summary */}
      {!kitchenMode && (
        <div className="hidden-print">
          <CostSummary products={products} scale={scale} portions={portions} hasRealPrices={hasRealPrices} />
        </div>
      )}

      {/* Cost comparison */}
      {!kitchenMode && Object.keys(pricesMap).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 hidden-print">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Custo (real)</p>
            <p className="text-2xl font-bold text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 p-5 text-center hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 mb-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            </div>
            <p className="text-xs text-gray-500 mb-1">Custo (preço mercado)</p>
            <p className="text-2xl font-bold text-gray-900">R$ {marketCost.toFixed(2).replace(".", ",")}</p>
          </div>
          <div className={`rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow ${savings >= 0 ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200" : "bg-gradient-to-br from-red-50 to-red-100 border border-red-200"}`}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full mb-3 ${savings >= 0 ? "bg-emerald-200 text-emerald-700" : "bg-red-200 text-red-700"}`}>
              {savings >= 0 ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-1">Diferença</p>
            <p className={`text-2xl font-bold ${savings >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {savings >= 0 ? "Economia" : "Prejuízo"}
            </p>
            <p className={`text-lg font-semibold mt-1 ${savings >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              R$ {Math.abs(savings).toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>
      )}

      {/* Ingredients */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Ingredientes
          </h2>
          <div className="hidden-print">
            <AddProductSearch existingProductIds={products.map((p) => p.product.id)} onAdd={addProduct} />
          </div>
        </div>
        <div className="p-6">
          <IngredientTable
            products={products}
            scale={scale}
            pricesMap={pricesMap}
            loadingPrices={loadingPrices}
            removingId={removingId}
            onSearchPrice={searchProductPrice}
            onRemove={removeProduct}
            kitchenMode={kitchenMode}
          />
        </div>
      </div>

      {/* Instructions */}
      {recipe.instructions && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-200/50 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Modo de Preparo
            </h2>
          </div>
          <div className="p-6">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{recipe.instructions}</pre>
          </div>
        </div>
      )}

      {/* Last calc */}
      {lastCalc && !kitchenMode && (
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-5 mb-6 print-only">
          <h3 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Último cálculo de lucro
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <span className="text-xs text-emerald-600">Preço sugerido</span>
              <p className="text-lg font-bold text-emerald-900 mt-1">R$ {lastCalc.suggestedPrice.toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <span className="text-xs text-emerald-600">Lucro</span>
              <p className="text-lg font-bold text-emerald-900 mt-1">R$ {lastCalc.profit.toFixed(2).replace(".", ",")}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3 text-center">
              <span className="text-xs text-emerald-600">Margem</span>
              <p className="text-lg font-bold text-emerald-900 mt-1">{lastCalc.profitMargin.toFixed(1).replace(".", ",")}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap hidden-print">
        {can("calcProfit") ? (
          <button onClick={() => setShowCalcModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-200/50 transition-all active:scale-[0.98]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Calcular Lucro
          </button>
        ) : (
          <Link href="/dashboard/subscription" className="inline-flex items-center gap-2 bg-gray-200 text-gray-500 px-6 py-3 rounded-xl text-sm font-medium cursor-not-allowed" title="Disponível apenas no plano Premium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Calcular Lucro (Premium)
          </Link>
        )}
      </div>

      <ProfitCalculatorModal open={showCalcModal} onClose={() => setShowCalcModal(false)} custoReal={totalCost} onSave={calculateProfit} />

      <ConfirmDialog
        open={deleteConfirm}
        title="Excluir receita"
        message={`Tem certeza que deseja excluir "${recipe.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={deleteRecipe}
        onCancel={() => { setDeleteConfirm(false); setDeleting(false); }}
      />
    </div>
  );
}
```

### SessionProvider.tsx
```tsx
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

### ui/button.tsx
```tsx
import { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-emerald-600 text-white hover:bg-emerald-700",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### ui/confirm-dialog.tsx
```tsx
"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmColor =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-emerald-600 hover:bg-emerald-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${confirmColor}`}
          >
            {loading ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### ui/input.tsx
```tsx
import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  );
}
```

### ui/toast.tsx
```tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const colors: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${colors[t.type]} text-white px-4 py-2 rounded-xl shadow-lg text-sm font-medium animate-[slideUp_0.3s_ease-out] pointer-events-auto`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

---
## Páginas Dashboard

### /dashboard/calculations
```tsx
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function CalculationsPage() {
  const session = await auth();
  const plan = (session?.user as any)?.plan;
  const isPremium = plan === "premium" || plan === "admin";

  if (!isPremium) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-10 shadow-2xl border border-gray-700/50">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Cálculos de Lucro</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            O recurso de cálculos de lucro está disponível apenas no plano Premium.
          </p>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all duration-200 shadow-lg shadow-emerald-500/25"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Fazer Upgrade para Premium
          </Link>
        </div>
      </div>
    );
  }

  const calculations = await prisma.profitCalculation.findMany({
    where: { userId: session?.user?.id },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 mb-10 shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Cálculos de Lucro</h1>
            <p className="text-emerald-100 text-sm mt-1">
              {calculations.length === 1
                ? "1 cálculo salvo"
                : `${calculations.length} cálculos salvos`}
            </p>
          </div>
        </div>
      </div>

      {calculations.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-16 text-center shadow-sm border border-gray-200/60">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-xl font-semibold text-gray-900 mb-2">Nenhum cálculo ainda</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
            Vá até uma receita e clique em &quot;Calcular Lucro&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {calculations.map((calc) => (
            <div
              key={calc.id}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100/80 border-l-4 border-l-emerald-500 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                    {calc.recipe.title}
                  </h3>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg whitespace-nowrap ml-3">
                    {new Date(calc.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-400 text-xs block mb-0.5">Custo</span>
                    <span className="font-medium text-gray-700">R$ {calc.productCost.toFixed(2)}</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <span className="text-gray-400 text-xs block mb-0.5">Preço</span>
                    <span className="font-medium text-gray-700">R$ {calc.suggestedPrice.toFixed(2)}</span>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100/50">
                    <span className="text-emerald-500 text-xs block mb-0.5 font-medium">Lucro</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-emerald-700">R$ {calc.profit.toFixed(2)}</span>
                      <span className="text-xs font-medium text-emerald-500 bg-emerald-100/60 px-1.5 py-0.5 rounded-full">
                        {calc.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### /dashboard/categories
```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { recipes: number };
}

const borderColors = [
  "border-l-emerald-400",
  "border-l-sky-400",
  "border-l-violet-400",
  "border-l-amber-400",
  "border-l-rose-400",
  "border-l-cyan-400",
  "border-l-lime-400",
  "border-l-fuchsia-400",
];

export default function CategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast("Erro ao carregar categorias", "error");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditId(null);
    setFormName("");
    setShowForm(true);
  }

  function openEdit(cat: Category) {
    setEditId(cat.id);
    setFormName(cat.name);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);

    const slug = formName.trim().toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    try {
      if (editId) {
        const res = await fetch(`/api/categories/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), slug }),
        });
        if (res.ok) {
          toast("Categoria atualizada!", "success");
          setShowForm(false);
          loadCategories();
        }
      } else {
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), slug }),
        });
        if (res.ok) {
          toast("Categoria criada!", "success");
          setShowForm(false);
          loadCategories();
        } else {
          const data = await res.json();
          toast(data.error || "Erro ao criar", "error");
        }
      }
    } catch {
      toast("Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Categoria excluída", "success");
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao excluir", "error");
      }
    } catch {
      toast("Erro ao excluir", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-32 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl animate-pulse" />
        <div className="h-14 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-2xl animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-2xl animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorias</h1>
          <p className="text-emerald-100 text-sm mt-1">
            {categories.length} {categories.length === 1 ? "categoria cadastrada" : "categorias cadastradas"}
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all backdrop-blur-sm border border-white/20 shadow-inner"
        >
          + Nova Categoria
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/50 shadow-xl flex items-end gap-4"
        >
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <Input
              label="Nome da categoria"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Padaria, Bolos, Salgados..."
              required
              className="flex-1 pl-10"
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : editId ? "Atualizar" : "Criar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </form>
      )}

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center">
          <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-300 text-lg font-medium">Nenhuma categoria cadastrada.</p>
          <p className="text-gray-200 text-sm mt-1">Clique em "+ Nova Categoria" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border-l-4 ${borderColors[idx % borderColors.length]} shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between p-5`}
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    slug: <span className="font-mono text-gray-300">{cat.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  {cat._count.recipes} {cat._count.recipes === 1 ? "receita" : "receitas"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(cat)}
                    className="group relative w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Editar
                    </span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className="group relative w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Excluir
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir categoria"
        message={
          deleteTarget?._count.recipes
            ? `A categoria "${deleteTarget.name}" tem ${deleteTarget._count.recipes} receita(s) vinculada(s). As receitas não serão excluídas, apenas perderão a categoria.`
            : `Excluir "${deleteTarget?.name}" permanentemente?`
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={deleteCategory}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
```

### /dashboard/page.tsx
```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AnalyticsCharts } from "@/components/dashboard/AnalyticsCharts";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  const recipeCount = await prisma.recipe.count({
    where: { createdById: user?.id },
  });

  const productCount = await prisma.product.count();

  const calcCount = await prisma.profitCalculation.count({
    where: { userId: user?.id },
  });

  const recipes = await prisma.recipe.findMany({
    where: { createdById: user?.id },
    include: {
      products: { include: { product: true } },
      calculations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const chartData = recipes
    .filter((r) => r.calculations[0])
    .map((r) => {
      const c = r.calculations[0]!;
      return {
        name: r.title,
        custoTotal: c.productCost + c.packagingCost + c.transportCost + c.laborCost,
        lucroLiquido: c.profit,
      };
    });

  const totalCost = chartData.reduce((s, d) => s + d.custoTotal, 0);

  const totalProfit = chartData.reduce((s, d) => s + d.lucroLiquido, 0);

  const calculations = recipes.map((r) => r.calculations[0]).filter(Boolean) as NonNullable<typeof recipes[0]['calculations'][0]>[];

  const avgMargin = calculations.length > 0
    ? calculations.reduce((sum, c) => sum + c.profitMargin, 0) / calculations.length
    : 0;

  const avgMarkup = calculations.length > 0
    ? calculations.reduce((sum, c) => sum + c.desiredMargin, 0) / calculations.length
    : 0;

  const mostProfitable = recipes
    .filter((r) => r.calculations[0])
    .sort((a, b) => (b.calculations[0]?.profitMargin || 0) - (a.calculations[0]?.profitMargin || 0))
    .slice(0, 3);

  const bestMarginRecipe = mostProfitable[0];

  const totalIngredientes = recipes.reduce((sum, r) => sum + r.products.length, 0);

  const statCards = [
    { label: "Receitas", value: recipeCount, icon: "📖", gradient: "from-emerald-500 to-teal-500" },
    { label: "Produtos", value: productCount, icon: "🛒", gradient: "from-blue-500 to-indigo-500" },
    { label: "Ingredientes", value: totalIngredientes, icon: "🥘", gradient: "from-purple-500 to-pink-500" },
    { label: "Cálculos", value: calcCount, icon: "💰", gradient: "from-amber-500 to-orange-500" },
  ];

  return (
    <div>
      {/* Welcome hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/70 text-xs mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Dashboard
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Olá, {user?.name?.split(" ")[0] || "usuário"}! 👋
            </h1>
            <p className="text-gray-400 text-sm max-w-lg">
              {recipeCount > 0
                ? `Você tem ${recipeCount} receita${recipeCount > 1 ? "s" : ""} cadastrada${recipeCount > 1 ? "s" : ""} e ${productCount} produto${productCount > 1 ? "s" : ""}.`
                : "Comece cadastrando sua primeira receita ou produto."}
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Link
              href="/dashboard/recipes/new"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nova Receita
            </Link>
            <Link
              href="/dashboard/recipes/import"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Importar
            </Link>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 group cursor-default">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recipes.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Financial overview */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Custos & Lucros
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Custo total das receitas</span>
                  <span className="font-bold text-lg text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Lucro total estimado</span>
                  <span className="font-bold text-lg text-emerald-600">+ R$ {totalProfit.toFixed(2).replace(".", ",")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Margem média</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                        style={{ width: `${Math.min(avgMargin, 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-emerald-600">{avgMargin.toFixed(1).replace(".", ",")}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Most profitable */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                Receitas mais lucrativas
              </h2>
              {mostProfitable.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum cálculo de lucro ainda.</p>
              ) : (
                <div className="space-y-3">
                  {mostProfitable.map((r, i) => (
                    <Link
                      key={r.id}
                      href={`/dashboard/recipes/${r.id}`}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                          i === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                          i === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500" :
                          "bg-gradient-to-br from-orange-400 to-red-500"
                        }`}>
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-600 transition-colors">{r.title}</span>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">
                        {r.calculations[0]?.profitMargin.toFixed(1).replace(".", ",")}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Financial metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Markup Médio</p>
              <p className="text-2xl font-bold text-gray-900">{avgMarkup.toFixed(1).replace(".", ",")}%</p>
              <p className="text-xs text-gray-400 mt-1">Margem de lucro desejada em média</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Receita com Maior Margem</p>
              {bestMarginRecipe ? (
                <>
                  <p className="text-lg font-bold text-gray-900 truncate">{bestMarginRecipe.title}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    {bestMarginRecipe.calculations[0]?.profitMargin.toFixed(1).replace(".", ",")}% de margem
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Custo Total (insumos)</p>
              <p className="text-2xl font-bold text-gray-900">R$ {totalCost.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-gray-400 mt-1">Produto + embalagem + transporte + mão de obra</p>
            </div>
          </div>

          {/* Charts */}
          <div className="mb-8">
            <AnalyticsCharts data={chartData} />
          </div>
        </>
      )}

      {/* Empty state */}
      {recipes.length === 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-5 shadow-lg shadow-emerald-200/50">
            👨‍🍳
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Comece agora!</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Crie sua primeira receita ou importe uma da internet para começar a calcular custos e lucros.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/recipes/new"
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-emerald-700 hover:to-emerald-600 shadow-md shadow-emerald-200/50 hover:shadow-lg transition-all"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nova Receita
              </span>
            </Link>
            <Link
              href="/dashboard/recipes/import"
              className="bg-white text-gray-700 px-6 py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Importar Receita
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

### /dashboard/product-categories
```tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

export default function ProductCategoriesPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await fetch("/api/product-categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast("Erro ao carregar categorias de produtos", "error");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditId(null);
    setFormName("");
    setShowForm(true);
  }

  function openEdit(cat: ProductCategory) {
    setEditId(cat.id);
    setFormName(cat.name);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);

    const slug = formName.trim().toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    try {
      if (editId) {
        const res = await fetch(`/api/product-categories/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), slug }),
        });
        if (res.ok) {
          toast("Categoria atualizada!", "success");
          setShowForm(false);
          loadCategories();
        }
      } else {
        const res = await fetch("/api/product-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), slug }),
        });
        if (res.ok) {
          toast("Categoria criada!", "success");
          setShowForm(false);
          loadCategories();
        } else {
          const data = await res.json();
          toast(data.error || "Erro ao criar", "error");
        }
      }
    } catch {
      toast("Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/product-categories/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Categoria excluída", "success");
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        const data = await res.json();
        toast(data.error || "Erro ao excluir", "error");
      }
    } catch {
      toast("Erro ao excluir", "error");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 rounded-2xl animate-pulse bg-[length:200%_100%]"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-2xl p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Categorias de Produtos</h1>
            <p className="text-emerald-100 text-sm mt-1">
              {categories.length} {categories.length === 1 ? "categoria cadastrada" : "categorias cadastradas"}
            </p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-emerald-900 font-semibold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nova Categoria
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/50 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 shadow-inner">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">
              {editId ? "Editar Categoria" : "Nova Categoria"}
            </h2>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                label="Nome da categoria"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Laticínios, Hortifrúti, Padaria..."
                required
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : editId ? "Atualizar" : "Criar"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-6 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner mb-4">
            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-slate-400 text-lg font-medium">Nenhuma categoria cadastrada</p>
          <p className="text-slate-300 text-sm mt-1">Clique em "Nova Categoria" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, index) => {
            const colors = [
              "border-l-emerald-400",
              "border-l-blue-400",
              "border-l-violet-400",
              "border-l-amber-400",
              "border-l-rose-400",
              "border-l-cyan-400",
            ];
            return (
              <div
                key={cat.id}
                className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 border-l-4 hover:border-l-8"
                style={{ borderLeftColor: undefined }}
              >
                <div className={`border-l-4 rounded-r-2xl ${colors[index % colors.length]} -ml-5 pl-5`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center shadow-inner">
                        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 group-hover:text-gray-900 transition-colors">
                          {cat.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 text-slate-500">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {cat._count.products} {cat._count.products === 1 ? "produto" : "produtos"}
                          </span>
                          <span className="text-xs text-slate-300">/</span>
                          <span className="text-xs text-slate-400 font-mono">{cat.slug}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="relative group/btn">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                          Editar
                        </div>
                      </div>
                      <div className="relative group/btn">
                        <button
                          onClick={() => setDeleteTarget(cat)}
                          className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                          Excluir
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir categoria"
        message={
          deleteTarget?._count.products
            ? `A categoria "${deleteTarget.name}" tem ${deleteTarget._count.products} produto(s) vinculado(s). Os produtos não serão excluídos, apenas perderão a categoria.`
            : `Excluir "${deleteTarget?.name}" permanentemente?`
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={deleting}
        onConfirm={deleteCategory}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
```

### /dashboard/products
```tsx
import { prisma } from "@/lib/db";
import { ProductList } from "./ProductList";

const PAGE_SIZE = 20;

export default async function ProductsPage(props: { searchParams?: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      include: { brand: true, purchases: { orderBy: { date: "desc" } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count(),
  ]);

  return <ProductList products={JSON.parse(JSON.stringify(products)) as any} total={total} page={page} />;
}
```

### /dashboard/recipes/import
```tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { usePlan } from "@/lib/use-plan";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  productId: string | null;
  productName: string;
  averagePrice: number;
  searchingPrice: boolean;
  cleanName?: string;
  convertedQuantity?: number;
  convertedUnit?: string;
  productPrice?: number;
  productUnit?: string;
  estimatedCost?: number;
  skipCalculation?: boolean;
}

function ImportForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { can, plan } = usePlan();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [yield_, setYield] = useState(1);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [searchingAll, setSearchingAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [rawText, setRawText] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualParsing, setManualParsing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlParsing, setUrlParsing] = useState(false);

  useEffect(() => {
    const parsedJson = sessionStorage.getItem("import_recipe_data");
    if (parsedJson) {
      try {
        const data = JSON.parse(parsedJson);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setInstructions(data.instructions || "");
        setYield(data.yield || 1);
        const ings: Ingredient[] = (data.ingredients || []).map((i: any) => ({
          name: i.name || "",
          quantity: i.quantity || 1,
          unit: i.unit || "un",
          productId: i.productId || null,
          productName: i.productName || "",
          averagePrice: i.averagePrice || 0,
          searchingPrice: false,
          cleanName: i.cleanName,
          convertedQuantity: i.convertedQuantity,
          convertedUnit: i.convertedUnit,
          productPrice: i.productPrice,
          productUnit: i.productUnit,
          estimatedCost: i.estimatedCost,
          skipCalculation: i.skipCalculation,
        }));
        setIngredients(ings);
        sessionStorage.removeItem("import_recipe_data");
        if (ings.length > 0) {
          const total = ings.reduce((s: number, ing: Ingredient) => s + (ing.estimatedCost || 0), 0);
          toast(`${ings.length} ingredientes identificados, custo estimado: R$ ${total.toFixed(2).replace(".", ",")}`, "success");
        }
      } catch { /* ignore parse error, fall through to raw text */ }
    }
    const saved = sessionStorage.getItem("import_recipe_text");
    if (saved) {
      setRawText(saved);
    }
    fetch("/api/products")
      .then((r) => r.json())
      .then((prods) => setAllProducts(prods))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function parseRecipe() {
    if (!rawText.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "");
        setDescription(data.description || "");
        setInstructions(data.instructions || "");
        setYield(data.yield || 1);
        const ings: Ingredient[] = (data.ingredients || []).map((i: any) => ({
          name: i.name || "",
          quantity: i.quantity || 1,
          unit: i.unit || "un",
          productId: i.productId || null,
          productName: i.productName || "",
          averagePrice: i.averagePrice || 0,
          searchingPrice: false,
          cleanName: i.cleanName,
          convertedQuantity: i.convertedQuantity,
          convertedUnit: i.convertedUnit,
          productPrice: i.productPrice,
          productUnit: i.productUnit,
          estimatedCost: i.estimatedCost,
          skipCalculation: i.skipCalculation,
        }));
        setIngredients(ings);
        if (!data.title && ings.length === 0) {
          toast("Não foi possível identificar uma receita neste texto", "error");
        } else {
          const total = ings.reduce((s: number, ing: Ingredient) => s + (ing.estimatedCost || 0), 0);
          toast(`Receita identificada! ${ings.length} ingredientes, custo estimado: R$ ${total.toFixed(2).replace(".", ",")}`, "success");
        }
      } else {
        toast("Erro ao processar receita", "error");
      }
    } catch {
      toast("Erro ao conectar", "error");
    } finally {
      setParsing(false);
    }
  }

  useEffect(() => {
    if (rawText && allProducts.length > 0 && !title) {
      parseRecipe();
    }
  }, [rawText, allProducts.length]);

  function updateIngredient(index: number, field: keyof Ingredient, value: any) {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: "", quantity: 1, unit: "un", productId: null, productName: "", averagePrice: 0, searchingPrice: false }]);
  }

  function matchProduct(name: string): string | null {
    const match = allProducts.find(
      (p) =>
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
    );
    return match?.id || null;
  }

  async function searchAllPrices() {
    const toSearch = ingredients.filter((ing) => ing.name.trim());
    if (toSearch.length === 0) {
      toast("Nenhum ingrediente com nome para buscar", "error");
      return;
    }
    setSearchingAll(true);
    setIngredients((prev) => prev.map((ing) => ({ ...ing, searchingPrice: true })));

    const results = await Promise.allSettled(
      toSearch.map((ing) =>
        fetch(`/api/prices/search?q=${encodeURIComponent(ing.name)}`).then((r) => r.json())
      )
    );

    let found = 0;
    setIngredients((prev) =>
      prev.map((ing) => {
        if (!ing.name.trim()) return { ...ing, searchingPrice: false };
        const idx = toSearch.findIndex((s) => s.name.toLowerCase().trim() === ing.name.toLowerCase().trim());
        if (idx === -1) return { ...ing, searchingPrice: false };
        const r = results[idx];
        if (r.status !== "fulfilled") return { ...ing, searchingPrice: false };
        const prices = (r.value?.results || []).map((pr: any) => pr.price || 0).filter((p: number) => p > 0);
        if (prices.length === 0) return { ...ing, searchingPrice: false };
        const best = Math.min(...prices);
        found++;
        return { ...ing, searchingPrice: false, averagePrice: best };
      })
    );
    setSearchingAll(false);
    toast(`Busca concluída! ${found} ingrediente(s) com preço atualizado.`, "success");
  }

  async function handleManualImport() {
    if (!manualText.trim()) return;
    sessionStorage.setItem("import_recipe_text", manualText);
    setManualText("");
    setRawText(manualText);
  }

  async function save() {
    if (!title.trim()) {
      toast("O título é obrigatório", "error");
      return;
    }
    setSaving(true);

    const res = await fetch("/api/recipes/import/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        yield: yield_,
        ingredients: ingredients.filter((ing) => ing.name.trim()).map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          productId: ing.productId,
          averagePrice: ing.averagePrice,
        })),
      }),
    });

    if (!res.ok) {
      toast("Erro ao salvar receita", "error");
      setSaving(false);
      return;
    }

    const recipe = await res.json();

    sessionStorage.removeItem("import_recipe_text");
    toast("Receita importada com sucesso!", "success");
    router.push(`/dashboard/recipes/${recipe.recipeId}`);
  }

  function startOver() {
    setTitle("");
    setDescription("");
    setInstructions("");
    setIngredients([]);
    setYield(1);
    setRawText("");
    sessionStorage.removeItem("import_recipe_text");
  }

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  async function handleUrlImport() {
    if (!urlInput.trim()) return;
    setUrlParsing(true);
    try {
      const res = await fetch("/api/recipes/import/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTitle(data.title || "");
        setDescription(data.description || "");
        setInstructions(data.instructions || "");
        setYield(data.yield || 1);
        const ings: Ingredient[] = (data.ingredients || []).map((i: any) => ({
          name: i.name || "",
          quantity: i.quantity || 1,
          unit: i.unit || "un",
          productId: i.productId || null,
          productName: i.productName || "",
          averagePrice: i.averagePrice || 0,
          searchingPrice: false,
          cleanName: i.cleanName,
          convertedQuantity: i.convertedQuantity,
          convertedUnit: i.convertedUnit,
          productPrice: i.productPrice,
          productUnit: i.productUnit,
          estimatedCost: i.estimatedCost,
          skipCalculation: i.skipCalculation,
        }));
        setIngredients(ings);
        setRawText("imported");
        const total = ings.reduce((s: number, ing: Ingredient) => s + (ing.estimatedCost || 0), 0);
        toast(`Receita importada da URL! ${ings.length} ingredientes, custo estimado: R$ ${total.toFixed(2).replace(".", ",")}`, "success");
      } else {
        const err = await res.json();
        toast(err.error || "Erro ao importar URL", "error");
      }
    } catch {
      toast("Erro ao conectar", "error");
    } finally {
      setUrlParsing(false);
    }
  }

  if (!can("importText") && !can("importUrl")) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">📥 Importar Receita</h1>
        <p className="text-gray-500 mb-6">
          O recurso de importação de receitas está disponível apenas no plano Premium.
        </p>
        <Link
          href="/dashboard/subscription"
          className="bg-emerald-600 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-emerald-700 inline-block"
        >
          ⭐ Fazer Upgrade para Premium
        </Link>
      </div>
    );
  }

  if (!rawText) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📥 Importar Receita</h1>

        <div className="bg-white p-6 rounded-xl border mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">🔗 Importar da Internet</h2>
          <p className="text-sm text-gray-500 mb-3">
            Cole o link de uma receita da internet para importar automaticamente:
          </p>
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://www.tudogostoso.com.br/receita/..."
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button onClick={handleUrlImport} disabled={!urlInput.trim() || urlParsing}>
            {urlParsing ? "Importando..." : "Importar da URL"}
          </Button>
        </div>

        <div className="bg-white p-6 rounded-xl border">
          <div className="text-center mb-6">
            <p className="text-4xl mb-4">📝</p>
            <p className="text-gray-600 mb-2">Ou cole o texto da receita manualmente:</p>
          </div>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-4 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={8}
            placeholder="Cole aqui a receita completa (ingredientes e modo de preparo)..."
          />
          <div className="flex gap-3 justify-center">
            <Button onClick={handleManualImport} disabled={!manualText.trim() || manualParsing}>
              {manualParsing ? "Analisando..." : "Importar Texto"}
            </Button>
            <Button variant="secondary" onClick={() => router.push("/dashboard/recipes")}>
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📥 Importar Receita</h1>
        <button onClick={startOver} className="text-sm text-gray-500 hover:text-gray-700 underline">
          Recomeçar
        </button>
      </div>

      {parsing && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl mb-6 flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full" />
          <span className="text-sm text-emerald-700">Analisando receita...</span>
        </div>
      )}

      <div className="space-y-4">
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Nome da receita" />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300"
            rows={2}
            placeholder="Breve descrição"
          />
        </div>

        <Input label="Rendimento (porções)" type="number" value={yield_} onChange={(e) => setYield(Number(e.target.value))} min={1} />

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Ingredientes ({ingredients.length})</h2>
            <div className="flex gap-2">
              <button
                onClick={searchAllPrices}
                disabled={searchingAll || ingredients.filter((i) => i.name.trim()).length === 0}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-300"
              >
                {searchingAll ? "Buscando..." : "🔍 Buscar Preços"}
              </button>
              <button onClick={parseRecipe} disabled={parsing} className="text-sm text-emerald-600 hover:underline disabled:text-gray-300">
                {parsing ? "Analisando..." : "🔄 Re-analisar"}
              </button>
              <button onClick={addIngredient} className="text-sm text-emerald-600 hover:underline">
                + Adicionar
              </button>
            </div>
          </div>

          {ingredients.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum ingrediente identificado.</p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                    <input
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, "name", e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Nome"
                    />
                    <input
                      type="number"
                      step="any"
                      min={0}
                      value={ing.quantity || ""}
                      onChange={(e) => updateIngredient(i, "quantity", Number(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Qtd"
                    />
                    <select
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, "unit", e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="un">un</option>
                      <option value="cx">cx</option>
                      <option value="pct">pct</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={ing.averagePrice || ""}
                        onChange={(e) => updateIngredient(i, "averagePrice", Number(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="0,00"
                      />
                    </div>
                    {ing.searchingPrice && (
                      <span className="text-xs text-emerald-600 animate-pulse w-5 text-center">⟳</span>
                    )}
                    {ing.estimatedCost !== undefined && ing.estimatedCost > 0 && (
                      <span className="text-xs font-medium text-emerald-700 whitespace-nowrap">
                        R$ {ing.estimatedCost.toFixed(2).replace(".", ",")}
                      </span>
                    )}
                    {ing.skipCalculation && (
                      <span className="text-xs text-gray-400 italic">
                        a gosto
                      </span>
                    )}
                    {ing.productName && ing.productName !== ing.name && (
                      <span className="text-xs text-gray-400 truncate max-w-[100px]" title={ing.productName}>
                        → {ing.productName}
                      </span>
                    )}
                    <button onClick={() => removeIngredient(i)} className="text-xs text-red-400 hover:text-red-600 px-1">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {ingredients.some((ing) => (ing.estimatedCost || 0) > 0) && (
                <div className="flex justify-end pt-2 border-t border-gray-200">
                  <span className="text-sm font-semibold text-gray-800">
                    Total estimado: R$ {ingredients.reduce((s, ing) => s + (ing.estimatedCost || 0), 0).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Modo de Preparo</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 font-mono text-sm"
            rows={8}
            placeholder="Passo a passo..."
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving || !title.trim()}>
            {saving ? "Salvando..." : "Salvar Receita"}
          </Button>
          <Button variant="secondary" onClick={() => router.push("/dashboard/recipes")}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ImportRecipePage() {
  return (
    <Suspense fallback={<div className="max-w-3xl animate-pulse"><div className="h-8 bg-gray-200 rounded w-48" /></div>}>
      <ImportForm />
    </Suspense>
  );
}
```

### /dashboard/recipes/new
```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

interface ProductOption {
  id: string;
  name: string;
  unit: string;
  averagePrice: number | null;
}

interface NewIngredient {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  averagePrice: number | null;
}

export default function NewRecipePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [ingredients, setIngredients] = useState<NewIngredient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      const q = searchTerm.toLowerCase();
      const results = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) &&
          !ingredients.some((i) => i.productId === p.id)
      );
      setSearchResults(results.slice(0, 10));
      setSearching(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, products, ingredients]);

  function addIngredient(product: ProductOption) {
    setIngredients((prev) => [
      ...prev,
      { productId: product.id, productName: product.name, quantity: 1, unit: product.unit, averagePrice: product.averagePrice },
    ]);
    setSearchTerm("");
    setSearchResults([]);
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQty(index: number, qty: number) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, quantity: qty } : ing))
    );
  }

  const totalCost = ingredients.reduce((s, ing) => s + (ing.averagePrice ?? 0) * ing.quantity, 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      title: formData.get("title"),
      description: formData.get("description"),
      instructions: formData.get("instructions"),
      yield: Number(formData.get("yield")) || 1,
      ingredients: ingredients.map((ing) => ({
        productId: ing.productId,
        quantity: ing.quantity,
      })),
    };

    const res = await fetch("/api/recipes/import/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      toast("Erro ao criar receita", "error");
      setLoading(false);
      return;
    }

    const recipe = await res.json();
    toast("Receita criada com sucesso!", "success");
    router.push(`/dashboard/recipes/${recipe.id}`);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nova Receita</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Título" name="title" required placeholder="Ex: Bolo de Cenoura" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            name="description"
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300"
            rows={3}
            placeholder="Uma breve descrição da receita"
          />
        </div>
        <Input label="Rendimento (porções)" name="yield" type="number" defaultValue={1} min={1} />

        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Ingredientes ({ingredients.length})</h2>
          </div>

          <div className="relative mb-3">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto para adicionar..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {(searchResults.length > 0 || searching) && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searching ? (
                  <div className="p-3 text-sm text-gray-400">Buscando...</div>
                ) : (
                  searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addIngredient(p)}
                      className="w-full text-left flex items-center gap-2 p-2 hover:bg-gray-50 border-b text-sm"
                    >
                      <span className="flex-1 font-medium">{p.name}</span>
                      <span className="text-gray-400">R$ {(p.averagePrice ?? 0).toFixed(2).replace(".", ",")}/{p.unit}</span>
                      <span className="text-emerald-600 font-medium">+</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {ingredients.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum ingrediente adicionado. Busque produtos acima.</p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                  <span className="flex-1 text-sm font-medium">{ing.productName}</span>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={ing.quantity || ""}
                    onChange={(e) => updateQty(i, Number(e.target.value) || 0)}
                    className="w-16 px-2 py-1 border rounded text-sm text-center"
                  />
                  <span className="text-xs text-gray-400 w-6">{ing.unit}</span>
                  <span className="text-xs text-gray-500 w-16 text-right">
                    R$ {((ing.averagePrice ?? 0) * ing.quantity).toFixed(2).replace(".", ",")}
                  </span>
                  <button type="button" onClick={() => removeIngredient(i)} className="text-xs text-red-400 hover:text-red-600 px-1">
                    ✕
                  </button>
                </div>
              ))}
              {totalCost > 0 && (
                <div className="flex justify-end pt-2 border-t text-sm font-semibold text-gray-800">
                  Custo total estimado: R$ {totalCost.toFixed(2).replace(".", ",")}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Modo de Preparo</label>
          <textarea
            name="instructions"
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 font-mono text-sm"
            rows={8}
            placeholder="Passo a passo do preparo..."
          />
        </div>

        <Button type="submit" disabled={loading} className="w-fit">
          {loading ? "Salvando..." : "Salvar Receita"}
        </Button>
      </form>
    </div>
  );
}
```

### /dashboard/recipes
```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 12;

export default async function RecipesPage(props: { searchParams?: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  const page = Math.max(1, Number(searchParams?.page) || 1);

  const [recipes, total] = await Promise.all([
    prisma.recipe.findMany({
      where: { createdById: session?.user?.id },
      include: { category: true, products: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.recipe.count({ where: { createdById: session?.user?.id } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/70 text-xs mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {total} receita{total !== 1 ? "s" : ""} cadastrada{total !== 1 ? "s" : ""}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Receitas</h1>
            <p className="text-gray-400 text-sm max-w-lg">
              {total > 0
                ? `Você tem ${total} receita${total !== 1 ? "s" : ""} no total.`
                : "Cadastre sua primeira receita para começar a calcular os custos."}
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <Link
              href="/dashboard/recipes/new"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Receita
            </Link>
            <Link
              href="/dashboard/recipes/import"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar
            </Link>
          </div>
        </div>
      </div>

      {recipes.length === 0 ? (
        /* Empty State */
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 rounded-2xl p-12 shadow-xl text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Nenhuma receita ainda</h3>
          <p className="text-gray-400 text-sm mb-8 max-w-md mx-auto">
            Crie sua primeira receita ou importe de uma URL para começar a calcular custos automaticamente.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard/recipes/new"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova Receita
            </Link>
            <Link
              href="/dashboard/recipes/import"
              className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importar Receita
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Recipe Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((recipe) => {
              const totalCost = recipe.products.reduce(
                (sum, rp) => sum + (rp.product.averagePrice ?? 0) * rp.quantity,
                0
              );
              return (
                <Link
                  key={recipe.id}
                  href={`/dashboard/recipes/${recipe.id}`}
                  className="group relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
                >
                  {/* Left border accent */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-teal-500" />
                  <div className="p-5 pl-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-emerald-700 transition-colors truncate">
                          {recipe.title}
                        </h3>
                        {recipe.description && (
                          <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{recipe.description}</p>
                        )}
                      </div>
                      {/* Cost */}
                      <div className="shrink-0 flex flex-col items-end">
                        <div className="flex items-center gap-1 text-emerald-600 font-bold text-lg">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          R$ {totalCost.toFixed(2)}
                        </div>
                        <span className="text-xs text-gray-400 mt-0.5">custo total</span>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {recipe.category && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-200">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {recipe.category.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        {recipe.products.length} ingrediente{recipe.products.length !== 1 ? "s" : ""}
                      </span>
                      {recipe.yield && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Rende {recipe.yield}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              {page > 1 && (
                <Link
                  href={`/dashboard/recipes?page=${page - 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-full border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </Link>
              )}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Link
                    key={p}
                    href={`/dashboard/recipes?page=${p}`}
                    className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-full transition-all ${
                      p === page
                        ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20"
                        : "text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              </div>
              {page < totalPages && (
                <Link
                  href={`/dashboard/recipes?page=${page + 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-full border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                >
                  Próxima
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### /dashboard/recipes/[id]/edit
```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function EditRecipePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    yield: 1,
  });

  useEffect(() => {
    fetch(`/api/recipes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm({
          title: data.title || "",
          description: data.description || "",
          instructions: data.instructions || "",
          yield: data.yield || 1,
        });
      })
      .catch(() => toast("Erro ao carregar receita", "error"))
      .finally(() => setLoading(false));
  }, [id, toast]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const res = await fetch(`/api/recipes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
        instructions: formData.get("instructions"),
        yield: Number(formData.get("yield")) || 1,
      }),
    });

    if (res.ok) {
      toast("Receita atualizada!", "success");
      router.push(`/dashboard/recipes/${id}`);
    } else {
      toast("Erro ao salvar", "error");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Receita</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Título"
          name="title"
          required
          defaultValue={form.title}
          placeholder="Ex: Bolo de Cenoura"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Descrição</label>
          <textarea
            name="description"
            defaultValue={form.description}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300"
            rows={3}
            placeholder="Uma breve descrição da receita"
          />
        </div>
        <Input label="Rendimento (porções)" name="yield" type="number" defaultValue={form.yield} min={1} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Modo de Preparo</label>
          <textarea
            name="instructions"
            defaultValue={form.instructions}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 border-gray-300 font-mono text-sm"
            rows={8}
            placeholder="Passo a passo do preparo..."
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/dashboard/recipes/${id}`)}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
```

### /dashboard/recipes/[id]
```tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { RecipeDetail } from "@/components/RecipeDetail";

function getLastPurchasePrice(purchases: { totalPrice: number; quantity: number }[]): number | null {
  if (purchases.length === 0) return null;
  const last = purchases[0];
  return last.quantity > 0 ? last.totalPrice / last.quantity : null;
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const recipe = await prisma.recipe.findFirst({
    where: { id, createdById: session?.user?.id },
    include: {
      category: true,
      products: {
        include: {
          product: {
            include: {
              brand: true,
              purchases: { orderBy: { date: "desc" } },
            },
          },
        },
      },
      calculations: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!recipe) notFound();

  const recipeWithPrices = {
    ...recipe,
    products: recipe.products.map((rp) => ({
      ...rp,
      product: {
        ...rp.product,
        averagePrice: rp.product.averagePrice,
        realAveragePrice: getLastPurchasePrice(rp.product.purchases),
      },
    })),
  };

  return <RecipeDetail recipe={JSON.parse(JSON.stringify(recipeWithPrices))} />;
}
```

### /dashboard/subscription
```tsx
"use client";

import { useSession } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/plans";

function SubscriptionContent() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const failure = searchParams.get("failure");
  const upgraded = searchParams.get("upgraded");
  const [loading, setLoading] = useState<PlanId | null>(null);

  const currentPlan = (session?.user as any)?.plan || "basico";

  async function handleUpgrade(plan: PlanId) {
    setLoading(plan);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        if (data.url.startsWith("http")) {
          window.location.href = data.url;
        } else {
          router.push(data.url);
        }
      }
    } catch {
      alert("Erro ao processar pagamento");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-8 mb-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-8 h-8 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h1 className="text-3xl font-bold">Planos</h1>
        </div>
        <p className="text-emerald-100 text-lg ml-11">
          {currentPlan === "premium"
            ? "Você está no plano Premium. Aproveite todos os recursos!"
            : "Escolha o plano ideal para o seu negócio"}
        </p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mb-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-lg">Pagamento aprovado!</p>
            <p className="text-emerald-600">Seu plano Premium já está ativo.</p>
          </div>
        </div>
      )}

      {upgraded && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl mb-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-lg">Plano Premium ativado!</p>
            <p className="text-emerald-600">Seu plano foi atualizado com sucesso.</p>
          </div>
        </div>
      )}

      {failure && (
        <div className="bg-red-50 border border-red-200 p-5 rounded-2xl mb-6 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-800 text-lg">Pagamento não concluído</p>
            <p className="text-red-600">Ocorreu um erro ao processar. Tente novamente.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {Object.entries(PLANS).map(([id, plan]) => (
          <div
            key={id}
            className={`relative bg-white rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
              id === "premium"
                ? "border-2 border-emerald-500 shadow-xl shadow-emerald-500/20"
                : currentPlan === id
                  ? "border-2 border-emerald-500 shadow-lg"
                  : "border-2 border-gray-200 shadow-sm hover:shadow-md"
            }`}
          >
            {id === "premium" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                Popular
              </div>
            )}

            <div className="flex items-center gap-3 mb-1">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                id === "premium"
                  ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {id === "premium" ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{plan.label}</h2>
            </div>

            <div className="mt-3 mb-5">
              <span className="text-4xl font-extrabold text-gray-900">
                {plan.price > 0 ? `R$ ${plan.price.toFixed(2).replace(".", ",")}` : "Grátis"}
              </span>
              {plan.price > 0 && (
                <span className="text-base font-normal text-gray-500 ml-1">/mês</span>
              )}
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start gap-3">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            {currentPlan === id ? (
              <div className={`text-center text-sm font-semibold py-3 rounded-xl ${
                id === "premium"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md"
                  : "bg-gray-100 text-gray-700"
              }`}>
                Plano atual
              </div>
            ) : id === "premium" ? (
              <Button
                onClick={() => handleUpgrade(id as PlanId)}
                disabled={loading === id}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {loading === id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processando...
                  </span>
                ) : (
                  "Assinar Premium"
                )}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl">
        <div className="h-40 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl animate-pulse" />
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  );
}
```

---
## Configurações

### plans.ts
```typescript
export type PlanId = "basico" | "premium" | "admin";

export interface PlanConfig {
  label: string;
  price: number;
  features: string[];
  limits: {
    maxRecipes: number;
    maxProducts: number;
  };
  allowed: {
    importText: boolean;
    importUrl: boolean;
    searchPrices: boolean;
    calcProfit: boolean;
    purchases: boolean;
    assistant: boolean;
    exportPdf: boolean;
    deleteAllProducts: boolean;
  };
}

export const PLANS: Record<PlanId, PlanConfig> = {
  basico: {
    label: "Básico",
    price: 29.90,
    features: [
      "Receitas ilimitadas",
      "Produtos ilimitados",
      "Adicionar ingredientes",
      "Ajustar rendimento",
      "Custo automático",
      "Dashboard",
      "Baixar PDF",
    ],
    limits: { maxRecipes: 999, maxProducts: 999 },
    allowed: {
      importText: false,
      importUrl: false,
      searchPrices: false,
      calcProfit: false,
      purchases: false,
      assistant: true,
      deleteAllProducts: false,
      exportPdf: true,
    },
  },
  premium: {
    label: "Premium",
    price: 49.90,
    features: [
      "Tudo do Básico",
      "Importar receita por texto (IA)",
      "Importar receita por URL",
      "Buscar preços reais na web",
      "Calcular lucro (margem + preço)",
      "Preço de compra real",
      "Assistente IA",
      "Comparação preço de mercado",
    ],
    limits: { maxRecipes: 999, maxProducts: 999 },
    allowed: {
      importText: true,
      importUrl: true,
      searchPrices: true,
      calcProfit: true,
      purchases: true,
      assistant: true,
      deleteAllProducts: true,
      exportPdf: true,
    },
  },
  admin: {
    label: "Administrador",
    price: 0,
    features: [
      "Acesso total a todas as funcionalidades",
      "Gerenciar usuários",
      "Sem limites",
    ],
    limits: { maxRecipes: 99999, maxProducts: 99999 },
    allowed: {
      importText: true,
      importUrl: true,
      searchPrices: true,
      calcProfit: true,
      purchases: true,
      assistant: true,
      deleteAllProducts: true,
      exportPdf: true,
    },
  },
};

export function checkPlan(plan: string, feature: keyof PlanConfig["allowed"]): boolean {
  const cfg = PLANS[plan as PlanId];
  if (!cfg) return false;
  return cfg.allowed[feature] ?? false;
}
```

### plan-check.ts
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkPlan } from "@/lib/plans";
import type { PlanConfig } from "@/lib/plans";

export async function requirePlan(feature: keyof PlanConfig["allowed"]): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const plan = (session.user as any).plan || "basico";
  if (!checkPlan(plan, feature)) {
    return NextResponse.json(
      { error: "Funcionalidade exclusiva do plano Premium", code: "PLAN_LIMIT" },
      { status: 403 }
    );
  }

  return null;
}
```

### use-plan.ts
```typescript
"use client";

import { useSession } from "next-auth/react";
import { checkPlan, PLANS } from "@/lib/plans";
import type { PlanConfig } from "@/lib/plans";

export function usePlan() {
  const { data: session } = useSession();
  const plan = (session?.user as any)?.plan || "basico";
  const planConfig = PLANS[plan as keyof typeof PLANS];

  return {
    plan,
    isPremium: plan === "premium" || plan === "admin",
    can: (feature: keyof PlanConfig["allowed"]) => checkPlan(plan, feature),
    planConfig,
    isLoaded: session !== undefined,
  };
}
```

### errors.ts
```typescript
import { NextResponse } from "next/server";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Não autorizado") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Recurso não encontrado") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class PlanLimitError extends AppError {
  constructor(message = "Seu plano não permite esta funcionalidade") {
    super(message, 403, "PLAN_LIMIT");
    this.name = "PlanLimitError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (...args: any[]) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (...args: unknown[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn(error.message, {
          statusCode: error.statusCode,
          code: error.code,
          ...error.context,
        });
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }

      const message = error instanceof Error ? error.message : "Erro interno do servidor";
      logger.error(message, { error: String(error) });
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }
  };
}

export function getSessionOrThrow(session: unknown): { user: { id: string } } {
  if (!session || typeof session !== "object" || !("user" in session) || !session.user || typeof session.user !== "object" || !("id" in session.user)) {
    throw new UnauthorizedError();
  }
  return session as { user: { id: string } };
}
```

### prices.ts
```typescript
import type { CheerioAPI } from "cheerio";

export interface PriceResult {
  title: string;
  price: number;
  store: string;
  url: string;
}

interface SearchAdapter<T = unknown> {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string): Promise<PriceResult[]>;
}

const FALLBACK: Record<string, PriceResult[]> = {
  farinha: [
    { title: "Farinha de Trigo Dona Benta 1kg", price: 5.49, store: "Assaí", url: "" },
    { title: "Farinha de Trigo Renata 1kg", price: 5.99, store: "Carrefour", url: "" },
    { title: "Farinha de Trigo Tradicional 1kg", price: 4.99, store: "Extra", url: "" },
    { title: "Farinha de Arroz 500g", price: 6.99, store: "Assaí", url: "" },
    { title: "Farinha de Mandioca 1kg", price: 7.49, store: "Carrefour", url: "" },
  ],
  acucar: [
    { title: "Açúcar Refinado União 1kg", price: 4.99, store: "Carrefour", url: "" },
    { title: "Açúcar Cristal 1kg", price: 3.99, store: "Assaí", url: "" },
    { title: "Açúcar Mascavo 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Açúcar de Confeiteiro 1kg", price: 9.49, store: "Extra", url: "" },
  ],
  arroz: [
    { title: "Arroz Tipo 1 Camil 5kg", price: 28.90, store: "Assaí", url: "" },
    { title: "Arroz Tipo 1 Tio João 5kg", price: 32.90, store: "Extra", url: "" },
    { title: "Arroz Integral 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Arroz Arbóreo 500g", price: 12.90, store: "Carrefour", url: "" },
  ],
  feijao: [
    { title: "Feijão Carioca Kicaldo 1kg", price: 8.49, store: "Carrefour", url: "" },
    { title: "Feijão Carioca Camil 1kg", price: 7.99, store: "Assaí", url: "" },
    { title: "Feijão Preto 1kg", price: 8.99, store: "Assaí", url: "" },
    { title: "Feijão Branco 500g", price: 9.99, store: "Carrefour", url: "" },
  ],
  leite: [
    { title: "Leite Integral Itambé 1L", price: 5.99, store: "Carrefour", url: "" },
    { title: "Leite Integral Piracanjuba 1L", price: 5.79, store: "Assaí", url: "" },
    { title: "Leite Desnatado 1L", price: 5.49, store: "Extra", url: "" },
    { title: "Leite Zero Lactose 1L", price: 7.99, store: "Carrefour", url: "" },
    { title: "Leite Condensado Moça 395g", price: 6.99, store: "Assaí", url: "" },
    { title: "Creme de Leite Nestlé 200g", price: 4.99, store: "Carrefour", url: "" },
    { title: "Leite em Pó Ninho 400g", price: 12.99, store: "Assaí", url: "" },
  ],
  oleo: [
    { title: "Óleo de Soja Liza 900ml", price: 8.49, store: "Assaí", url: "" },
    { title: "Óleo de Soja Soya 900ml", price: 8.29, store: "Carrefour", url: "" },
    { title: "Azeite de Oliva Extra Virgem 500ml", price: 24.90, store: "Carrefour", url: "" },
    { title: "Óleo de Coco 200ml", price: 14.90, store: "Assaí", url: "" },
  ],
  manteiga: [
    { title: "Manteiga Qualy 200g", price: 9.99, store: "Carrefour", url: "" },
    { title: "Manteiga Aviação 200g", price: 16.90, store: "Extra", url: "" },
    { title: "Margarina Doriana 500g", price: 7.99, store: "Assaí", url: "" },
  ],
  ovo: [
    { title: "Ovos Brancos 30un", price: 16.99, store: "Assaí", url: "" },
    { title: "Ovos Vermelhos Granja 12un", price: 10.99, store: "Carrefour", url: "" },
    { title: "Ovos Caipira 12un", price: 14.99, store: "Extra", url: "" },
  ],
  sal: [
    { title: "Sal Refinado Cisne 1kg", price: 2.99, store: "Assaí", url: "" },
    { title: "Sal Refinado 1kg", price: 2.79, store: "Carrefour", url: "" },
    { title: "Sal Marinho 1kg", price: 5.99, store: "Extra", url: "" },
    { title: "Sal Grosso 1kg", price: 3.49, store: "Assaí", url: "" },
  ],
  cafe: [
    { title: "Café Torrado Moído Pilão 500g", price: 18.90, store: "Carrefour", url: "" },
    { title: "Café Torrado Moído 3 Corações 500g", price: 17.99, store: "Assaí", url: "" },
    { title: "Café Solúvel Nescafé 200g", price: 15.99, store: "Extra", url: "" },
  ],
  chocolate: [
    { title: "Chocolate em Pó Nescau 400g", price: 9.99, store: "Assaí", url: "" },
    { title: "Chocolate em Pó Toddy 400g", price: 8.99, store: "Carrefour", url: "" },
    { title: "Chocolate Meio Amargo 70% 100g", price: 7.99, store: "Extra", url: "" },
    { title: "Chocolate Branco 100g", price: 6.99, store: "Assaí", url: "" },
    { title: "Cacau em Pó 100% 200g", price: 14.90, store: "Carrefour", url: "" },
  ],
  fermento: [
    { title: "Fermento Biológico Seco Fleischmann 10g", price: 3.99, store: "Assaí", url: "" },
    { title: "Fermento Químico Royal 100g", price: 6.49, store: "Carrefour", url: "" },
    { title: "Fermento Biológico Fresco 15g", price: 2.49, store: "Assaí", url: "" },
    { title: "Bicarbonato de Sódio 100g", price: 4.99, store: "Extra", url: "" },
  ],
  macarrao: [
    { title: "Macarrão Espaguete Adria 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Espaguete Renata 500g", price: 5.29, store: "Carrefour", url: "" },
    { title: "Macarrão Penne 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Parafuso 500g", price: 4.99, store: "Extra", url: "" },
    { title: "Lasanha 500g", price: 6.99, store: "Carrefour", url: "" },
  ],
  batata: [
    { title: "Batata Inglesa 1kg", price: 4.99, store: "Hortifruti", url: "" },
    { title: "Batata Doce 1kg", price: 4.49, store: "Hortifruti", url: "" },
    { title: "Batata Asterix 1kg", price: 5.99, store: "Extra", url: "" },
  ],
  cebola: [
    { title: "Cebola 1kg", price: 5.99, store: "Hortifruti", url: "" },
    { title: "Cebola 1kg", price: 6.49, store: "Extra", url: "" },
    { title: "Cebola Roxa 1kg", price: 8.99, store: "Hortifruti", url: "" },
  ],
  alho: [
    { title: "Alho 100g", price: 3.99, store: "Hortifruti", url: "" },
    { title: "Alho 200g", price: 6.99, store: "Carrefour", url: "" },
    { title: "Alho Picado 300g", price: 8.99, store: "Assaí", url: "" },
  ],
  cenoura: [
    { title: "Cenoura 1kg", price: 3.99, store: "Hortifruti", url: "" },
    { title: "Cenoura 1kg", price: 4.99, store: "Extra", url: "" },
  ],
  tomate: [
    { title: "Tomate 1kg", price: 6.99, store: "Hortifruti", url: "" },
    { title: "Tomate 1kg", price: 7.49, store: "Extra", url: "" },
    { title: "Tomate Pelado Enlatado 400g", price: 5.99, store: "Carrefour", url: "" },
    { title: "Extrato de Tomate 300g", price: 4.99, store: "Assaí", url: "" },
  ],
  frango: [
    { title: "Peito de Frango 1kg", price: 19.99, store: "Assaí", url: "" },
    { title: "Peito de Frango 1kg", price: 22.99, store: "Carrefour", url: "" },
    { title: "Coxa de Frango 1kg", price: 12.99, store: "Assaí", url: "" },
    { title: "Frango Inteiro 1kg", price: 14.99, store: "Extra", url: "" },
  ],
  carne: [
    { title: "Carne Moída 1kg", price: 28.99, store: "Assaí", url: "" },
    { title: "Carne Moída 1kg", price: 32.99, store: "Carrefour", url: "" },
    { title: "Patinho 1kg", price: 36.90, store: "Assaí", url: "" },
    { title: "Coxão Mole 1kg", price: 38.90, store: "Carrefour", url: "" },
    { title: "Alcatra 1kg", price: 44.90, store: "Extra", url: "" },
  ],
  queijo: [
    { title: "Queijo Mussarela 1kg", price: 38.90, store: "Assaí", url: "" },
    { title: "Queijo Mussarela 1kg", price: 42.90, store: "Carrefour", url: "" },
    { title: "Queijo Minas 500g", price: 22.90, store: "Extra", url: "" },
    { title: "Queijo Prato 1kg", price: 44.90, store: "Carrefour", url: "" },
    { title: "Queijo Parmesão 100g", price: 9.99, store: "Assaí", url: "" },
    { title: "Requeijão Cremoso 200g", price: 8.99, store: "Carrefour", url: "" },
  ],
  presunto: [
    { title: "Presunto 1kg", price: 24.90, store: "Assaí", url: "" },
    { title: "Presunto 1kg", price: 28.90, store: "Carrefour", url: "" },
    { title: "Peito de Peru 1kg", price: 36.90, store: "Extra", url: "" },
  ],
  polpa: [
    { title: "Polpa de Tomate 300g", price: 3.99, store: "Assaí", url: "" },
    { title: "Polpa de Tomate 300g", price: 4.49, store: "Carrefour", url: "" },
    { title: "Polpa de Fruta 100g", price: 5.99, store: "Extra", url: "" },
  ],
  iogurte: [
    { title: "Iogurte Natural 170g", price: 3.99, store: "Carrefour", url: "" },
    { title: "Iogurte Grego 200g", price: 5.99, store: "Assaí", url: "" },
  ],
  creme: [
    { title: "Creme de Leite Nestlé 200g", price: 4.99, store: "Carrefour", url: "" },
    { title: "Creme de Leite Piracanjuba 200g", price: 4.49, store: "Assaí", url: "" },
  ],
  doce: [
    { title: "Doce de Leite Viçosa 400g", price: 12.99, store: "Carrefour", url: "" },
    { title: "Doce de Leite 400g", price: 11.99, store: "Assaí", url: "" },
    { title: "Goiabada 300g", price: 8.99, store: "Extra", url: "" },
  ],
  granola: [
    { title: "Granola 250g", price: 10.99, store: "Carrefour", url: "" },
    { title: "Granola 500g", price: 18.99, store: "Assaí", url: "" },
    { title: "Aveia em Flocos 250g", price: 5.99, store: "Extra", url: "" },
  ],
  aveia: [
    { title: "Aveia em Flocos 250g", price: 5.99, store: "Extra", url: "" },
    { title: "Aveia em Flocos 1kg", price: 11.99, store: "Carrefour", url: "" },
  ],
  gelatina: [
    { title: "Gelatina em Pó 20g", price: 2.49, store: "Assaí", url: "" },
    { title: "Gelatina em Pó 20g", price: 2.99, store: "Carrefour", url: "" },
    { title: "Gelatina sem Sabor 12g", price: 3.99, store: "Extra", url: "" },
  ],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function tokenize(str: string): string[] {
  return normalize(str)
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

const STOP_WORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "com", "sem", "para", "por", "um", "uma", "uns", "umas", "o", "a",
  "os", "as", "e", "ou", "que", "se", "é", "sao", "tem", "mais",
  "muito", "pouco", "sobre", "entre", "como", "sua", "seu",
]);

function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

function fuzzyScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  if (a.length < 3 || b.length < 3) return 0;
  let matches = 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] === shorter[i]) matches++;
  }
  return matches / longer.length;
}

function getFallback(query: string): PriceResult[] {
  const qTokens = removeStopWords(tokenize(query));
  if (qTokens.length === 0) return [];

  let bestKey = "";
  let bestScore = 0;
  for (const key of Object.keys(FALLBACK)) {
    const kTokens = removeStopWords(tokenize(key));
    let totalScore = 0;
    for (const qt of qTokens) {
      let maxWordScore = 0;
      for (const kt of kTokens) {
        const s = fuzzyScore(qt, kt);
        if (s > maxWordScore) maxWordScore = s;
      }
      totalScore += maxWordScore;
    }
    const avg = totalScore / qTokens.length;
    if (avg > bestScore) {
      bestScore = avg;
      bestKey = key;
    }
  }

  if (bestScore >= 0.5 && bestKey) {
    return [...FALLBACK[bestKey]];
  }
  return [];
}

// --- Adapters ---

class SerpApiAdapter implements SearchAdapter {
  readonly name = "serpapi";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || "";
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async search(query: string): Promise<PriceResult[]> {
    try {
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&tbm=shop&hl=pt-BR&api_key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];

      const data = await res.json();
      const results: PriceResult[] = [];

      for (const item of data.shopping_results || []) {
        const price = parseFloat(String(item.price || "0").replace(/[^0-9.,]/g, "").replace(",", "."));
        if (price > 0) {
          results.push({
            title: item.title || query,
            price,
            store: item.store || item.source || "Loja online",
            url: item.link || item.product_link || "",
          });
        }
      }

      return results.slice(0, 8);
    } catch {
      return [];
    }
  }
}

class CheerioAdapter implements SearchAdapter {
  readonly name = "cheerio";

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<PriceResult[]> {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=pt-BR`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const html = await res.text();
      const { load } = await import("cheerio");
      const $: CheerioAPI = load(html);
      const results: PriceResult[] = [];

      $('[data-tts="results"] a, [jsname="UWckNb"] a, .BNeawe, .dr_header a').each((_, el) => {
        const text = $(el).text().trim();
        const priceMatch = text.match(/R?\$?\s*(\d+[.,]\d{2})/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(",", "."));
          const title = text.replace(priceMatch[0], "").trim().substring(0, 80);
          if (price > 0 && title.length > 5) {
            results.push({
              title: title.substring(0, 60),
              price,
              store: extractStore(text) || "Google Shopping",
              url: $(el).attr("href") || "",
            });
          }
        }
      });

      return results.slice(0, 5);
    } catch {
      return [];
    }
  }
}

const STORES = ["Assaí", "Carrefour", "Extra", "Pão de Açúcar", "Atacadão", "Sams Club", "Magazine Luiza", "Amazon", "Mercado Livre", "Shopee", "Americanas", "Hortifruti", "St Marche", "Oba"];

function extractStore(text: string): string {
  for (const store of STORES) {
    if (text.toLowerCase().includes(store.toLowerCase())) return store;
  }
  return "";
}

function generateFallbackResults(productName: string, brandName?: string): PriceResult[] {
  const q = `${productName} ${brandName || ""}`.trim();
  const fallback = getFallback(q);
  if (fallback.length > 0) return fallback;

  const qTokens = removeStopWords(tokenize(q));
  for (const token of qTokens) {
    const match = getFallback(token);
    if (match.length > 0) return match;
  }

  return [
    { title: `${productName}${brandName ? ` - ${brandName}` : ""} (preço estimado)`, price: Number((Math.random() * 20 + 5).toFixed(2)), store: "Mercado Local", url: "" },
    { title: `${productName}${brandName ? ` - ${brandName}` : ""} (preço estimado)`, price: Number((Math.random() * 25 + 8).toFixed(2)), store: "Supermercado Online", url: "" },
  ];
}

const adapters: SearchAdapter[] = [
  new SerpApiAdapter(),
  new CheerioAdapter(),
];

export async function searchProductPrice(
  productName: string,
  _location?: { lat: number; lng: number } | null,
  brandName?: string,
): Promise<PriceResult[]> {
  const query = `${productName} ${brandName || ""} preço supermercado brasil`.trim();

  for (const adapter of adapters) {
    if (!adapter.isAvailable()) continue;
    try {
      const results = await adapter.search(query);
      if (results.length >= 2) return results;
    } catch {
      // Fall through — adapter failed silently, try next
    }
  }

  return generateFallbackResults(productName, brandName);
}
```

---
## CSS Global
```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  --background: #0f0f0f;
  --foreground: #e5e5e5;
  color-scheme: dark;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
  transition: background-color 0.2s, color 0.2s;
}

/* --- DARK MODE RESET (always on) --- */
body,
[class*="bg-white"],
[class*="bg-gray-50"],
[class*="bg-gray-100"],
[class*="bg-slate-50"],
[class*="bg-slate-100"],
[class*="bg-emerald-50"],
[class*="bg-emerald-100"],
[class*="bg-blue-50"],
[class*="bg-blue-100"],
[class*="bg-amber-50"],
[class*="bg-amber-100"],
[class*="bg-red-50"],
[class*="bg-red-100"],
[class*="bg-purple-50"],
[class*="bg-purple-100"] {
  background-color: #1a1a2e !important;
}

/* Neutraliza Gradientes Claros */
[class*="from-white"],
[class*="from-gray-50"],
[class*="from-slate-50"],
[class*="from-emerald-50"],
[class*="from-amber-50"],
[class*="from-blue-50"] {
  --tw-gradient-from: #1a1a2e !important;
  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to) !important;
}

[class*="to-white"],
[class*="to-gray-50"],
[class*="to-slate-100"],
[class*="to-emerald-50"],
[class*="to-emerald-100"],
[class*="to-amber-50"] {
  --tw-gradient-to: #1a1a2e !important;
}

/* Ajuste de Contraste de Textos */
[class*="text-gray-900"],
[class*="text-gray-800"],
[class*="text-gray-700"],
[class*="text-gray-600"],
[class*="text-emerald-700"],
[class*="text-emerald-800"],
[class*="text-blue-700"],
[class*="text-amber-700"],
[class*="text-red-700"],
[class*="text-slate-800"] {
  color: #e5e5e5 !important;
}

[class*="text-gray-500"],
[class*="text-gray-400"] {
  color: #9ca3af !important;
}

input,
textarea,
select {
  background-color: #16162a !important;
  border-color: #2a2a3e !important;
  color: #e5e5e5 !important;
}

/* Glassmorphism escuro */
.glass,
.glass-card {
  background: rgba(26, 26, 46, 0.8) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

.glass-dark {
  background: rgba(23, 23, 23, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Print styles */
@media print {
  body { background: white !important; color: #000 !important; font-size: 11pt; }
  .no-print { display: none !important; }
  nav, header, footer, .fixed, .z-50, button, select, input, textarea { display: none !important; }
  * { box-shadow: none !important; text-shadow: none !important; }
  .hidden-print { display: none !important; }
  .print-only { display: block !important; }
  .print\:block { display: block !important; }
  .print\:hidden { display: none !important; }
  table { background: white !important; border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e2e8f0 !important; padding: 6px 8px !important; }
  tr { page-break-inside: avoid; }
  .max-w-4xl { max-width: 100% !important; margin: 0 !important; }
  .rounded-2xl { border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
  .bg-gradient-to-br, .bg-gradient-to-r { background: #f8fafc !important; }
  .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: none !important; }
  a { color: #000 !important; text-decoration: none !important; }
  h1, h2, h3 { page-break-after: avoid; }
}
```

---
## Utilitários

### prices.ts
```typescript
import type { CheerioAPI } from "cheerio";

export interface PriceResult {
  title: string;
  price: number;
  store: string;
  url: string;
}

interface SearchAdapter<T = unknown> {
  readonly name: string;
  isAvailable(): boolean;
  search(query: string): Promise<PriceResult[]>;
}

const FALLBACK: Record<string, PriceResult[]> = {
  farinha: [
    { title: "Farinha de Trigo Dona Benta 1kg", price: 5.49, store: "Assaí", url: "" },
    { title: "Farinha de Trigo Renata 1kg", price: 5.99, store: "Carrefour", url: "" },
    { title: "Farinha de Trigo Tradicional 1kg", price: 4.99, store: "Extra", url: "" },
    { title: "Farinha de Arroz 500g", price: 6.99, store: "Assaí", url: "" },
    { title: "Farinha de Mandioca 1kg", price: 7.49, store: "Carrefour", url: "" },
  ],
  acucar: [
    { title: "Açúcar Refinado União 1kg", price: 4.99, store: "Carrefour", url: "" },
    { title: "Açúcar Cristal 1kg", price: 3.99, store: "Assaí", url: "" },
    { title: "Açúcar Mascavo 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Açúcar de Confeiteiro 1kg", price: 9.49, store: "Extra", url: "" },
  ],
  arroz: [
    { title: "Arroz Tipo 1 Camil 5kg", price: 28.90, store: "Assaí", url: "" },
    { title: "Arroz Tipo 1 Tio João 5kg", price: 32.90, store: "Extra", url: "" },
    { title: "Arroz Integral 1kg", price: 8.99, store: "Carrefour", url: "" },
    { title: "Arroz Arbóreo 500g", price: 12.90, store: "Carrefour", url: "" },
  ],
  feijao: [
    { title: "Feijão Carioca Kicaldo 1kg", price: 8.49, store: "Carrefour", url: "" },
    { title: "Feijão Carioca Camil 1kg", price: 7.99, store: "Assaí", url: "" },
    { title: "Feijão Preto 1kg", price: 8.99, store: "Assaí", url: "" },
    { title: "Feijão Branco 500g", price: 9.99, store: "Carrefour", url: "" },
  ],
  leite: [
    { title: "Leite Integral Itambé 1L", price: 5.99, store: "Carrefour", url: "" },
    { title: "Leite Integral Piracanjuba 1L", price: 5.79, store: "Assaí", url: "" },
    { title: "Leite Desnatado 1L", price: 5.49, store: "Extra", url: "" },
    { title: "Leite Zero Lactose 1L", price: 7.99, store: "Carrefour", url: "" },
    { title: "Leite Condensado Moça 395g", price: 6.99, store: "Assaí", url: "" },
    { title: "Creme de Leite Nestlé 200g", price: 4.99, store: "Carrefour", url: "" },
    { title: "Leite em Pó Ninho 400g", price: 12.99, store: "Assaí", url: "" },
  ],
  oleo: [
    { title: "Óleo de Soja Liza 900ml", price: 8.49, store: "Assaí", url: "" },
    { title: "Óleo de Soja Soya 900ml", price: 8.29, store: "Carrefour", url: "" },
    { title: "Azeite de Oliva Extra Virgem 500ml", price: 24.90, store: "Carrefour", url: "" },
    { title: "Óleo de Coco 200ml", price: 14.90, store: "Assaí", url: "" },
  ],
  manteiga: [
    { title: "Manteiga Qualy 200g", price: 9.99, store: "Carrefour", url: "" },
    { title: "Manteiga Aviação 200g", price: 16.90, store: "Extra", url: "" },
    { title: "Margarina Doriana 500g", price: 7.99, store: "Assaí", url: "" },
  ],
  ovo: [
    { title: "Ovos Brancos 30un", price: 16.99, store: "Assaí", url: "" },
    { title: "Ovos Vermelhos Granja 12un", price: 10.99, store: "Carrefour", url: "" },
    { title: "Ovos Caipira 12un", price: 14.99, store: "Extra", url: "" },
  ],
  sal: [
    { title: "Sal Refinado Cisne 1kg", price: 2.99, store: "Assaí", url: "" },
    { title: "Sal Refinado 1kg", price: 2.79, store: "Carrefour", url: "" },
    { title: "Sal Marinho 1kg", price: 5.99, store: "Extra", url: "" },
    { title: "Sal Grosso 1kg", price: 3.49, store: "Assaí", url: "" },
  ],
  cafe: [
    { title: "Café Torrado Moído Pilão 500g", price: 18.90, store: "Carrefour", url: "" },
    { title: "Café Torrado Moído 3 Corações 500g", price: 17.99, store: "Assaí", url: "" },
    { title: "Café Solúvel Nescafé 200g", price: 15.99, store: "Extra", url: "" },
  ],
  chocolate: [
    { title: "Chocolate em Pó Nescau 400g", price: 9.99, store: "Assaí", url: "" },
    { title: "Chocolate em Pó Toddy 400g", price: 8.99, store: "Carrefour", url: "" },
    { title: "Chocolate Meio Amargo 70% 100g", price: 7.99, store: "Extra", url: "" },
    { title: "Chocolate Branco 100g", price: 6.99, store: "Assaí", url: "" },
    { title: "Cacau em Pó 100% 200g", price: 14.90, store: "Carrefour", url: "" },
  ],
  fermento: [
    { title: "Fermento Biológico Seco Fleischmann 10g", price: 3.99, store: "Assaí", url: "" },
    { title: "Fermento Químico Royal 100g", price: 6.49, store: "Carrefour", url: "" },
    { title: "Fermento Biológico Fresco 15g", price: 2.49, store: "Assaí", url: "" },
    { title: "Bicarbonato de Sódio 100g", price: 4.99, store: "Extra", url: "" },
  ],
  macarrao: [
    { title: "Macarrão Espaguete Adria 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Espaguete Renata 500g", price: 5.29, store: "Carrefour", url: "" },
    { title: "Macarrão Penne 500g", price: 4.99, store: "Assaí", url: "" },
    { title: "Macarrão Parafuso 500g", price: 4.99, store: "Extra", url: "" },
    { title: "Lasanha 500g", price: 6.99, store: "Carrefour", url: "" },
  ],
  batata: [
    { title: "Batata Inglesa 1kg", price: 4.99, store: "Hortifruti", url: "" },
    { title: "Batata Doce 1kg", price: 4.49, store: "Hortifruti", url: "" },
    { title: "Batata Asterix 1kg", price: 5.99, store: "Extra", url: "" },
  ],
  cebola: [
    { title: "Cebola 1kg", price: 5.99, store: "Hortifruti", url: "" },
    { title: "Cebola 1kg", price: 6.49, store: "Extra", url: "" },
    { title: "Cebola Roxa 1kg", price: 8.99, store: "Hortifruti", url: "" },
  ],
  alho: [
    { title: "Alho 100g", price: 3.99, store: "Hortifruti", url: "" },
    { title: "Alho 200g", price: 6.99, store: "Carrefour", url: "" },
    { title: "Alho Picado 300g", price: 8.99, store: "Assaí", url: "" },
  ],
  cenoura: [
    { title: "Cenoura 1kg", price: 3.99, store: "Hortifruti", url: "" },
    { title: "Cenoura 1kg", price: 4.99, store: "Extra", url: "" },
  ],
  tomate: [
    { title: "Tomate 1kg", price: 6.99, store: "Hortifruti", url: "" },
    { title: "Tomate 1kg", price: 7.49, store: "Extra", url: "" },
    { title: "Tomate Pelado Enlatado 400g", price: 5.99, store: "Carrefour", url: "" },
    { title: "Extrato de Tomate 300g", price: 4.99, store: "Assaí", url: "" },
  ],
  frango: [
    { title: "Peito de Frango 1kg", price: 19.99, store: "Assaí", url: "" },
    { title: "Peito de Frango 1kg", price: 22.99, store: "Carrefour", url: "" },
    { title: "Coxa de Frango 1kg", price: 12.99, store: "Assaí", url: "" },
    { title: "Frango Inteiro 1kg", price: 14.99, store: "Extra", url: "" },
  ],
  carne: [
    { title: "Carne Moída 1kg", price: 28.99, store: "Assaí", url: "" },
    { title: "Carne Moída 1kg", price: 32.99, store: "Carrefour", url: "" },
    { title: "Patinho 1kg", price: 36.90, store: "Assaí", url: "" },
    { title: "Coxão Mole 1kg", price: 38.90, store: "Carrefour", url: "" },
    { title: "Alcatra 1kg", price: 44.90, store: "Extra", url: "" },
  ],
  queijo: [
    { title: "Queijo Mussarela 1kg", price: 38.90, store: "Assaí", url: "" },
    { title: "Queijo Mussarela 1kg", price: 42.90, store: "Carrefour", url: "" },
    { title: "Queijo Minas 500g", price: 22.90, store: "Extra", url: "" },
    { title: "Queijo Prato 1kg", price: 44.90, store: "Carrefour", url: "" },
    { title: "Queijo Parmesão 100g", price: 9.99, store: "Assaí", url: "" },
    { title: "Requeijão Cremoso 200g", price: 8.99, store: "Carrefour", url: "" },
  ],
  presunto: [
    { title: "Presunto 1kg", price: 24.90, store: "Assaí", url: "" },
    { title: "Presunto 1kg", price: 28.90, store: "Carrefour", url: "" },
    { title: "Peito de Peru 1kg", price: 36.90, store: "Extra", url: "" },
  ],
  polpa: [
    { title: "Polpa de Tomate 300g", price: 3.99, store: "Assaí", url: "" },
    { title: "Polpa de Tomate 300g", price: 4.49, store: "Carrefour", url: "" },
    { title: "Polpa de Fruta 100g", price: 5.99, store: "Extra", url: "" },
  ],
  iogurte: [
    { title: "Iogurte Natural 170g", price: 3.99, store: "Carrefour", url: "" },
    { title: "Iogurte Grego 200g", price: 5.99, store: "Assaí", url: "" },
  ],
  creme: [
    { title: "Creme de Leite Nestlé 200g", price: 4.99, store: "Carrefour", url: "" },
    { title: "Creme de Leite Piracanjuba 200g", price: 4.49, store: "Assaí", url: "" },
  ],
  doce: [
    { title: "Doce de Leite Viçosa 400g", price: 12.99, store: "Carrefour", url: "" },
    { title: "Doce de Leite 400g", price: 11.99, store: "Assaí", url: "" },
    { title: "Goiabada 300g", price: 8.99, store: "Extra", url: "" },
  ],
  granola: [
    { title: "Granola 250g", price: 10.99, store: "Carrefour", url: "" },
    { title: "Granola 500g", price: 18.99, store: "Assaí", url: "" },
    { title: "Aveia em Flocos 250g", price: 5.99, store: "Extra", url: "" },
  ],
  aveia: [
    { title: "Aveia em Flocos 250g", price: 5.99, store: "Extra", url: "" },
    { title: "Aveia em Flocos 1kg", price: 11.99, store: "Carrefour", url: "" },
  ],
  gelatina: [
    { title: "Gelatina em Pó 20g", price: 2.49, store: "Assaí", url: "" },
    { title: "Gelatina em Pó 20g", price: 2.99, store: "Carrefour", url: "" },
    { title: "Gelatina sem Sabor 12g", price: 3.99, store: "Extra", url: "" },
  ],
};

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function tokenize(str: string): string[] {
  return normalize(str)
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

const STOP_WORDS = new Set([
  "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "com", "sem", "para", "por", "um", "uma", "uns", "umas", "o", "a",
  "os", "as", "e", "ou", "que", "se", "é", "sao", "tem", "mais",
  "muito", "pouco", "sobre", "entre", "como", "sua", "seu",
]);

function removeStopWords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOP_WORDS.has(t));
}

function fuzzyScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  if (a.length < 3 || b.length < 3) return 0;
  let matches = 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] === shorter[i]) matches++;
  }
  return matches / longer.length;
}

function getFallback(query: string): PriceResult[] {
  const qTokens = removeStopWords(tokenize(query));
  if (qTokens.length === 0) return [];

  let bestKey = "";
  let bestScore = 0;
  for (const key of Object.keys(FALLBACK)) {
    const kTokens = removeStopWords(tokenize(key));
    let totalScore = 0;
    for (const qt of qTokens) {
      let maxWordScore = 0;
      for (const kt of kTokens) {
        const s = fuzzyScore(qt, kt);
        if (s > maxWordScore) maxWordScore = s;
      }
      totalScore += maxWordScore;
    }
    const avg = totalScore / qTokens.length;
    if (avg > bestScore) {
      bestScore = avg;
      bestKey = key;
    }
  }

  if (bestScore >= 0.5 && bestKey) {
    return [...FALLBACK[bestKey]];
  }
  return [];
}

// --- Adapters ---

class SerpApiAdapter implements SearchAdapter {
  readonly name = "serpapi";
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || "";
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  async search(query: string): Promise<PriceResult[]> {
    try {
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&tbm=shop&hl=pt-BR&api_key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];

      const data = await res.json();
      const results: PriceResult[] = [];

      for (const item of data.shopping_results || []) {
        const price = parseFloat(String(item.price || "0").replace(/[^0-9.,]/g, "").replace(",", "."));
        if (price > 0) {
          results.push({
            title: item.title || query,
            price,
            store: item.store || item.source || "Loja online",
            url: item.link || item.product_link || "",
          });
        }
      }

      return results.slice(0, 8);
    } catch {
      return [];
    }
  }
}

class CheerioAdapter implements SearchAdapter {
  readonly name = "cheerio";

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<PriceResult[]> {
    try {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=pt-BR`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const html = await res.text();
      const { load } = await import("cheerio");
      const $: CheerioAPI = load(html);
      const results: PriceResult[] = [];

      $('[data-tts="results"] a, [jsname="UWckNb"] a, .BNeawe, .dr_header a').each((_, el) => {
        const text = $(el).text().trim();
        const priceMatch = text.match(/R?\$?\s*(\d+[.,]\d{2})/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1].replace(",", "."));
          const title = text.replace(priceMatch[0], "").trim().substring(0, 80);
          if (price > 0 && title.length > 5) {
            results.push({
              title: title.substring(0, 60),
              price,
              store: extractStore(text) || "Google Shopping",
              url: $(el).attr("href") || "",
            });
          }
        }
      });

      return results.slice(0, 5);
    } catch {
      return [];
    }
  }
}

const STORES = ["Assaí", "Carrefour", "Extra", "Pão de Açúcar", "Atacadão", "Sams Club", "Magazine Luiza", "Amazon", "Mercado Livre", "Shopee", "Americanas", "Hortifruti", "St Marche", "Oba"];

function extractStore(text: string): string {
  for (const store of STORES) {
    if (text.toLowerCase().includes(store.toLowerCase())) return store;
  }
  return "";
}

function generateFallbackResults(productName: string, brandName?: string): PriceResult[] {
  const q = `${productName} ${brandName || ""}`.trim();
  const fallback = getFallback(q);
  if (fallback.length > 0) return fallback;

  const qTokens = removeStopWords(tokenize(q));
  for (const token of qTokens) {
    const match = getFallback(token);
    if (match.length > 0) return match;
  }

  return [
    { title: `${productName}${brandName ? ` - ${brandName}` : ""} (preço estimado)`, price: Number((Math.random() * 20 + 5).toFixed(2)), store: "Mercado Local", url: "" },
    { title: `${productName}${brandName ? ` - ${brandName}` : ""} (preço estimado)`, price: Number((Math.random() * 25 + 8).toFixed(2)), store: "Supermercado Online", url: "" },
  ];
}

const adapters: SearchAdapter[] = [
  new SerpApiAdapter(),
  new CheerioAdapter(),
];

export async function searchProductPrice(
  productName: string,
  _location?: { lat: number; lng: number } | null,
  brandName?: string,
): Promise<PriceResult[]> {
  const query = `${productName} ${brandName || ""} preço supermercado brasil`.trim();

  for (const adapter of adapters) {
    if (!adapter.isAvailable()) continue;
    try {
      const results = await adapter.search(query);
      if (results.length >= 2) return results;
    } catch {
      // Fall through — adapter failed silently, try next
    }
  }

  return generateFallbackResults(productName, brandName);
}
```

### conversions.ts
```typescript
// Volume → gramas para ingredientes comuns (1 xícara = 240ml)
const VOLUME_TO_GRAMS: Record<string, number> = {
  "farinha de trigo": 120,
  "farinha": 120,
  "farinha de rosca": 100,
  "açúcar": 200,
  "açúcar refinado": 200,
  "açúcar cristal": 200,
  "açúcar mascavo": 180,
  "chocolate em pó": 100,
  "cacau em pó": 100,
  "achocolatado": 100,
  "leite em pó": 120,
  "manteiga": 200,
  "margarina": 200,
  "óleo": 240,
  "azeite": 240,
  "leite": 240,
  "creme de leite": 240,
  "iogurte": 240,
  "água": 240,
  "fermento em pó": 150,
  "fermento": 150,
  "amido de milho": 120,
  "maisena": 120,
  "fubá": 140,
  "fuba": 140,
  "milharina": 140,
  "aveia": 100,
  "cereal": 100,
  "granola": 120,
  "castanha": 140,
  "noz": 120,
  "amêndoa": 120,
  "amendoim": 140,
  "coco ralado": 100,
  "queijo ralado": 100,
  "parmesão ralado": 100,
  "presunto picado": 140,
  "arroz": 200,
  "feijão": 200,
  "lentilha": 200,
  "grão de bico": 200,
  "ervilha seca": 200,
};

// Peso médio em gramas por unidade de alimentos
const UNIT_WEIGHT: Record<string, number> = {
  "ovo": 50,
  "ovos": 50,
  "tomate": 150,
  "tomates": 150,
  "cebola": 150,
  "cebolas": 150,
  "cenoura": 100,
  "cenouras": 100,
  "batata": 200,
  "batatas": 200,
  "batata inglesa": 200,
  "batata doce": 200,
  "mandioca": 300,
  "pimentão": 150,
  "pimentões": 150,
  "pimentao": 150,
  "berinjela": 200,
  "abobrinha": 200,
  "chuchu": 150,
  "pepino": 150,
  "limão": 100,
  "limoes": 100,
  "limão tahiti": 80,
  "laranja": 200,
  "laranjas": 200,
  "banana": 100,
  "bananas": 100,
  "maçã": 150,
  "macas": 150,
  "maca": 150,
  "pera": 150,
  "manga": 300,
  "abacate": 400,
  "goiaba": 150,
  "mamão": 500,
  "mamao": 500,
  "alface": 150,
  "couve": 200,
  "espinafre": 100,
  "brócolis": 200,
  "brocolis": 200,
  "couve-flor": 400,
  "repolho": 500,
  "dente de alho": 5,
  "dentes de alho": 5,
  "alho dente": 5,
  "alho": 3,
  "ramo de salsinha": 10,
  "ramo de cebolinha": 10,
  "folha de louro": 1,
  "folhas de louro": 1,
};

// Palavras para remover do nome do ingrediente ao buscar produto
const STOP_WORDS = [
  "de", "da", "do", "das", "dos", "em", "com", "sem", "para", "a", "o", "as", "os", "e",
  "picado", "picada", "picados", "picadas",
  "ralado", "ralada", "ralados", "raladas",
  "fatiado", "fatiada", "fatiados", "fatiadas",
  "moido", "moida", "moída", "moído",
  "refogado", "refogada",
  "cozido", "cozida",
  "assado", "assada",
  "grelhado", "grelhada",
  "desfiado", "desfiada",
  "cortado", "cortada",
  "fresco", "fresca",
  "seco", "seca",
  "tempero", "temperos",
  "sal", "pimenta", "pimenta do reino", "orégano", "oregano",
  "a gosto", "à gosto",
];

export interface ParsedIngredient {
  name: string;
  cleanName: string;
  quantity: number;
  originalUnit: string;
  convertedUnit: string;
  convertedQuantity: number;
  productId: string | null;
  productName: string | null;
  productPrice: number;
  productUnit: string;
  estimatedCost: number;
  skipCalculation: boolean;
}

export function normalizeIngredientName(name: string): string {
  let clean = name.toLowerCase().trim();
  for (const word of STOP_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    clean = clean.replace(regex, "");
  }
  clean = clean.replace(/\s+/g, " ").trim();
  return clean;
}

export function matchProduct(
  name: string,
  products: { id: string; name: string; unit: string; averagePrice: number }[]
): { id: string; name: string; unit: string; averagePrice: number } | null {
  const clean = normalizeIngredientName(name);
  const lower = clean;

  // Tenta match exato
  let match = products.find((p) => p.name.toLowerCase() === lower);
  if (match) return match;

  // Tenta match parcial (nome do produto contém o termo ou vice-versa)
  match = products.find(
    (p) =>
      lower.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(lower)
  );
  if (match) return match;

  // Tenta com palavras-chave (primeira palavra significativa)
  const words = lower.split(" ").filter((w) => w.length > 2);
  for (const word of words) {
    match = products.find((p) =>
      p.name.toLowerCase().includes(word)
    );
    if (match) return match;
  }

  return null;
}

export function shouldSkipCalculation(name: string): boolean {
  const lower = name.toLowerCase();
  const skipWords = [
    "sal", "pimenta", "orégano", "oregano", "tempero", "temperos",
    "a gosto", "à gosto", "q.b.", "q.b", "quanto baste",
    "água", "agua", "gelo", "óleo para fritar", "oleo para fritar",
    "gordura", "manteiga para untar",
  ];
  return skipWords.some((w) => lower.includes(w));
}

export function convertIngredient(
  name: string,
  quantity: number,
  unit: string,
  products: { id: string; name: string; unit: string; averagePrice: number }[]
): ParsedIngredient {
  const skip = shouldSkipCalculation(name);
  if (skip) {
    return {
      name,
      cleanName: normalizeIngredientName(name),
      quantity,
      originalUnit: unit,
      convertedUnit: unit,
      convertedQuantity: quantity,
      productId: null,
      productName: null,
      productPrice: 0,
      productUnit: unit,
      estimatedCost: 0,
      skipCalculation: true,
    };
  }

  const cleanName = normalizeIngredientName(name);
  let convQty = quantity;
  let convUnit = unit;
  const product = matchProduct(name, products);

  // Conversão de volume → peso
  if (["xícara", "xicara", "xícaras", "xicaras"].includes(unit)) {
    const gPerCup = VOLUME_TO_GRAMS[cleanName] || VOLUME_TO_GRAMS[Object.keys(VOLUME_TO_GRAMS).find((k) => cleanName.includes(k)) || ""] || 120;
    convQty = quantity * gPerCup;
    convUnit = "g";
  }
  if (["colher", "colheres"].includes(unit)) {
    const base = VOLUME_TO_GRAMS[cleanName] || VOLUME_TO_GRAMS[Object.keys(VOLUME_TO_GRAMS).find((k) => cleanName.includes(k)) || ""];
    colher: if (base) {
      // 1 colher de sopa ≈ 1/16 da xícara ≈ 15ml
      const gPerTbsp = base / 16;
      convQty = quantity * gPerTbsp;
      convUnit = "g";
    } else {
      // Sem referência, assume 15g por colher de sopa
      convQty = quantity * 15;
      convUnit = "g";
    }
  }
  if (["copo", "copos"].includes(unit)) {
    // 1 copo ≈ 240ml, trata como xícara
    const gPerCup = VOLUME_TO_GRAMS[cleanName] || VOLUME_TO_GRAMS[Object.keys(VOLUME_TO_GRAMS).find((k) => cleanName.includes(k)) || ""] || 120;
    convQty = quantity * gPerCup;
    convUnit = "g";
  }

  // Conversão de unidades (ex: 1 tomate → gramas)
  if (unit === "un" && quantity > 0) {
    const avgWeight = UNIT_WEIGHT[cleanName] || UNIT_WEIGHT[Object.keys(UNIT_WEIGHT).find((k) => cleanName.includes(k)) || ""];
    if (avgWeight && product && product.unit === "kg") {
      convQty = quantity * avgWeight;
      convUnit = "g";
    }
  }

  // Converte gramas para kg se necessário para cálculo
  let calcQty = convQty;
  let calcUnit = convUnit;
  if (convUnit === "g" && convQty > 0) {
    calcQty = convQty / 1000;
    calcUnit = "kg";
  }
  if (convUnit === "ml" && convQty > 0) {
    calcQty = convQty / 1000;
    calcUnit = "L";
  }

  let estimatedCost = 0;
  if (product && (product.averagePrice ?? 0) > 0) {
    const price = product.averagePrice ?? 0;
    if (calcUnit === "kg" && product.unit === "kg") {
      estimatedCost = calcQty * price;
    } else if (calcUnit === "L" && product.unit === "L") {
      estimatedCost = calcQty * price;
    } else if (product.unit === "un") {
      estimatedCost = quantity * price;
    } else if (product.unit === "kg" && unit === "un") {
      estimatedCost = (convQty / 1000) * price;
    } else if (product.unit === "kg" && calcUnit === "g") {
      const kg = convQty / 1000;
      estimatedCost = kg * price;
    } else {
      estimatedCost = quantity * price;
    }
  }

  return {
    name,
    cleanName,
    quantity,
    originalUnit: unit,
    convertedUnit: convUnit,
    convertedQuantity: convQty,
    productId: product?.id || null,
    productName: product?.name || null,
    productPrice: product?.averagePrice || 0,
    productUnit: product?.unit || unit,
    estimatedCost,
    skipCalculation: false,
  };
}
```

### rate-limit.ts
```typescript
import { logger } from "./logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const FIVE_MIN = 5 * 60 * 1000;
const ONE_MIN = 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, ONE_MIN);

export function rateLimit(key: string, maxAttempts: number, windowMs: number = FIVE_MIN): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }

  if (entry.count >= maxAttempts) {
    logger.warn("Rate limit exceeded", { key });
    return { ok: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { ok: true, remaining: maxAttempts - entry.count, resetIn: entry.resetAt - now };
}
```