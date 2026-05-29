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
    res.json({
        stats: {
            locals,
            receptionists,
            drivers,
        },
    });
}
