import { authService } from "../services/auth.service.js";
export async function registerUser(req, res) {
    const result = await authService.register(req.body);
    res.status(201).json(result);
}
export async function loginUser(req, res) {
    const result = await authService.login(req.body);
    res.json(result);
}
export async function getMe(req, res) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const payload = await authService.verifyAccessToken(token);
    const user = await authService.me(payload.sub);
    res.json({ user });
}
export async function changePassword(req, res) {
    if (!req.auth) {
        res.status(401).json({ message: "No autenticado" });
        return;
    }
    const result = await authService.changePassword(req.auth.sub, req.body);
    res.json(result);
}
