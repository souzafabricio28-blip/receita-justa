-- CreateTable: ProductCategory (normalizacao da categoria como FK)
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- Unique indexes for ProductCategory
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");
CREATE INDEX "ProductCategory_slug_idx" ON "ProductCategory"("slug");

-- Add categoryId column to Product (nullable FK)
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Performance indexes for User
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- Performance indexes for Subscription
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_mpPreferenceId_idx" ON "Subscription"("mpPreferenceId");

-- Performance indexes for Recipe
CREATE INDEX "Recipe_createdById_idx" ON "Recipe"("createdById");
CREATE INDEX "Recipe_categoryId_idx" ON "Recipe"("categoryId");
CREATE INDEX "Recipe_createdById_createdAt_idx" ON "Recipe"("createdById", "createdAt");

-- Performance indexes for Product
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_name_unit_idx" ON "Product"("name", "unit");

-- Performance indexes for Purchase
CREATE INDEX "Purchase_productId_idx" ON "Purchase"("productId");
CREATE INDEX "Purchase_productId_date_idx" ON "Purchase"("productId", "date");
CREATE INDEX "Purchase_date_idx" ON "Purchase"("date");

-- Performance indexes for RecipeProduct
CREATE INDEX "RecipeProduct_recipeId_idx" ON "RecipeProduct"("recipeId");
CREATE INDEX "RecipeProduct_productId_idx" ON "RecipeProduct"("productId");

-- Performance indexes for ProfitCalculation
CREATE INDEX "ProfitCalculation_userId_idx" ON "ProfitCalculation"("userId");
CREATE INDEX "ProfitCalculation_recipeId_idx" ON "ProfitCalculation"("recipeId");
CREATE INDEX "ProfitCalculation_userId_createdAt_idx" ON "ProfitCalculation"("userId", "createdAt");
