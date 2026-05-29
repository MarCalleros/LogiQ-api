import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http-error.js";
const createDriverSchema = z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(30).optional(),
    localId: z.string().uuid().optional(),
    password: z.string().min(8).max(72).optional(),
});
const updateDriverSchema = z.object({
    name: z.string().trim().min(2).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(30).optional(),
    localId: z.string().uuid().nullable().optional(),
    password: z.string().min(8).max(72).optional(),
    isActive: z.boolean().optional(),
});
function slugifyName(value) {
    const slug = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "");
    return slug || "repartidor";
}
function generateIdentifier(name) {
    const suffix = randomUUID().slice(0, 8);
    return `${slugifyName(name)}.${suffix}@logiq.local`;
}
function generateTempPassword() {
    return randomBytes(12).toString("base64url");
}
function resolveCredentials(name, email, password) {
    return {
        email: email?.toLowerCase() ?? generateIdentifier(name),
        password: password ?? generateTempPassword(),
    };
}
export const driversService = {
    async getById(id, businessId) {
        const driver = await prisma.user.findFirst({
            where: {
                id,
                role: "REPARTIDOR",
                isDeleted: false,
                businessId: businessId ?? undefined,
            },
            include: {
                local: true,
            },
        });
        if (!driver) {
            throw new HttpError(404, "Repartidor no encontrado");
        }
        return driver;
    },
    async list(search, businessId, localId) {
        const query = search?.trim() ?? "";
        return prisma.user.findMany({
            where: {
                role: "REPARTIDOR",
                isDeleted: false,
                businessId: businessId ?? undefined,
                ...(localId ? { localId } : {}),
                ...(query
                    ? {
                        OR: [
                            { name: { contains: query, mode: "insensitive" } },
                            { email: { contains: query, mode: "insensitive" } },
                            { phone: { contains: query, mode: "insensitive" } },
                            { local: { name: { contains: query, mode: "insensitive" } } },
                        ],
                    }
                    : {}),
            },
            include: {
                local: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    },
    async create(input, businessId) {
        const parsed = createDriverSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para crear repartidor");
        }
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        const credentials = resolveCredentials(parsed.data.name, parsed.data.email, parsed.data.password);
        const email = credentials.email;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing && !existing.isDeleted) {
            throw new HttpError(409, "El correo ya esta registrado");
        }
        if (parsed.data.localId) {
            const local = await prisma.local.findFirst({ where: { id: parsed.data.localId, isDeleted: false } });
            if (!local) {
                throw new HttpError(404, "Local no encontrado");
            }
        }
        const passwordHash = await bcrypt.hash(credentials.password, 12);
        return existing
            ? prisma.user.update({
                where: { email },
                data: {
                    name: parsed.data.name,
                    role: "REPARTIDOR",
                    phone: parsed.data.phone ?? null,
                    businessId,
                    localId: parsed.data.localId ?? null,
                    passwordHash,
                    isDeleted: false,
                    deletedAt: null,
                },
                include: { local: true },
            })
            : prisma.user.create({
                data: {
                    name: parsed.data.name,
                    email,
                    role: "REPARTIDOR",
                    phone: parsed.data.phone ?? null,
                    businessId,
                    localId: parsed.data.localId ?? null,
                    passwordHash,
                },
                include: { local: true },
            });
    },
    async update(id, input, businessId) {
        const parsed = updateDriverSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para actualizar repartidor");
        }
        const current = await prisma.user.findFirst({
            where: {
                id,
                role: "REPARTIDOR",
                isDeleted: false,
                businessId: businessId ?? undefined,
            },
        });
        if (!current) {
            throw new HttpError(404, "Repartidor no encontrado");
        }
        const nextEmail = parsed.data.email?.toLowerCase() ?? current.email;
        if (nextEmail !== current.email) {
            const existsWithEmail = await prisma.user.findUnique({ where: { email: nextEmail } });
            if (existsWithEmail && !existsWithEmail.isDeleted) {
                throw new HttpError(409, "El correo ya esta registrado");
            }
        }
        if (parsed.data.localId) {
            const local = await prisma.local.findFirst({ where: { id: parsed.data.localId, isDeleted: false } });
            if (!local) {
                throw new HttpError(404, "Local no encontrado");
            }
        }
        const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : undefined;
        return prisma.user.update({
            where: { id: current.id },
            data: {
                name: parsed.data.name,
                email: nextEmail,
                phone: parsed.data.phone,
                businessId,
                localId: parsed.data.localId === null ? null : parsed.data.localId,
                passwordHash,
                isActive: parsed.data.isActive,
            },
            include: { local: true },
        });
    },
    async remove(id, businessId) {
        const current = await prisma.user.findFirst({
            where: {
                id,
                role: "REPARTIDOR",
                isDeleted: false,
                businessId: businessId ?? undefined,
            },
        });
        if (!current) {
            throw new HttpError(404, "Repartidor no encontrado");
        }
        await prisma.user.update({
            where: { id: current.id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
    },
};
