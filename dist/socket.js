import { Server } from "socket.io";
import { authService } from "./services/auth.service.js";
const activeDrivers = new Map();
let io = null;
export function initSocketServer(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        if (!token || typeof token !== "string") {
            return next(new Error("Authentication error: Token required"));
        }
        try {
            const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
            const payload = authService.verifyAccessToken(cleanToken);
            socket.data = {
                userId: payload.sub,
                name: payload.name,
                role: payload.role,
                businessId: payload.businessId,
                localId: payload.localId,
            };
            next();
        }
        catch {
            next(new Error("Authentication error: Invalid or expired token"));
        }
    });
    io.on("connection", (socket) => {
        const { userId, name, role, businessId, localId } = socket.data;
        if (businessId) {
            void socket.join(`business:${businessId}`);
        }
        if (role === "REPARTIDOR") {
            activeDrivers.set(userId, {
                id: userId,
                name,
                socketId: socket.id,
                businessId,
                localId,
                location: null,
            });
            broadcastActiveDrivers(businessId);
        }
        socket.emit("driver:list", getActiveDriversList(businessId));
        socket.on("driver:request_list", () => {
            socket.emit("driver:list", getActiveDriversList(businessId));
        });
        socket.on("driver:location", (data) => {
            const driver = activeDrivers.get(userId);
            if (driver) {
                driver.location = data;
                io?.to(`business:${businessId}`).emit("driver:location_updated", {
                    driverId: userId,
                    name: driver.name,
                    lat: data.lat,
                    lng: data.lng,
                });
            }
        });
        socket.on("disconnect", () => {
            if (role === "REPARTIDOR") {
                activeDrivers.delete(userId);
                broadcastActiveDrivers(businessId);
            }
        });
    });
    return io;
}
function getActiveDriversList(businessId) {
    if (!businessId)
        return [];
    const list = [];
    for (const driver of activeDrivers.values()) {
        if (driver.businessId === businessId) {
            const { socketId: _, ...rest } = driver;
            list.push(rest);
        }
    }
    return list;
}
function broadcastActiveDrivers(businessId) {
    if (!businessId || !io)
        return;
    io.to(`business:${businessId}`).emit("driver:list", getActiveDriversList(businessId));
}
export const socketEvents = {
    emitOrderCreated(businessId, order) {
        if (io && businessId) {
            io.to(`business:${businessId}`).emit("order:created", order);
        }
    },
    emitOrderAssigned(businessId, order) {
        if (io && businessId) {
            io.to(`business:${businessId}`).emit("order:assigned", order);
        }
    },
    emitOrderStatusUpdated(businessId, order) {
        if (io && businessId) {
            io.to(`business:${businessId}`).emit("order:status_updated", order);
        }
    },
};
