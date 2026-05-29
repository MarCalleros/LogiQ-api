import { localsService } from "../services/locals.service.js";
function getIdParam(req) {
    const raw = req.params.id;
    return Array.isArray(raw) ? raw[0] : raw;
}
export async function listLocals(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    let localId = typeof req.query.localId === "string" ? req.query.localId : undefined;
    if (req.auth?.role === "RECEPCIONISTA") {
        localId = req.auth.localId || undefined;
    }
    const locals = await localsService.list(search, req.auth?.businessId, localId);
    res.json({ count: locals.length, locals });
}
export async function getLocal(req, res) {
    const local = await localsService.getById(getIdParam(req), req.auth?.businessId);
    res.json({ local });
}
export async function createLocal(req, res) {
    const local = await localsService.create(req.body, req.auth?.businessId);
    res.status(201).json({ local });
}
export async function updateLocal(req, res) {
    const local = await localsService.update(getIdParam(req), req.body, req.auth?.businessId);
    res.json({ local });
}
export async function deleteLocal(req, res) {
    await localsService.remove(getIdParam(req), req.auth?.businessId);
    res.status(204).send();
}
