import { Client } from "pg";
import * as fs from "fs";

const line = fs.readFileSync("C:/Users/souza/Documents/Projetos/receita-justa/.env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL="))!;
const url = line.replace("DATABASE_URL=", "").replace(/^"/, "").replace(/"$/, "");

const FIXES: { nameLike: string; unit: string }[] = [
  { nameLike: "ovo", unit: "un" },
];

async function main() {
  const c = new Client({ connectionString: url });
  await c.connect();
  for (const fix of FIXES) {
    const r = await c.query(
      `UPDATE "Product" SET unit=$1 WHERE name ILIKE $2 RETURNING id, name, unit`,
      [fix.unit, `%${fix.nameLike}%`]
    );
    console.log(`Fix '${fix.nameLike}' -> '${fix.unit}':`, JSON.stringify(r.rows));
  }
  await c.end();
}
main().catch((e) => console.log("ERRO", e.message));
