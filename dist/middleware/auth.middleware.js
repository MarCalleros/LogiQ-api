import { authService } from "../services/auth.service.js";
import { HttpError } from "../utils/http-error.js";
export function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        next(new HttpError(401, "Token requerido"));
        return;
    }
    const token = authHeader.slice(7);
    void authService.verifyAccessToken(token)
        .then((payload) => {
        req.auth = payload;
        next();
    })
        .catch((error) => {
        next(error);
    });
}
export function requireRole(role) {
    return (req, _res, next) => {
        if (!req.auth) {
            next(new HttpError(401, "No autenticado"));
            return;
        }
        if (req.auth.role !== role) {
            next(new HttpError(403, "No autorizado"));
            return;
        }
        next();
    };
}
