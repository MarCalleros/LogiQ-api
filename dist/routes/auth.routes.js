import { Router } from "express";
import { getMe, loginUser, registerUser } from "../controllers/auth.controller.js";
export const authRouter = Router();
authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.get("/me", getMe);
