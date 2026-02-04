import { WebSocketServer } from "ws";
import { addConnection, removeConnection } from "./connectionStore.js";

export function startWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url.split("?")[1]);
    const userId = params.get("userId");

    if (!userId) {
      ws.close(1008, "userId required");
      return;
    }

    addConnection(userId, ws);
    console.log(`🔌 User ${userId} connected`);

    ws.on("close", () => {
      removeConnection(userId, ws);
      console.log(`❌ User ${userId} disconnected`);
    });

    ws.on("error", () => {
      removeConnection(userId, ws);
    });
  });

  console.log("🌐 WebSocket server ready");
}
