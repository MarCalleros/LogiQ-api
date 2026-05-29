import "dotenv/config";

import bcrypt from "bcryptjs";

async function main() {
  const { prisma } = await import("../src/lib/prisma.js");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@gmail.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
  const businessName = process.env.SEED_BUSINESS_NAME ?? "Negocio principal";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existing = await prisma.user.findUnique({ where: { email: adminEmail }, include: { business: true } });

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        name: "Administrador",
        email: adminEmail,
        role: "ADMINISTRADOR",
        passwordHash,
      },
    });

    const business = await prisma.business.create({
      data: {
        name: businessName,
        ownerUserId: user.id,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { businessId: business.id },
    });
  } else {
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        name: "Administrador",
        role: "ADMINISTRADOR",
        passwordHash,
        isDeleted: false,
        deletedAt: null,
        isActive: true,
      },
    });

    if (existing.business) {
      await prisma.business.update({
        where: { id: existing.business.id },
        data: { name: businessName },
      });
    } else {
      const business = await prisma.business.create({
        data: {
          name: businessName,
          ownerUserId: existing.id,
        },
      });

      await prisma.user.update({
        where: { id: existing.id },
        data: { businessId: business.id },
      });
    }
  }

  console.log(`Seed admin listo: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exitCode = 1;
  });
