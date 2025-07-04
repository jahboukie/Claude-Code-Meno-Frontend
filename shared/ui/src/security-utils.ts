// Security utilities for client-side encryption and compliance
import { UserConsent, AuditLog, EncryptedData } from '@metiscore/types';

// Client-side encryption utilities
export class SecurityUtils {
  private static readonly ENCRYPTION_KEY_SIZE = 32; // 256 bits
  private static readonly IV_SIZE = 16; // 128 bits

  // Generate a secure random key for field-level encryption
  static async generateKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt sensitive data client-side
  static async encryptData(data: string, key: CryptoKey): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_SIZE));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      dataBuffer
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combinedArray = new Uint8Array(iv.length + encryptedArray.length);
    combinedArray.set(iv);
    combinedArray.set(encryptedArray, iv.length);

    return {
      encryptedValue: btoa(String.fromCharCode.apply(null, Array.from(combinedArray))),
      keyId: await this.getKeyId(key),
      algorithm: 'AES-256-GCM',
      createdAt: new Date(),
    };
  }

  // Decrypt sensitive data client-side
  static async decryptData(encryptedData: EncryptedData, key: CryptoKey): Promise<string> {
    const combinedArray = new Uint8Array(
      atob(encryptedData.encryptedValue)
        .split('')
        .map(char => char.charCodeAt(0))
    );

    const iv = combinedArray.slice(0, this.IV_SIZE);
    const encryptedBuffer = combinedArray.slice(this.IV_SIZE);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  // Get a key identifier for tracking
  private static async getKeyId(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', exported);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode.apply(null, Array.from(hashArray))).substring(0, 16);
  }

  // Hash sensitive identifiers for anonymization
  static async hashIdentifier(identifier: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(identifier + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode.apply(null, Array.from(hashArray)));
  }

  // Remove direct identifiers from text (basic implementation)
  static sanitizeText(text: string): string {
    // Remove common PII patterns
    const patterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone numbers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{1,5}\s\w+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi, // Addresses
    ];

    let sanitized = text;
    patterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }
}

// Compliance utilities
export class ComplianceUtils {
  // Detect user's jurisdiction based on various factors
  static detectJurisdiction(): 'US' | 'CA' | 'EU' | 'OTHER' {
    // This is a basic implementation - in production, you'd use more sophisticated detection
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    
    if (timezone.includes('America') && language.startsWith('en')) {
      return timezone.includes('Toronto') || timezone.includes('Montreal') ? 'CA' : 'US';
    } else if (timezone.includes('Europe') || language.startsWith('de') || language.startsWith('fr')) {
      return 'EU';
    } else if (timezone.includes('America') && language.startsWith('fr')) {
      return 'CA';
    }
    
    return 'OTHER';
  }

  // Get client IP address (requires server-side implementation)
  static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.warn('Could not detect IP address:', error);
      return '0.0.0.0';
    }
  }

  // Create audit log entry
  static createAuditLog(
    userId: string,
    action: string,
    resourceId?: string,
    resourceType?: string,
    details?: Record<string, any>
  ): Omit<AuditLog, 'id'> {
    // Build audit log object, excluding undefined fields for Firestore compatibility
    const auditLog: any = {
      userId,
      action,
      timestamp: new Date(),
      ipAddress: '0.0.0.0', // Will be updated by server
      userAgent: navigator.userAgent,
    };

    // Only add resourceId if it's defined
    if (resourceId !== undefined) {
      auditLog.resourceId = resourceId;
    }

    // Only add resourceType if it's defined
    if (resourceType !== undefined) {
      auditLog.resourceType = resourceType;
    }

    // Only add details if it's defined
    if (details !== undefined) {
      auditLog.details = details;
    }

    return auditLog;
  }

  // Validate consent requirements
  static validateConsentRequirements(
    consent: UserConsent,
    requiredConsents: (keyof UserConsent)[]
  ): boolean {
    return requiredConsents.every(requirement => {
      if (typeof consent[requirement] === 'boolean') {
        return consent[requirement] === true;
      }
      return consent[requirement] != null;
    });
  }

  // Calculate data retention period based on jurisdiction
  static getRetentionPeriod(jurisdiction: 'US' | 'CA' | 'EU' | 'OTHER', dataType: string): number {
    const retentionPeriods = {
      'US': { 'personal': 2555, 'anonymized': -1, 'aggregated': -1 }, // 7 years
      'CA': { 'personal': 2555, 'anonymized': -1, 'aggregated': -1 }, // 7 years
      'EU': { 'personal': 2555, 'anonymized': -1, 'aggregated': -1 }, // 7 years
      'OTHER': { 'personal': 2555, 'anonymized': -1, 'aggregated': -1 }, // 7 years
    };

    return retentionPeriods[jurisdiction][dataType as keyof typeof retentionPeriods[typeof jurisdiction]] || 2555;
  }
}

// Data minimization utilities
export class DataMinimization {
  // Ensure only necessary fields are collected
  static sanitizeUserData(userData: any): any {
    const allowedFields = ['uid', 'email', 'displayName', 'role', 'partnerId', 'createdAt', 'lastActiveAt'];
    return Object.keys(userData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = userData[key];
        return obj;
      }, {} as any);
  }

  // Ensure only necessary fields are collected for journal entries
  static sanitizeJournalData(journalData: any): any {
    const allowedFields = ['userId', 'text', 'isShared', 'createdAt', 'analysis', 'appOrigin'];
    return Object.keys(journalData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = journalData[key];
        return obj;
      }, {} as any);
  }
}