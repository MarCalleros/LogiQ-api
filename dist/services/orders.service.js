import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http-error.js";
import { OrderStatus } from "@prisma/client";
const createOrderSchema = z.object({
    clientName: z.string().trim().min(2),
    contactPerson: z.string().trim().optional(),
    phone: z.string().trim().min(7).max(30),
    localId: z.string().uuid(),
    state: z.string().trim().min(2),
    municipality: z.string().trim().min(2),
    city: z.string().trim().min(2),
    postalCode: z.string().trim().min(4),
    street: z.string().trim().min(2),
    additionalNotes: z.string().trim().optional(),
    posX: z.number(),
    posY: z.number(),
    products: z.array(z.object({
        productId: z.string().uuid(),
        name: z.string(),
        quantity: z.number().int().min(1),
    })).optional(),
});
function mapOrder(order) {
    return {
        id: order.id,
        clientName: order.clientName,
        contactPerson: order.contactPerson,
        phone: order.phone,
        localId: order.localId,
        localName: order.local?.name ?? null,
        state: order.state,
        municipality: order.municipality,
        city: order.city,
        postalCode: order.postalCode,
        street: order.street,
        additionalNotes: order.additionalNotes,
        posX: order.posX,
        posY: order.posY,
        status: order.status,
        driverId: order.driverId,
        driverName: order.driver?.name ?? null,
        products: order.products ?? [],
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
    };
}
export const ordersService = {
    async create(input, businessId) {
        const parsed = createOrderSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para crear pedido");
        }
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        // Verify local exists and belongs to business
        const local = await prisma.local.findFirst({
            where: { id: parsed.data.localId, businessId, isDeleted: false },
        });
        if (!local) {
            throw new HttpError(404, "Local no encontrado");
        }
        const order = await prisma.order.create({
            data: {
                clientName: parsed.data.clientName,
                contactPerson: parsed.data.contactPerson ?? null,
                phone: parsed.data.phone,
                localId: parsed.data.localId,
                state: parsed.data.state,
                municipality: parsed.data.municipality,
                city: parsed.data.city,
                postalCode: parsed.data.postalCode,
                street: parsed.data.street,
                additionalNotes: parsed.data.additionalNotes ?? null,
                posX: parsed.data.posX,
                posY: parsed.data.posY,
                status: "PENDIENTE",
                products: parsed.data.products ?? [],
                businessId,
            },
            include: {
                local: true,
                driver: true,
            },
        });
        return mapOrder(order);
    },
    async getById(id, businessId) {
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        const order = await prisma.order.findFirst({
            where: { id, businessId },
            include: {
                local: true,
                driver: true,
            },
        });
        if (!order) {
            throw new HttpError(404, "Pedido no encontrado");
        }
        return mapOrder(order);
    },
    async list(search, businessId, status, driverId, localId) {
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        const query = search?.trim() ?? "";
        const parsedStatus = status && Object.values(OrderStatus).includes(status)
            ? status
            : undefined;
        const orders = await prisma.order.findMany({
            where: {
                businessId,
                ...(parsedStatus ? { status: parsedStatus } : {}),
                ...(driverId ? { driverId } : {}),
                ...(localId ? { localId } : {}),
                ...(query
                    ? {
                        OR: [
                            { clientName: { contains: query, mode: "insensitive" } },
                            { phone: { contains: query, mode: "insensitive" } },
                            { street: { contains: query, mode: "insensitive" } },
                            { city: { contains: query, mode: "insensitive" } },
                            { local: { name: { contains: query, mode: "insensitive" } } },
                        ],
                    }
                    : {}),
            },
            include: {
                local: true,
                driver: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return orders.map(mapOrder);
    },
    async assignDriver(id, driverId, businessId) {
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        const order = await prisma.order.findFirst({
            where: { id, businessId },
        });
        if (!order) {
            throw new HttpError(404, "Pedido no encontrado");
        }
        // Verify driver exists and belongs to business
        const driver = await prisma.user.findFirst({
            where: { id: driverId, businessId, role: "REPARTIDOR", isDeleted: false },
        });
        if (!driver) {
            throw new HttpError(404, "Repartidor no encontrado o no pertenece a este negocio");
        }
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                driverId,
                status: "ASIGNADO",
            },
            include: {
                local: true,
                driver: true,
            },
        });
        return mapOrder(updatedOrder);
    },
    async updateStatus(id, status, businessId) {
        if (!businessId) {
            throw new HttpError(401, "Business requerido");
        }
        if (!Object.values(OrderStatus).includes(status)) {
            throw new HttpError(400, "Estado de pedido invalido");
        }
        const order = await prisma.order.findFirst({
            where: { id, businessId },
        });
        if (!order) {
            throw new HttpError(404, "Pedido no encontrado");
        }
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                status: status,
            },
            include: {
                local: true,
                driver: true,
            },
        });
        return mapOrder(updatedOrder);
    },
};
