// Map<userId, Set<WebSocket>>
export const userConnections = new Map();

export function addConnection(userId, ws) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add(ws);
}

export function removeConnection(userId, ws) {
  const set = userConnections.get(userId);
  if (!set) return;

  set.delete(ws);
  if (set.size === 0) {
    userConnections.delete(userId);
  }
}

export function sendToUser(userId, payload) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const message = JSON.stringify(payload);

  for (const ws of connections) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}
