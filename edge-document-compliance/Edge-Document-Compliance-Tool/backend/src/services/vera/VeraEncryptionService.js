/**
 * VERA Encryption Service
 * 
 * Provides secure encryption/decryption for credential passwords
 * Uses AES-256-GCM encryption (authenticated encryption)
 * Never stores passwords in plain text
 */

import crypto from 'crypto';

class VeraEncryptionService {
  constructor() {
    // Master encryption key from environment (must be 64 hex characters = 32 bytes)
    this.masterKey = process.env.VERA_ENCRYPTION_MASTER_KEY;
    this.algorithm = 'aes-256-gcm';
    
    if (!this.masterKey) {
      console.warn('[VeraEncryption] WARNING: VERA_ENCRYPTION_MASTER_KEY not set! Credentials will not be encrypted.');
      // Generate a temporary key for development (NOT for production!)
      if (process.env.NODE_ENV !== 'production') {
        this.masterKey = crypto.randomBytes(32).toString('hex');
        console.warn('[VeraEncryption] Using temporary key for development. Set VERA_ENCRYPTION_MASTER_KEY in production!');
      }
    }
    
    // Validate key length (must be 64 hex characters = 32 bytes)
    if (this.masterKey && this.masterKey.length !== 64) {
      throw new Error('VERA_ENCRYPTION_MASTER_KEY must be 64 hex characters (32 bytes)');
    }
  }

  /**
   * Encrypt a password using AES-256-GCM
   * @param {string} plaintext - Plain text password
   * @returns {string} Encrypted string in format: iv:authTag:encrypted
   */
  encryptPassword(plaintext) {
    if (!this.masterKey) {
      throw new Error('Encryption key not configured. Set VERA_ENCRYPTION_MASTER_KEY environment variable.');
    }

    if (!plaintext) {
      throw new Error('Cannot encrypt empty password');
    }

    try {
      // Generate random initialization vector (16 bytes)
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        Buffer.from(this.masterKey, 'hex'),
        iv
      );
      
      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag (prevents tampering)
      const authTag = cipher.getAuthTag();
      
      // Return format: iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('[VeraEncryption] Encryption error:', error);
      throw new Error(`Failed to encrypt password: ${error.message}`);
    }
  }

  /**
   * Decrypt a password using AES-256-GCM
   * @param {string} encrypted - Encrypted string in format: iv:authTag:encrypted
   * @returns {string} Decrypted plain text password
   */
  decryptPassword(encrypted) {
    if (!this.masterKey) {
      throw new Error('Encryption key not configured. Set VERA_ENCRYPTION_MASTER_KEY environment variable.');
    }

    if (!encrypted) {
      throw new Error('Cannot decrypt empty string');
    }

    try {
      // Parse encrypted string
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted format. Expected: iv:authTag:encrypted');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(this.masterKey, 'hex'),
        iv
      );
      
      // Set authentication tag
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('[VeraEncryption] Decryption error:', error);
      throw new Error(`Failed to decrypt password: ${error.message}`);
    }
  }

  /**
   * Generate a new encryption key ID (for key rotation)
   * @returns {string} Unique key identifier
   */
  generateEncryptionKey() {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Rotate encryption keys (re-encrypt all passwords with new key)
   * WARNING: This is a long-running operation
   * @returns {Promise<Object>} Rotation results
   */
  async rotateEncryptionKeys() {
    // This would require:
    // 1. Generate new master key
    // 2. Decrypt all passwords with old key
    // 3. Re-encrypt with new key
    // 4. Update encryption_key_id in database
    // 5. Update environment variable
    
    throw new Error('Key rotation not yet implemented. This requires careful planning to avoid data loss.');
  }
}

// Export singleton instance
const encryptionService = new VeraEncryptionService();
export default encryptionService;

// Also export class for testing
export { VeraEncryptionService };

