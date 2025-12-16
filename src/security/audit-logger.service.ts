import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  userType: 'admin' | 'system' | 'api' | 'anonymous';
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  hubId?: string;
  sensitiveData?: boolean;
  complianceFlags?: string[];
}

// Simple in-memory audit log for now - in production this should be a persistent store
@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);
  private readonly auditLogs: AuditLogEntry[] = [];
  private readonly maxLogEntries = 10000; // Keep last 10k entries in memory

  /**
   * Log an audit event
   */
  async logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Add to in-memory store
    this.auditLogs.push(auditEntry);

    // Maintain size limit
    if (this.auditLogs.length > this.maxLogEntries) {
      this.auditLogs.shift();
    }

    // Log to console for immediate visibility
    const logLevel = this.getLogLevel(entry);
    const message = this.formatLogMessage(auditEntry);
    
    switch (logLevel) {
      case 'error':
        this.logger.error(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
      case 'log':
        this.logger.log(message);
        break;
      default:
        this.logger.debug(message);
    }

    // In production, also send to external audit system
    await this.sendToExternalAuditSystem(auditEntry);
  }

  /**
   * Log student data access
   */
  async logStudentDataAccess(params: {
    userId?: string;
    userType: 'admin' | 'system' | 'api' | 'anonymous';
    action: 'view' | 'create' | 'update' | 'delete' | 'export';
    studentId: string;
    hubId: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    await this.logEvent({
      ...params,
      resource: 'student',
      resourceId: params.studentId,
      sensitiveData: true,
      complianceFlags: ['COPPA', 'GDPR'],
    });
  }

  /**
   * Log device management operations
   */
  async logDeviceOperation(params: {
    userId?: string;
    userType: 'admin' | 'system' | 'api';
    action: 'create' | 'update' | 'delete' | 'register' | 'validate';
    deviceId?: string;
    deviceCode?: string;
    hubId: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    await this.logEvent({
      ...params,
      resource: 'device',
      resourceId: params.deviceId || params.deviceCode,
    });
  }

  /**
   * Log authentication attempts
   */
  async logAuthenticationAttempt(params: {
    userType: 'student' | 'device' | 'admin';
    identifier: string; // student code, device code, or user email
    action: 'login' | 'logout' | 'register' | 'validate';
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    hubId?: string;
  }): Promise<void> {
    // Map user types to audit log user types
    const auditUserType = params.userType === 'student' || params.userType === 'device' 
      ? 'anonymous' as const 
      : 'admin' as const;

    await this.logEvent({
      userType: auditUserType,
      action: params.action,
      resource: 'authentication',
      resourceId: params.identifier,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      success: params.success,
      errorMessage: params.errorMessage,
      hubId: params.hubId,
      // Don't log the actual identifier for privacy
      details: { 
        identifierType: params.userType,
        identifierLength: params.identifier?.length || 0,
        ...params.errorMessage && { error: params.errorMessage }
      },
    });
  }

  /**
   * Log data export operations (GDPR compliance)
   */
  async logDataExport(params: {
    userId?: string;
    userType: 'admin' | 'system' | 'api' | 'anonymous';
    exportType: 'student_data' | 'analytics' | 'full_export';
    resourceIds: string[];
    hubId: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await this.logEvent({
      ...params,
      action: 'export',
      resource: params.exportType,
      resourceId: params.resourceIds.join(','),
      sensitiveData: true,
      complianceFlags: ['GDPR', 'DATA_EXPORT'],
      details: {
        exportedRecords: params.resourceIds.length,
        exportType: params.exportType,
      },
    });
  }

  /**
   * Log data deletion operations (GDPR right to be forgotten)
   */
  async logDataDeletion(params: {
    userId?: string;
    userType: 'admin' | 'system' | 'api' | 'anonymous';
    deletionType: 'student_data' | 'analytics' | 'full_deletion';
    resourceIds: string[];
    hubId: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    reason: string;
  }): Promise<void> {
    await this.logEvent({
      ...params,
      action: 'delete',
      resource: params.deletionType,
      resourceId: params.resourceIds.join(','),
      sensitiveData: true,
      complianceFlags: ['GDPR', 'RIGHT_TO_BE_FORGOTTEN'],
      details: {
        deletedRecords: params.resourceIds.length,
        deletionType: params.deletionType,
        reason: params.reason,
      },
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters: {
    userId?: string;
    resource?: string;
    action?: string;
    hubId?: string;
    startDate?: Date;
    endDate?: Date;
    sensitiveData?: boolean;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLogEntry[]; total: number }> {
    let filteredLogs = [...this.auditLogs];

    // Apply filters
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }
    if (filters.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
    }
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    if (filters.hubId) {
      filteredLogs = filteredLogs.filter(log => log.hubId === filters.hubId);
    }
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
    }
    if (filters.sensitiveData !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.sensitiveData === filters.sensitiveData);
    }
    if (filters.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.success === filters.success);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredLogs.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return { logs: paginatedLogs, total };
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(hubId?: string): Promise<{
    totalEvents: number;
    sensitiveDataEvents: number;
    failedEvents: number;
    complianceFlags: Record<string, number>;
    recentEvents: AuditLogEntry[];
  }> {
    let logs = this.auditLogs;
    
    if (hubId) {
      logs = logs.filter(log => log.hubId === hubId);
    }

    const totalEvents = logs.length;
    const sensitiveDataEvents = logs.filter(log => log.sensitiveData).length;
    const failedEvents = logs.filter(log => !log.success).length;

    // Count compliance flags
    const complianceFlags: Record<string, number> = {};
    logs.forEach(log => {
      if (log.complianceFlags) {
        log.complianceFlags.forEach(flag => {
          complianceFlags[flag] = (complianceFlags[flag] || 0) + 1;
        });
      }
    });

    // Get recent events (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = logs
      .filter(log => log.timestamp >= yesterday)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);

    return {
      totalEvents,
      sensitiveDataEvents,
      failedEvents,
      complianceFlags,
      recentEvents,
    };
  }

  /**
   * Generate unique ID for audit entries
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determine log level based on entry
   */
  private getLogLevel(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): 'error' | 'warn' | 'log' | 'debug' {
    if (!entry.success) {
      return 'error';
    }
    if (entry.sensitiveData) {
      return 'warn';
    }
    if (['delete', 'export', 'create'].includes(entry.action)) {
      return 'log';
    }
    return 'debug';
  }

  /**
   * Format log message for console output
   */
  private formatLogMessage(entry: AuditLogEntry): string {
    const parts = [
      `[${entry.userType.toUpperCase()}]`,
      `${entry.action.toUpperCase()}`,
      `${entry.resource}`,
      entry.resourceId ? `(${entry.resourceId})` : '',
      entry.hubId ? `hub:${entry.hubId}` : '',
      entry.success ? 'SUCCESS' : 'FAILED',
      entry.errorMessage ? `- ${entry.errorMessage}` : '',
      entry.sensitiveData ? '[SENSITIVE]' : '',
      entry.complianceFlags ? `[${entry.complianceFlags.join(',')}]` : '',
    ].filter(Boolean);

    return parts.join(' ');
  }

  /**
   * Send to external audit system (placeholder for production implementation)
   */
  private async sendToExternalAuditSystem(entry: AuditLogEntry): Promise<void> {
    // In production, this would send to:
    // - External SIEM system
    // - Compliance logging service
    // - Database audit table
    // - Cloud logging service (AWS CloudTrail, Azure Monitor, etc.)
    
    // For now, just log that we would send it
    if (entry.sensitiveData || !entry.success) {
      this.logger.debug(`Would send to external audit system: ${entry.id}`);
    }
  }

  /**
   * Clear old audit logs (for maintenance)
   */
  async clearOldLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.auditLogs.length;
    
    // Remove old logs
    for (let i = this.auditLogs.length - 1; i >= 0; i--) {
      if (this.auditLogs[i].timestamp < cutoffDate) {
        this.auditLogs.splice(i, 1);
      }
    }
    
    const removedCount = initialCount - this.auditLogs.length;
    this.logger.log(`Cleared ${removedCount} audit log entries older than ${olderThanDays} days`);
    
    return removedCount;
  }
}