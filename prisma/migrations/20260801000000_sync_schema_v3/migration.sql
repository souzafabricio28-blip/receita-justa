-- CreateTable Brand
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");
CREATE INDEX "Brand_name_idx" ON "Brand"("name");

-- AlterTable Product: estoque e marca
ALTER TABLE "Product" ADD COLUMN "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "brandId" TEXT;

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove estruturas obsoletas (ProductCategory / categoria antiga)
ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";
DROP INDEX IF EXISTS "Product_categoryId_idx";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "category";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "categoryId";
DROP TABLE IF EXISTS "ProductCategory";
