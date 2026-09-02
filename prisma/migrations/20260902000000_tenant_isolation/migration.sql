-- Isolate catalog, stock and categories per user + webhook idempotency

ALTER TABLE "Category" ADD COLUMN "userId" TEXT;
ALTER TABLE "Brand" ADD COLUMN "userId" TEXT;
ALTER TABLE "Product" ADD COLUMN "userId" TEXT;
ALTER TABLE "Purchase" ADD COLUMN "userId" TEXT;

UPDATE "Category" SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL AND EXISTS (SELECT 1 FROM "User");
UPDATE "Brand" SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL AND EXISTS (SELECT 1 FROM "User");
UPDATE "Product" SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL AND EXISTS (SELECT 1 FROM "User");
UPDATE "Purchase" AS p SET "userId" = pr."userId"
FROM "Product" AS pr
WHERE p."productId" = pr.id AND p."userId" IS NULL;

DELETE FROM "Purchase" WHERE "userId" IS NULL;
DELETE FROM "RecipeProduct" WHERE "productId" IN (SELECT id FROM "Product" WHERE "userId" IS NULL);
DELETE FROM "Product" WHERE "userId" IS NULL;
DELETE FROM "Brand" WHERE "userId" IS NULL;
UPDATE "Recipe" SET "categoryId" = NULL WHERE "categoryId" IN (SELECT id FROM "Category" WHERE "userId" IS NULL);
DELETE FROM "Category" WHERE "userId" IS NULL;

ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Brand" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Purchase" ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX IF EXISTS "Category_name_key";
DROP INDEX IF EXISTS "Category_slug_key";
DROP INDEX IF EXISTS "Brand_name_key";

CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");
CREATE UNIQUE INDEX "Category_userId_slug_key" ON "Category"("userId", "slug");
CREATE UNIQUE INDEX "Brand_userId_name_key" ON "Brand"("userId", "name");

CREATE INDEX "Category_userId_idx" ON "Category"("userId");
CREATE INDEX "Brand_userId_idx" ON "Brand"("userId");
CREATE INDEX "Product_userId_idx" ON "Product"("userId");
CREATE INDEX "Product_userId_name_idx" ON "Product"("userId", "name");
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
