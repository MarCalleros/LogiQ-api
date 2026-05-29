import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { apiRouter } from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
export function createApp() {
    const app = express();
    app.use(helmet());
    app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") }));
    app.use(express.json());
    app.use(morgan("dev"));
    app.get("/health", (_req, res) => {
        res.json({ status: "ok" });
    });
    app.use("/api", apiRouter);
    app.use(notFoundMiddleware);
    app.use(errorMiddleware);
    return app;
}
