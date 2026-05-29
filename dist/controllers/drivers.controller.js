import { driversService } from "../services/drivers.service.js";
function getIdParam(req) {
    const raw = req.params.id;
    return Array.isArray(raw) ? raw[0] : raw;
}
export async function listDrivers(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    let localId = typeof req.query.localId === "string" ? req.query.localId : undefined;
    if (req.auth?.role === "RECEPCIONISTA") {
        localId = req.auth.localId || undefined;
    }
    const drivers = await driversService.list(search, req.auth?.businessId, localId);
    res.json({ count: drivers.length, drivers });
}
export async function getDriver(req, res) {
    const driver = await driversService.getById(getIdParam(req), req.auth?.businessId);
    res.json({ driver });
}
export async function createDriver(req, res) {
    const driver = await driversService.create(req.body, req.auth?.businessId);
    res.status(201).json({ driver });
}
export async function updateDriver(req, res) {
    const driver = await driversService.update(getIdParam(req), req.body, req.auth?.businessId);
    res.json({ driver });
}
export async function deleteDriver(req, res) {
    await driversService.remove(getIdParam(req), req.auth?.businessId);
    res.status(204).send();
}
