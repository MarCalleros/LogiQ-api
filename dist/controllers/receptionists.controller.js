import { receptionistsService } from "../services/receptionists.service.js";
function getIdParam(req) {
    const raw = req.params.id;
    return Array.isArray(raw) ? raw[0] : raw;
}
export async function listReceptionists(req, res) {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const receptionists = await receptionistsService.list(search, req.auth?.businessId);
    res.json({
        count: receptionists.length,
        receptionists,
    });
}
export async function getReceptionist(req, res) {
    const receptionist = await receptionistsService.getById(getIdParam(req), req.auth?.businessId);
    res.json({ receptionist });
}
export async function createReceptionist(req, res) {
    const receptionist = await receptionistsService.create(req.body, req.auth?.businessId);
    res.status(201).json({ receptionist });
}
export async function updateReceptionist(req, res) {
    const receptionist = await receptionistsService.update(getIdParam(req), req.body, req.auth?.businessId);
    res.json({ receptionist });
}
export async function deleteReceptionist(req, res) {
    await receptionistsService.remove(getIdParam(req), req.auth?.businessId);
    res.status(204).send();
}
