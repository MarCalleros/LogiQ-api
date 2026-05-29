import { HttpError } from "../utils/http-error.js";
export function notFoundMiddleware(_req, _res, next) {
    next(new HttpError(404, "Route not found"));
}
