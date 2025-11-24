const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding admin user...");

  const adminUsername = "admin";
  const password = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password,
      name: "Administrator",
      whatsapp: "0000000000",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Admin user created:", adminUsername);
}

main()
  .then(() => {
    console.log("✅ Seeding completed!");
  })
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
