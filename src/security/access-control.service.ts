import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

export interface AccessContext {
  userId?: string;
  userType: 'admin' | 'system' | 'api' | 'anonymous';
  hubId?: string;
  ipAddress?: string;
  userAgent?: string;
  permissions?: string[];
}

export interface AccessRule {
  resource: string;
  action: string;
  requiredPermissions: string[];
  allowedUserTypes: string[];
  requiresHubAccess?: boolean;
  sensitiveData?: boolean;
  complianceRequired?: string[];
}

@Injectable()
export class AccessControlService {
  private readonly logger = new Logger(AccessControlService.name);

  // Define access rules for different resources and actions
  private readonly accessRules: AccessRule[] = [
    // Student data access rules
    {
      resource: 'student',
      action: 'view',
      requiredPermissions: ['student:read'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
      sensitiveData: true,
      complianceRequired: ['COPPA', 'GDPR'],
    },
    {
      resource: 'student',
      action: 'create',
      requiredPermissions: ['student:write'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
      sensitiveData: true,
      complianceRequired: ['COPPA', 'GDPR'],
    },
    {
      resource: 'student',
      action: 'update',
      requiredPermissions: ['student:write'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
      sensitiveData: true,
      complianceRequired: ['COPPA', 'GDPR'],
    },
    {
      resource: 'student',
      action: 'delete',
      requiredPermissions: ['student:delete'],
      allowedUserTypes: ['admin'],
      requiresHubAccess: true,
      sensitiveData: true,
      complianceRequired: ['COPPA', 'GDPR', 'RIGHT_TO_BE_FORGOTTEN'],
    },
    {
      resource: 'student',
      action: 'export',
      requiredPermissions: ['student:export'],
      allowedUserTypes: ['admin'],
      requiresHubAccess: true,
      sensitiveData: true,
      complianceRequired: ['GDPR', 'DATA_PORTABILITY'],
    },
    {
      resource: 'student',
      action: 'authenticate',
      requiredPermissions: [],
      allowedUserTypes: ['system', 'api', 'anonymous'],
      requiresHubAccess: false,
      sensitiveData: false,
    },

    // Device management access rules
    {
      resource: 'device',
      action: 'view',
      requiredPermissions: ['device:read'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
    },
    {
      resource: 'device',
      action: 'create',
      requiredPermissions: ['device:write'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
    },
    {
      resource: 'device',
      action: 'update',
      requiredPermissions: ['device:write'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
    },
    {
      resource: 'device',
      action: 'delete',
      requiredPermissions: ['device:delete'],
      allowedUserTypes: ['admin'],
      requiresHubAccess: true,
    },
    {
      resource: 'device',
      action: 'register',
      requiredPermissions: [],
      allowedUserTypes: ['system', 'api', 'anonymous'],
      requiresHubAccess: false,
    },
    {
      resource: 'device',
      action: 'validate',
      requiredPermissions: [],
      allowedUserTypes: ['system', 'api', 'anonymous'],
      requiresHubAccess: false,
    },

    // Analytics access rules
    {
      resource: 'analytics',
      action: 'view',
      requiredPermissions: ['analytics:read'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
    },
    {
      resource: 'analytics',
      action: 'collect',
      requiredPermissions: [],
      allowedUserTypes: ['system', 'api'],
      requiresHubAccess: false,
    },
    {
      resource: 'analytics',
      action: 'export',
      requiredPermissions: ['analytics:export'],
      allowedUserTypes: ['admin'],
      requiresHubAccess: true,
      sensitiveData: true,
      complianceRequired: ['GDPR'],
    },

    // Hub management access rules
    {
      resource: 'hub',
      action: 'view',
      requiredPermissions: ['hub:read'],
      allowedUserTypes: ['admin', 'system'],
      requiresHubAccess: true,
    },
    {
      resource: 'hub',
      action: 'manage',
      requiredPermissions: ['hub:admin'],
      allowedUserTypes: ['admin'],
      requiresHubAccess: true,
    },

    // Audit log access rules
    {
      resource: 'audit',
      action: 'view',
      requiredPermissions: ['audit:read'],
      allowedUserTypes: ['admin'],
      requiresHubAccess: false,
      sensitiveData: true,
    },
  ];

  /**
   * Check if access is allowed for a specific resource and action
   */
  async checkAccess(
    context: AccessContext,
    resource: string,
    action: string,
    resourceId?: string,
  ): Promise<{ allowed: boolean; reason?: string; complianceFlags?: string[] }> {
    try {
      // Find matching access rule
      const rule = this.accessRules.find(r => r.resource === resource && r.action === action);
      
      if (!rule) {
        this.logger.warn(`No access rule found for ${resource}:${action}`);
        return { allowed: false, reason: 'No access rule defined' };
      }

      // Check user type
      if (!rule.allowedUserTypes.includes(context.userType)) {
        return { 
          allowed: false, 
          reason: `User type '${context.userType}' not allowed for ${resource}:${action}` 
        };
      }

      // Check permissions (if user has permissions defined)
      if (context.permissions && rule.requiredPermissions.length > 0) {
        const hasRequiredPermissions = rule.requiredPermissions.every(
          permission => context.permissions!.includes(permission)
        );
        
        if (!hasRequiredPermissions) {
          return { 
            allowed: false, 
            reason: `Missing required permissions: ${rule.requiredPermissions.join(', ')}` 
          };
        }
      }

      // Check hub access requirement
      if (rule.requiresHubAccess && !context.hubId) {
        return { 
          allowed: false, 
          reason: 'Hub access required but no hub ID provided' 
        };
      }

      // Additional checks for sensitive data
      if (rule.sensitiveData) {
        // Log access to sensitive data
        this.logger.warn(
          `Sensitive data access: ${context.userType} accessing ${resource}:${action} ` +
          `${resourceId ? `(${resourceId})` : ''} ${context.hubId ? `in hub ${context.hubId}` : ''}`
        );
      }

      return { 
        allowed: true, 
        complianceFlags: rule.complianceRequired 
      };

    } catch (error) {
      this.logger.error(`Error checking access: ${error.message}`, error.stack);
      return { allowed: false, reason: 'Access check failed' };
    }
  }

  /**
   * Enforce access control - throws exception if access denied
   */
  async enforceAccess(
    context: AccessContext,
    resource: string,
    action: string,
    resourceId?: string,
  ): Promise<string[]> {
    const result = await this.checkAccess(context, resource, action, resourceId);
    
    if (!result.allowed) {
      this.logger.warn(
        `Access denied: ${context.userType} tried to ${action} ${resource} ` +
        `${resourceId ? `(${resourceId})` : ''} - ${result.reason}`
      );
      
      throw new ForbiddenException(result.reason || 'Access denied');
    }

    return result.complianceFlags || [];
  }

  /**
   * Get user permissions based on user type and context
   */
  getUserPermissions(userType: string, hubId?: string): string[] {
    const permissions: string[] = [];

    switch (userType) {
      case 'admin':
        permissions.push(
          'student:read', 'student:write', 'student:delete', 'student:export',
          'device:read', 'device:write', 'device:delete',
          'analytics:read', 'analytics:export',
          'hub:read', 'hub:admin',
          'audit:read'
        );
        break;
      
      case 'system':
        permissions.push(
          'student:read', 'student:write',
          'device:read', 'device:write',
          'analytics:read',
          'hub:read'
        );
        break;
      
      case 'api':
        permissions.push(
          'device:read',
          'analytics:read'
        );
        break;
      
      case 'anonymous':
        // No permissions for anonymous users
        break;
    }

    return permissions;
  }

  /**
   * Check if user can access specific hub
   */
  async canAccessHub(context: AccessContext, hubId: string): Promise<boolean> {
    // For now, allow access if user has hub context or is admin
    if (context.userType === 'admin') {
      return true;
    }
    
    if (context.hubId === hubId) {
      return true;
    }

    // In a real implementation, this would check hub membership/permissions
    return false;
  }

  /**
   * Get COPPA compliance requirements for student data
   */
  getCOPPARequirements(): {
    minimumAge: number;
    parentalConsentRequired: boolean;
    dataMinimization: boolean;
    retentionLimits: boolean;
  } {
    return {
      minimumAge: 13,
      parentalConsentRequired: true,
      dataMinimization: true,
      retentionLimits: true,
    };
  }

  /**
   * Get GDPR compliance requirements
   */
  getGDPRRequirements(): {
    lawfulBasis: string[];
    dataSubjectRights: string[];
    dataProtectionPrinciples: string[];
  } {
    return {
      lawfulBasis: [
        'consent',
        'legitimate_interest',
        'public_task',
      ],
      dataSubjectRights: [
        'right_to_access',
        'right_to_rectification',
        'right_to_erasure',
        'right_to_portability',
        'right_to_restrict_processing',
        'right_to_object',
      ],
      dataProtectionPrinciples: [
        'lawfulness_fairness_transparency',
        'purpose_limitation',
        'data_minimisation',
        'accuracy',
        'storage_limitation',
        'integrity_confidentiality',
        'accountability',
      ],
    };
  }

  /**
   * Validate student age for COPPA compliance
   */
  validateStudentAge(age?: number): {
    compliant: boolean;
    requiresParentalConsent: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const coppaRequirements = this.getCOPPARequirements();

    if (!age) {
      warnings.push('Age not provided - cannot verify COPPA compliance');
      return {
        compliant: false,
        requiresParentalConsent: true,
        warnings,
      };
    }

    if (age < 3) {
      warnings.push('Age below minimum expected range');
      return {
        compliant: false,
        requiresParentalConsent: true,
        warnings,
      };
    }

    if (age < coppaRequirements.minimumAge) {
      warnings.push(`Student under ${coppaRequirements.minimumAge} - COPPA parental consent required`);
      return {
        compliant: true,
        requiresParentalConsent: true,
        warnings,
      };
    }

    return {
      compliant: true,
      requiresParentalConsent: false,
      warnings,
    };
  }

  /**
   * Get data retention policy
   */
  getDataRetentionPolicy(): {
    studentData: { years: number; afterInactive: boolean };
    analyticsData: { years: number; anonymized: boolean };
    auditLogs: { years: number; complianceRequired: boolean };
  } {
    return {
      studentData: { years: 3, afterInactive: true },
      analyticsData: { years: 2, anonymized: true },
      auditLogs: { years: 7, complianceRequired: true },
    };
  }

  /**
   * Check if data should be retained or deleted
   */
  shouldRetainData(
    dataType: 'student' | 'analytics' | 'audit',
    lastActivity: Date,
    studentAge?: number,
  ): { retain: boolean; reason: string; action?: string } {
    const policy = this.getDataRetentionPolicy();
    const now = new Date();
    
    let retentionYears: number;
    let additionalChecks = '';

    switch (dataType) {
      case 'student':
        retentionYears = policy.studentData.years;
        // Special handling for COPPA compliance
        if (studentAge && studentAge < 13) {
          additionalChecks = ' (COPPA compliance - parental consent may affect retention)';
        }
        break;
      case 'analytics':
        retentionYears = policy.analyticsData.years;
        additionalChecks = ' (can be anonymized after retention period)';
        break;
      case 'audit':
        retentionYears = policy.auditLogs.years;
        additionalChecks = ' (compliance requirement)';
        break;
    }

    const retentionDate = new Date(lastActivity);
    retentionDate.setFullYear(retentionDate.getFullYear() + retentionYears);

    if (now > retentionDate) {
      return {
        retain: false,
        reason: `Data older than ${retentionYears} years${additionalChecks}`,
        action: dataType === 'analytics' ? 'anonymize' : 'delete',
      };
    }

    return {
      retain: true,
      reason: `Within ${retentionYears} year retention period${additionalChecks}`,
    };
  }
}