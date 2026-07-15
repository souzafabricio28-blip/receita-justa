import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await hash("admin123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@receita.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@receita.com",
      password,
    },
  });

  console.log("Admin criado:", user.email, "/ senha: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
