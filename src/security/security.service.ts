import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly encryptionKey: Buffer;

  constructor() {
    // In production, this should come from environment variables or a key management service
    const keyString = process.env.ENCRYPTION_KEY || 'default-key-for-development-only-change-in-production';
    this.encryptionKey = crypto.scryptSync(keyString, 'salt', this.keyLength);
    
    if (!process.env.ENCRYPTION_KEY) {
      this.logger.warn('Using default encryption key. Set ENCRYPTION_KEY environment variable in production.');
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    if (!plaintext || plaintext.trim().length === 0) {
      return plaintext;
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      cipher.setAAD(Buffer.from('student-data', 'utf8'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine iv, tag, and encrypted data
      const combined = iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
      return combined;
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData || encryptedData.trim().length === 0) {
      return encryptedData;
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAAD(Buffer.from('student-data', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data for comparison (one-way)
   */
  hash(data: string): string {
    if (!data || data.trim().length === 0) {
      return data;
    }

    try {
      const salt = crypto.randomBytes(16);
      const hash = crypto.scryptSync(data, salt, 64);
      return salt.toString('hex') + ':' + hash.toString('hex');
    } catch (error) {
      this.logger.error(`Hashing failed: ${error.message}`);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    if (!data || !hashedData) {
      return false;
    }

    try {
      const parts = hashedData.split(':');
      if (parts.length !== 2) {
        return false;
      }

      const salt = Buffer.from(parts[0], 'hex');
      const originalHash = Buffer.from(parts[1], 'hex');
      const hash = crypto.scryptSync(data, salt, 64);
      
      return crypto.timingSafeEqual(originalHash, hash);
    } catch (error) {
      this.logger.error(`Hash verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate cryptographically secure random string
   */
  generateSecureRandom(length: number, charset?: string): string {
    const defaultCharset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous characters
    const chars = charset || defaultCharset;
    
    const randomBytes = crypto.randomBytes(length * 2); // Generate extra bytes for better distribution
    let result = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = randomBytes[i] % chars.length;
      result += chars[randomIndex];
    }
    
    return result;
  }

  /**
   * Generate secure device code
   */
  generateDeviceCode(): string {
    // Generate 6-8 character device code
    const length = 6 + Math.floor(Math.random() * 3); // 6, 7, or 8 characters
    return this.generateSecureRandom(length);
  }

  /**
   * Generate secure student code
   */
  generateStudentCode(): string {
    // Generate 4-6 character student code (child-friendly)
    const length = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6 characters
    return this.generateSecureRandom(length);
  }

  /**
   * Validate encryption key strength
   */
  validateEncryptionSetup(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let isValid = true;

    // Check if using default key
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('Using default encryption key - set ENCRYPTION_KEY in production');
      isValid = false;
    }

    // Check key length
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
      warnings.push('Encryption key should be at least 32 characters long');
      isValid = false;
    }

    return { isValid, warnings };
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['firstName', 'lastName', 'email', 'phone', 'address', 'password'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}