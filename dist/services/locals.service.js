import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http-error.js";
const createLocalSchema = z.object({
    name: z.string().trim().min(2).max(80),
    manager: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^\d{10}$/),
    state: z.string().trim().min(2).max(80),
    municipality: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().regex(/^\d{5}$/),
    street: z.string().trim().min(2).max(120),
    posX: z.number().finite().optional(),
    posY: z.number().finite().optional(),
    isActive: z.boolean().optional(),
});
const updateLocalSchema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    manager: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().regex(/^\d{10}$/).optional(),
    state: z.string().trim().min(2).max(80).optional(),
    municipality: z.string().trim().min(2).max(80).optional(),
    city: z.string().trim().min(2).max(80).optional(),
    postalCode: z.string().trim().regex(/^\d{5}$/).optional(),
    street: z.string().trim().min(2).max(120).optional(),
    posX: z.number().finite().optional(),
    posY: z.number().finite().optional(),
    isActive: z.boolean().optional(),
});
export const localsService = {
    async getById(id, businessId) {
        const local = await prisma.local.findFirst({
            where: { id, businessId: businessId ?? undefined },
        });
        if (!local || local.isDeleted) {
            throw new HttpError(404, "Local no encontrado");
        }
        return local;
    },
    async list(search, businessId, localId) {
        const query = search?.trim() ?? "";
        return prisma.local.findMany({
            where: {
                isDeleted: false,
                businessId: businessId ?? undefined,
                ...(localId ? { id: localId } : {}),
                ...(query
                    ? {
                        OR: [
                            { name: { contains: query, mode: "insensitive" } },
                            { manager: { contains: query, mode: "insensitive" } },
                            { phone: { contains: query, mode: "insensitive" } },
                            { state: { contains: query, mode: "insensitive" } },
                            { municipality: { contains: query, mode: "insensitive" } },
                            { city: { contains: query, mode: "insensitive" } },
                            { postalCode: { contains: query, mode: "insensitive" } },
                            { street: { contains: query, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    },
    async create(input, businessId) {
        const parsed = createLocalSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para crear local");
        }
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        return prisma.local.create({
            data: {
                name: parsed.data.name,
                manager: parsed.data.manager,
                phone: parsed.data.phone,
                businessId,
                state: parsed.data.state,
                municipality: parsed.data.municipality,
                city: parsed.data.city,
                postalCode: parsed.data.postalCode,
                street: parsed.data.street,
                posX: parsed.data.posX,
                posY: parsed.data.posY,
                isActive: parsed.data.isActive ?? true,
            },
        });
    },
    async update(id, input, businessId) {
        const parsed = updateLocalSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para actualizar local");
        }
        const current = await prisma.local.findFirst({ where: { id, isDeleted: false, businessId: businessId ?? undefined } });
        if (!current) {
            throw new HttpError(404, "Local no encontrado");
        }
        return prisma.local.update({
            where: { id },
            data: {
                name: parsed.data.name,
                manager: parsed.data.manager,
                phone: parsed.data.phone,
                state: parsed.data.state,
                municipality: parsed.data.municipality,
                city: parsed.data.city,
                postalCode: parsed.data.postalCode,
                street: parsed.data.street,
                posX: parsed.data.posX,
                posY: parsed.data.posY,
                isActive: parsed.data.isActive,
            },
        });
    },
    async remove(id, businessId) {
        const current = await prisma.local.findFirst({ where: { id, isDeleted: false, businessId: businessId ?? undefined } });
        if (!current) {
            throw new HttpError(404, "Local no encontrado");
        }
        await prisma.local.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
    },
};
