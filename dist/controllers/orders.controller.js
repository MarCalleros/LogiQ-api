import { ordersService } from "../services/orders.service.js";
function getIdParam(req) {
    const raw = req.params.id;
    return Array.isArray(raw) ? raw[0] : raw;
}
export async function createOrder(req, res) {
    if (req.auth?.role === "RECEPCIONISTA") {
        req.body.localId = req.auth.localId;
    }
    const order = await ordersService.create(req.body, req.auth?.businessId);
    res.status(201).json({ order });
}
export async function getOrder(req, res) {
    const order = await ordersService.getById(getIdParam(req), req.auth?.businessId);
    if (req.auth?.role === "RECEPCIONISTA" && order.localId !== req.auth.localId) {
        res.status(403).json({ error: "No autorizado para ver pedidos de otro local" });
        return;
    }
    res.json({ order });
}
export async function listOrders(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const driverId = typeof req.query.driverId === "string" ? req.query.driverId : undefined;
    let localId = typeof req.query.localId === "string" ? req.query.localId : undefined;
    if (req.auth?.role === "RECEPCIONISTA") {
        localId = req.auth.localId || undefined;
    }
    const orders = await ordersService.list(search, req.auth?.businessId, status, driverId, localId);
    res.json({
        count: orders.length,
        orders,
    });
}
export async function assignOrderDriver(req, res) {
    const { driverId } = req.body;
    if (!driverId || typeof driverId !== "string") {
        res.status(400).json({ error: "driverId es requerido y debe ser string" });
        return;
    }
    const order = await ordersService.getById(getIdParam(req), req.auth?.businessId);
    if (req.auth?.role === "RECEPCIONISTA" && order.localId !== req.auth.localId) {
        res.status(403).json({ error: "No autorizado para asignar repartidores en pedidos de otro local" });
        return;
    }
    const updatedOrder = await ordersService.assignDriver(getIdParam(req), driverId, req.auth?.businessId);
    res.json({ order: updatedOrder });
}
export async function updateOrderStatus(req, res) {
    const { status } = req.body;
    if (!status || typeof status !== "string") {
        res.status(400).json({ error: "status es requerido y debe ser string" });
        return;
    }
    const order = await ordersService.getById(getIdParam(req), req.auth?.businessId);
    if (req.auth?.role === "RECEPCIONISTA" && order.localId !== req.auth.localId) {
        res.status(403).json({ error: "No autorizado para cambiar estado de pedidos de otro local" });
        return;
    }
    const updatedOrder = await ordersService.updateStatus(getIdParam(req), status, req.auth?.businessId);
    res.json({ order: updatedOrder });
}
