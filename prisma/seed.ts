// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding admin user...");

  // Buat user admin default
  const adminEmail = "admin@trip.com";
  const password = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password,
      name: "Administrator",
      whatsapp: "0000000000",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Admin user created:", adminEmail);
}

main()
  .then(() => {
    console.log("✅ Seeding completed!");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
