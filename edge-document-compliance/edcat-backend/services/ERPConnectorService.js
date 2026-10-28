class ERPConnectorService {
  constructor() {
    this.connections = new Map();
  }

  async registerERPConnection(customerId, erpType, credentials) {
    const id = `${erpType}-${Date.now()}`;
    this.connections.set(id, { customerId, erpType, credentials });
    return { id, erpType, status: 'connected' };
  }

  async syncFromERP(connectionId) {
    if (!this.connections.has(connectionId)) {
      throw new Error('Connection not found');
    }
    return { recordsSync: Math.floor(Math.random() * 5) + 1, timestamp: new Date().toISOString() };
  }
}

export default new ERPConnectorService();
