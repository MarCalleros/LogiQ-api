import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http-error.js";
const createProductSchema = z.object({
    name: z.string().trim().min(2).max(80),
    price: z.number().finite().positive(),
    description: z.string().trim().min(4).max(160),
    isActive: z.boolean().optional(),
});
const updateProductSchema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    price: z.number().finite().positive().optional(),
    description: z.string().trim().min(4).max(160).optional(),
    isActive: z.boolean().optional(),
});
export const productsService = {
    async getById(id, businessId) {
        const product = await prisma.product.findFirst({
            where: { id, businessId: businessId ?? undefined, isDeleted: false },
        });
        if (!product) {
            throw new HttpError(404, "Producto no encontrado");
        }
        return product;
    },
    async list(search, businessId) {
        const query = search?.trim() ?? "";
        return prisma.product.findMany({
            where: {
                isDeleted: false,
                businessId: businessId ?? undefined,
                ...(query
                    ? {
                        OR: [
                            { name: { contains: query, mode: "insensitive" } },
                            { description: { contains: query, mode: "insensitive" } },
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: "desc" },
        });
    },
    async create(input, businessId) {
        const parsed = createProductSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para crear producto");
        }
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        return prisma.product.create({
            data: {
                name: parsed.data.name,
                price: parsed.data.price,
                description: parsed.data.description,
                businessId,
                isActive: parsed.data.isActive ?? true,
            },
        });
    },
    async update(id, input, businessId) {
        const parsed = updateProductSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para actualizar producto");
        }
        const current = await prisma.product.findFirst({
            where: { id, isDeleted: false, businessId: businessId ?? undefined },
        });
        if (!current) {
            throw new HttpError(404, "Producto no encontrado");
        }
        return prisma.product.update({
            where: { id: current.id },
            data: {
                name: parsed.data.name,
                price: parsed.data.price,
                description: parsed.data.description,
                isActive: parsed.data.isActive,
            },
        });
    },
    async remove(id, businessId) {
        const current = await prisma.product.findFirst({
            where: { id, isDeleted: false, businessId: businessId ?? undefined },
        });
        if (!current) {
            throw new HttpError(404, "Producto no encontrado");
        }
        await prisma.product.update({
            where: { id: current.id },
            data: { isDeleted: true, deletedAt: new Date() },
        });
    },
};
