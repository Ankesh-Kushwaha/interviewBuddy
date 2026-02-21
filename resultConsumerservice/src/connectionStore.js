class connectionManager{
  costructor() {
    if (connectionManager.instance) {
      return connectionManager.instance;
    }
    
    this.userConnections = new Map();
    connectionManager.instance = this;
  }
  
  static getInstance() {
    if (!connectionManager.instance) {
      connectionManager.instance = new connectionManager();
    }
    return connectionManager.instance;
  }

  addConnection(userId,ws) {
    const existing = this.userConnections.get(userId);

    if (existing && existing.readyState == ws.OPEN) {
      existing.close(4000, "Another session opened");
    }

    this.userConnections.set(userId, ws);
  }

  removeConnection(userId, ws) {
    const existing = this.userConnections.get(userId);
    if (existing === ws) {
      this.userConnections.delete(userId);
    }
  }

  sendToUser(userId, payload) {
    const ws = this.userConnections.get(userId);
    if (!ws) return;

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  isConnected(userId) {
    const ws = this.userConnections.get(userId);
    return ws && ws.readyState === ws.OPEN;
  }
}

export default connectionManager.getInstance();