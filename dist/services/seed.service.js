import bcrypt from "bcryptjs";
export async function seedAdminUser() {
    const { prisma } = await import("../lib/prisma.js");
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@gmail.com";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!";
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            name: "Administrador",
            role: "ADMINISTRADOR",
            passwordHash,
            isDeleted: false,
            deletedAt: null,
        },
        create: {
            name: "Administrador",
            email: adminEmail,
            role: "ADMINISTRADOR",
            passwordHash,
        },
    });
    console.log(`Seed admin listo: ${adminEmail}`);
}
