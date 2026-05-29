import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "../utils/http-error.js";
const registerSchema = z.object({
    name: z.string().trim().min(2),
    businessName: z.string().trim().min(2),
    email: z.string().trim().email(),
    password: z.string().min(8).max(72),
});
const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
    remember: z.boolean().optional().default(false),
});
function toSafeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
        localId: user.localId,
        business: user.business,
        needsPasswordReset: user.needsPasswordReset,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new HttpError(500, "JWT_SECRET no esta configurado");
    }
    return secret;
}
function buildAccessToken(payload, expiresInOverride) {
    const expiresIn = expiresInOverride ?? (process.env.JWT_EXPIRES_IN ?? "8h");
    return jwt.sign(payload, getJwtSecret(), {
        expiresIn,
    });
}
export const authService = {
    async register(input) {
        const parsed = registerSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Datos invalidos para registro");
        }
        const email = parsed.data.email.toLowerCase();
        const passwordHash = await bcrypt.hash(parsed.data.password, 12);
        const existing = await prisma.user.findUnique({
            where: { email },
        });
        if (existing) {
            throw new HttpError(409, "El correo ya esta registrado");
        }
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: parsed.data.name,
                    email,
                    role: "ADMINISTRADOR",
                    passwordHash,
                },
            });
            const business = await tx.business.create({
                data: {
                    name: parsed.data.businessName,
                    ownerUserId: user.id,
                },
            });
            const userWithBusiness = await tx.user.update({
                where: { id: user.id },
                data: { businessId: business.id },
                include: { business: true },
            });
            return { user: userWithBusiness, business };
        });
        const safeUser = toSafeUser(result.user);
        const accessToken = buildAccessToken({
            sub: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            businessId: result.user.businessId,
            localId: result.user.localId,
            sessionVersion: result.user.sessionVersion,
        });
        return {
            accessToken,
            tokenType: "Bearer",
            user: safeUser,
            business: result.business,
        };
    },
    async login(input) {
        const parsed = loginSchema.safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "Credenciales invalidas");
        }
        const email = parsed.data.email.toLowerCase();
        const user = await prisma.$transaction(async (tx) => {
            const foundUser = await tx.user.findFirst({
                where: {
                    email,
                    isDeleted: false,
                },
                include: {
                    business: true,
                },
            });
            if (!foundUser) {
                throw new HttpError(401, "Correo o contrasena invalidos");
            }
            if (!foundUser.isActive) {
                if (foundUser.role === "RECEPCIONISTA") {
                    throw new HttpError(403, "Su cuenta no está activa. Por favor, contacte con un administrador en caso de ser un error.");
                }
                throw new HttpError(403, "Usuario inactivo");
            }
            const matches = await bcrypt.compare(parsed.data.password, foundUser.passwordHash);
            if (!matches) {
                throw new HttpError(401, "Correo o contrasena invalidos");
            }
            return tx.user.update({
                where: { id: foundUser.id },
                data: {
                    sessionVersion: {
                        increment: 1,
                    },
                },
                include: {
                    business: true,
                },
            });
        });
        const safeUser = toSafeUser(user);
        const accessToken = buildAccessToken({
            sub: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            businessId: user.businessId,
            localId: user.localId,
            sessionVersion: user.sessionVersion,
        }, parsed.data.remember ? "30d" : undefined);
        return {
            accessToken,
            tokenType: "Bearer",
            user: safeUser,
        };
    },
    async verifyAccessToken(token) {
        try {
            const payload = jwt.verify(token, getJwtSecret());
            if (typeof payload === "string") {
                throw new HttpError(401, "Token invalido");
            }
            const normalizedPayload = {
                sub: String(payload.sub),
                email: String(payload.email),
                role: payload.role,
                name: String(payload.name),
                businessId: typeof payload.businessId === "string" ? payload.businessId : null,
                localId: typeof payload.localId === "string" ? payload.localId : null,
                sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : Number(payload.sessionVersion),
            };
            if (!Number.isInteger(normalizedPayload.sessionVersion)) {
                throw new HttpError(401, "Token invalido");
            }
            const user = await prisma.user.findFirst({
                where: {
                    id: normalizedPayload.sub,
                    email: normalizedPayload.email,
                    isDeleted: false,
                    sessionVersion: normalizedPayload.sessionVersion,
                },
            });
            if (!user || !user.isActive) {
                throw new HttpError(401, "Sesion iniciada en otro dispositivo");
            }
            return normalizedPayload;
        }
        catch {
            throw new HttpError(401, "Token invalido o expirado");
        }
    },
    async me(userId) {
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                isDeleted: false,
            },
            include: {
                business: true,
            },
        });
        if (!user) {
            throw new HttpError(404, "Usuario no encontrado");
        }
        return toSafeUser(user);
    },
    async changePassword(userId, input) {
        const parsed = z.object({ password: z.string().min(8).max(72) }).safeParse(input);
        if (!parsed.success) {
            throw new HttpError(400, "La contraseña debe tener entre 8 y 72 caracteres");
        }
        const passwordHash = await bcrypt.hash(parsed.data.password, 12);
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash,
                needsPasswordReset: false,
                sessionVersion: {
                    increment: 1,
                },
            },
            include: {
                business: true,
            },
        });
        const safeUser = toSafeUser(user);
        const accessToken = buildAccessToken({
            sub: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            businessId: user.businessId,
            localId: user.localId,
            sessionVersion: user.sessionVersion,
        });
        return {
            accessToken,
            tokenType: "Bearer",
            user: safeUser,
        };
    },
};
