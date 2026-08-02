WITH product_stats AS (
  SELECT
    rp."productId",
    percentile_cont(0.5) WITHIN GROUP (ORDER BY rp.quantity) AS median_qty
  FROM "RecipeProduct" rp
  GROUP BY rp."productId"
)
UPDATE "Product" p
SET "averagePrice" = p."averagePrice" / ps.median_qty
FROM product_stats ps
WHERE p.id = ps."productId"
  AND p.unit IN ('g', 'ml')
  AND p."averagePrice" > 0
  AND ps.median_qty > 0
  AND p."averagePrice" * ps.median_qty > 20;
