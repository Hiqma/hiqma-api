import { Injectable, Logger } from '@nestjs/common';

interface RateLimitEntry {
  attempts: number;
  firstAttempt: Date;
  lastAttempt: Date;
  blockedUntil?: Date;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly attempts = new Map<string, RateLimitEntry>();
  
  // Configuration
  private readonly maxAttempts = 5;
  private readonly windowMinutes = 15;
  private readonly blockDurationMinutes = 30;
  private readonly cleanupIntervalMinutes = 60;

  constructor() {
    // Clean up old entries periodically
    setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMinutes * 60 * 1000);
  }

  /**
   * Check if an IP/identifier is rate limited
   */
  isRateLimited(identifier: string): { isLimited: boolean; remainingAttempts?: number; resetTime?: Date } {
    const entry = this.attempts.get(identifier);
    
    if (!entry) {
      return { isLimited: false, remainingAttempts: this.maxAttempts };
    }

    const now = new Date();
    
    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return { 
        isLimited: true, 
        resetTime: entry.blockedUntil 
      };
    }

    // Check if window has expired
    const windowExpiry = new Date(entry.firstAttempt.getTime() + (this.windowMinutes * 60 * 1000));
    if (now > windowExpiry) {
      // Window expired, reset
      this.attempts.delete(identifier);
      return { isLimited: false, remainingAttempts: this.maxAttempts };
    }

    // Check if max attempts reached
    if (entry.attempts >= this.maxAttempts) {
      // Block the identifier
      entry.blockedUntil = new Date(now.getTime() + (this.blockDurationMinutes * 60 * 1000));
      this.logger.warn(`Rate limit exceeded for ${identifier}. Blocked until ${entry.blockedUntil}`);
      return { 
        isLimited: true, 
        resetTime: entry.blockedUntil 
      };
    }

    return { 
      isLimited: false, 
      remainingAttempts: this.maxAttempts - entry.attempts 
    };
  }

  /**
   * Record an authentication attempt
   */
  recordAttempt(identifier: string, success: boolean): void {
    const now = new Date();
    let entry = this.attempts.get(identifier);

    if (!entry) {
      entry = {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now,
      };
      this.attempts.set(identifier, entry);
    }

    // Check if window has expired
    const windowExpiry = new Date(entry.firstAttempt.getTime() + (this.windowMinutes * 60 * 1000));
    if (now > windowExpiry) {
      // Reset window
      entry.attempts = 0;
      entry.firstAttempt = now;
      delete entry.blockedUntil;
    }

    if (success) {
      // Successful authentication - reset attempts
      this.attempts.delete(identifier);
      this.logger.debug(`Successful authentication for ${identifier} - rate limit reset`);
    } else {
      // Failed authentication - increment attempts
      entry.attempts++;
      entry.lastAttempt = now;
      
      this.logger.warn(`Failed authentication attempt ${entry.attempts}/${this.maxAttempts} for ${identifier}`);
      
      if (entry.attempts >= this.maxAttempts) {
        entry.blockedUntil = new Date(now.getTime() + (this.blockDurationMinutes * 60 * 1000));
        this.logger.warn(`Rate limit exceeded for ${identifier}. Blocked until ${entry.blockedUntil}`);
      }
    }
  }

  /**
   * Get rate limit status for an identifier
   */
  getStatus(identifier: string): {
    attempts: number;
    maxAttempts: number;
    remainingAttempts: number;
    windowExpiry: Date | null;
    blockedUntil: Date | null;
    isBlocked: boolean;
  } {
    const entry = this.attempts.get(identifier);
    const now = new Date();
    
    if (!entry) {
      return {
        attempts: 0,
        maxAttempts: this.maxAttempts,
        remainingAttempts: this.maxAttempts,
        windowExpiry: null,
        blockedUntil: null,
        isBlocked: false,
      };
    }

    const windowExpiry = new Date(entry.firstAttempt.getTime() + (this.windowMinutes * 60 * 1000));
    const isBlocked = entry.blockedUntil ? now < entry.blockedUntil : false;
    
    return {
      attempts: entry.attempts,
      maxAttempts: this.maxAttempts,
      remainingAttempts: Math.max(0, this.maxAttempts - entry.attempts),
      windowExpiry: windowExpiry,
      blockedUntil: entry.blockedUntil || null,
      isBlocked,
    };
  }

  /**
   * Manually reset rate limit for an identifier (admin function)
   */
  resetRateLimit(identifier: string): void {
    this.attempts.delete(identifier);
    this.logger.log(`Rate limit manually reset for ${identifier}`);
  }

  /**
   * Get all current rate limit entries (admin function)
   */
  getAllEntries(): Array<{ identifier: string; entry: RateLimitEntry }> {
    const entries: Array<{ identifier: string; entry: RateLimitEntry }> = [];
    
    for (const [identifier, entry] of this.attempts.entries()) {
      entries.push({ identifier, entry });
    }
    
    return entries;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [identifier, entry] of this.attempts.entries()) {
      const windowExpiry = new Date(entry.firstAttempt.getTime() + (this.windowMinutes * 60 * 1000));
      const blockExpiry = entry.blockedUntil || new Date(0);
      
      // Remove if both window and block have expired
      if (now > windowExpiry && now > blockExpiry) {
        this.attempts.delete(identifier);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  /**
   * Get rate limiter statistics
   */
  getStatistics(): {
    totalEntries: number;
    blockedEntries: number;
    configuration: {
      maxAttempts: number;
      windowMinutes: number;
      blockDurationMinutes: number;
    };
  } {
    const now = new Date();
    let blockedCount = 0;
    
    for (const entry of this.attempts.values()) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedCount++;
      }
    }
    
    return {
      totalEntries: this.attempts.size,
      blockedEntries: blockedCount,
      configuration: {
        maxAttempts: this.maxAttempts,
        windowMinutes: this.windowMinutes,
        blockDurationMinutes: this.blockDurationMinutes,
      },
    };
  }
}