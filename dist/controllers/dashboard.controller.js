import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http-error.js";
export async function getDashboardStats(req, res) {
    const businessId = req.auth?.businessId;
    if (!businessId) {
        throw new HttpError(401, "Business requerido");
    }
    const [locals, receptionists, drivers] = await Promise.all([
        prisma.local.count({ where: { isDeleted: false, businessId } }),
        prisma.user.count({ where: { role: "RECEPCIONISTA", isDeleted: false, businessId } }),
        prisma.user.count({ where: { role: "REPARTIDOR", isDeleted: false, businessId } }),
    ]);
    // Fetch orders for weekly deliveries (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const recentOrders = await prisma.order.findMany({
        where: {
            businessId,
            createdAt: {
                gte: sevenDaysAgo,
            },
            local: {
                isDeleted: false,
            },
        },
        select: {
            createdAt: true,
            status: true,
        },
    });
    const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const weeklyDeliveries = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dayLabel = daysOfWeek[d.getDay()];
        const count = recentOrders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            return orderDate.toDateString() === d.toDateString();
        }).length;
        const active = d.toDateString() === new Date().toDateString();
        return { day: dayLabel, count, active };
    });
    // Fetch all orders to group by status for this business
    const allOrders = await prisma.order.findMany({
        where: {
            businessId,
            local: {
                isDeleted: false,
            },
        },
        select: { status: true },
    });
    const statusCounts = {
        entregados: 0,
        enRuta: 0,
        cancelados: 0,
    };
    allOrders.forEach((order) => {
        if (order.status === "ENTREGADO") {
            statusCounts.entregados++;
        }
        else if (order.status === "CANCELADO" || order.status === "NO_SE_PUDO_ENTREGAR") {
            statusCounts.cancelados++;
        }
        else {
            statusCounts.enRuta++;
        }
    });
    res.json({
        stats: {
            locals,
            receptionists,
            drivers,
            weeklyDeliveries,
            orderStatus: [
                { name: "Entregados", count: statusCounts.entregados },
                { name: "En ruta", count: statusCounts.enRuta },
                { name: "Cancelados", count: statusCounts.cancelados },
            ],
        },
    });
}
