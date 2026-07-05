import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const email = process.env.DEV_USER_EMAIL ?? "gprep399@gmail.com";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Nikhil" },
  });
  console.log(`Dev user ready: ${user.name} <${user.email}> (${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
