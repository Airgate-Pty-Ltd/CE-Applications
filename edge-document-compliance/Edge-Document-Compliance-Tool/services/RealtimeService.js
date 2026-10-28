import { WebSocketServer } from 'ws';

class RealtimeService {
  constructor() {
    this.wss = null;
  }

  attach(httpServer) {
    if (this.wss) return;
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });
    this.wss.on('connection', (socket) => {
      socket.send(JSON.stringify({ type: 'welcome', message: 'Realtime connection established.' }));
      socket.on('message', (message) => {
        socket.send(JSON.stringify({ type: 'echo', payload: message.toString() }));
      });
    });
  }

  broadcast(payload) {
    if (!this.wss) return;
    const message = JSON.stringify(payload);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}

export default new RealtimeService();
