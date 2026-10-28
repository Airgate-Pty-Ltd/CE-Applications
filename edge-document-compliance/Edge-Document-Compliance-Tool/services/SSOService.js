class SSOService {
  generateToken(user) {
    const payload = {
      userId: user?.id || 'anonymous',
      email: user?.email || 'anonymous@edcat.local',
      issuedAt: new Date().toISOString()
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  verifyToken(token) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (_error) {
      return null;
    }
  }
}

export default new SSOService();
