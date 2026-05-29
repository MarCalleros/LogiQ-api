import { HttpError } from "../utils/http-error.js";
export const errorMiddleware = (error, _req, res, _next) => {
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
};
