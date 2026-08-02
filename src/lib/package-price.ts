export interface PackageQty {
  qty: number;
  unit: string;
}

const UNIT_MAP: Record<string, string> = {
  un: "un", unid: "un", und: "un", unidade: "un", unidades: "un", unds: "un",
  kg: "kg", kilo: "kg", kilos: "kg", quilo: "kg", quilos: "kg",
  g: "g", gr: "g", grama: "g", gramas: "g",
  l: "L", litro: "L", litros: "L",
  ml: "ml", mililitro: "ml", mililitros: "ml",
};

const TO_GRAMS: Record<string, number> = { g: 1, kg: 1000 };
const TO_ML: Record<string, number> = { ml: 1, L: 1000 };

export function parsePackageQuantity(title: string): PackageQty | null {
  const m = title.match(
    /(\d+[\.,]?\d*)\s*(un|unid|unidades|unds|und|kg|kilo|kilos|quilo|quilos|g|gr|gramas?|l|litros?|ml|mililitros?)\b/i
  );
  if (!m) return null;
  const qty = parseFloat(m[1].replace(",", "."));
  if (!(qty > 0)) return null;
  const unit = UNIT_MAP[m[2].toLowerCase()];
  if (!unit) return null;
  return { qty, unit };
}

export function unitPriceFromResult(title: string, price: number, productUnit: string): number {
  if (!title || !(price > 0)) return price;
  const pkg = parsePackageQuantity(title);
  if (!pkg) return price;

  const pu = (productUnit || "").toLowerCase();

  if (pkg.unit === "un" && (pu === "un" || pu === "unidade" || pu === "unidades")) {
    return price / pkg.qty;
  }
  if (TO_GRAMS[pkg.unit] && TO_GRAMS[pu]) {
    const perGram = price / (pkg.qty * TO_GRAMS[pkg.unit]);
    return perGram * TO_GRAMS[pu];
  }
  if (TO_ML[pkg.unit] && TO_ML[pu]) {
    const perMl = price / (pkg.qty * TO_ML[pkg.unit]);
    return perMl * TO_ML[pu];
  }
  return price;
}

export function packageSizePenalty(title: string): number {
  if (!title) return 0;
  const pkg = parsePackageQuantity(title);
  if (!pkg) return 0;
  if (TO_GRAMS[pkg.unit] && pkg.qty * TO_GRAMS[pkg.unit] >= 3000) return -0.3;
  if (TO_ML[pkg.unit] && pkg.qty * TO_ML[pkg.unit] >= 3000) return -0.3;
  if (pkg.unit === "un" && pkg.qty >= 24) return -0.2;
  return 0;
}

export function unitPriceFromMarket(
  title: string,
  price: number,
  productUnit: string,
  recipeQuantity: number
): number {
  const perUnit = unitPriceFromResult(title, price, productUnit);
  if (perUnit !== price) return perUnit;
  return recipeQuantity > 0 ? price / recipeQuantity : price;
}
