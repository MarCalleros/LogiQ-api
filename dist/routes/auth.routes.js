import { Router } from "express";
import { changePassword, getMe, loginUser, registerUser } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
export const authRouter = Router();
authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/me", getMe);
authRouter.post("/change-password", requireAuth, changePassword);
