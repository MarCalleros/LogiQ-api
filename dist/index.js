import "dotenv/config";
import { createServer } from "http";
import { createApp } from "./app.js";
import { initSocketServer } from "./socket.js";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = createApp();
const server = createServer(app);
initSocketServer(server);
server.listen(port, () => {
    console.log(`Backend running on port ${port}`);
});
