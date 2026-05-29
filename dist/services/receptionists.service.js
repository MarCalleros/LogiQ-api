import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http-error.js";
const createReceptionistSchema = z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(30).optional(),
    localId: z.string().uuid().optional(),
    password: z.string().min(8).max(72).optional(),
});
const updateReceptionistSchema = z.object({
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
    return slug || "recepcionista";
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
function mapReceptionist(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        localId: user.localId,
        localName: user.local?.name ?? null,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
export const receptionistsService = {
    async getById(id, businessId) {
        const user = await prisma.user.findFirst({
            where: { id, role: "RECEPCIONISTA", isDeleted: false, businessId: businessId ?? undefined },
            include: { local: true },
        });
        if (!user) {
            throw new HttpError(404, "Recepcionista no encontrado");
        }
        return mapReceptionist({ ...user, role: "RECEPCIONISTA" });
    },
    async list(search, businessId) {
        const normalizedSearch = search?.trim() ?? "";
        const users = await prisma.user.findMany({
            where: {
                role: "RECEPCIONISTA",
                isDeleted: false,
                businessId: businessId ?? undefined,
                ...(normalizedSearch
                    ? {
                        OR: [
                            { name: { contains: normalizedSearch, mode: "insensitive" } },
                            { email: { contains: normalizedSearch, mode: "insensitive" } },
                            { phone: { contains: normalizedSearch, mode: "insensitive" } },
                            {
                                local: {
                                    is: {
                                        name: { contains: normalizedSearch, mode: "insensitive" },
                                    },
                                },
                            },
                        ],
                    }
                    : {}),
            },
            include: { local: true },
            orderBy: { createdAt: "desc" },
        });
        return users.map((user) => mapReceptionist({ ...user, role: "RECEPCIONISTA" }));
    },
    async create(input, businessId) {
        const parsed = createReceptionistSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para crear recepcionista");
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
        const user = existing
            ? await prisma.user.update({
                where: { email },
                data: {
                    name: parsed.data.name,
                    role: "RECEPCIONISTA",
                    phone: parsed.data.phone ?? null,
                    businessId,
                    localId: parsed.data.localId ?? null,
                    passwordHash,
                    needsPasswordReset: true,
                    isDeleted: false,
                    deletedAt: null,
                },
                include: { local: true },
            })
            : await prisma.user.create({
                data: {
                    name: parsed.data.name,
                    email,
                    role: "RECEPCIONISTA",
                    phone: parsed.data.phone ?? null,
                    businessId,
                    localId: parsed.data.localId ?? null,
                    passwordHash,
                    needsPasswordReset: true,
                },
                include: { local: true },
            });
        return mapReceptionist({ ...user, role: "RECEPCIONISTA" });
    },
    async update(id, input, businessId) {
        const parsed = updateReceptionistSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para actualizar recepcionista");
        }
        const current = await prisma.user.findFirst({
            where: { id, role: "RECEPCIONISTA", isDeleted: false, businessId: businessId ?? undefined },
        });
        if (!current) {
            throw new HttpError(404, "Recepcionista no encontrado");
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
        const user = await prisma.user.update({
            where: { id: current.id },
            data: {
                name: parsed.data.name,
                email: nextEmail,
                phone: parsed.data.phone,
                businessId,
                localId: parsed.data.localId === null ? null : parsed.data.localId,
                passwordHash,
                needsPasswordReset: passwordHash ? true : undefined,
                isActive: parsed.data.isActive,
            },
            include: { local: true },
        });
        return mapReceptionist({ ...user, role: "RECEPCIONISTA" });
    },
    async remove(id, businessId) {
        const current = await prisma.user.findFirst({
            where: { id, role: "RECEPCIONISTA", isDeleted: false, businessId: businessId ?? undefined },
        });
        if (!current) {
            throw new HttpError(404, "Recepcionista no encontrado");
        }
        await prisma.user.update({
            where: { id: current.id },
            data: { isDeleted: true, deletedAt: new Date() },
        });
    },
};
