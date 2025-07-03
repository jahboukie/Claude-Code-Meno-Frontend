// Enhanced authentication provider with security and compliance features
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserConsent, AuditLog } from '@metiscore/types';
import { ComplianceUtils } from './security-utils';

interface SecurityAuthContextType {
  user: FirebaseUser | null;
  userConsent: UserConsent | null;
  loading: boolean;
  hasValidConsent: boolean;
  updateConsent: (consent: UserConsent) => Promise<void>;
  withdrawConsent: () => Promise<void>;
  logAction: (action: string, resourceId?: string, details?: any) => Promise<void>;
}

const SecurityAuthContext = createContext<SecurityAuthContextType | undefined>(undefined);

interface SecurityAuthProviderProps {
  children: React.ReactNode;
  auth: any; // Firebase auth instance
  db: any; // Firestore db instance
  onboardUser: (user: FirebaseUser) => Promise<void>;
}

export function SecurityAuthProvider({ 
  children, 
  auth, 
  db, 
  onboardUser 
}: SecurityAuthProviderProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userConsent, setUserConsent] = useState<UserConsent | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user consent from Firestore
  const loadUserConsent = async (userId: string) => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const consentDoc = await getDoc(doc(db, 'user_consents', userId));
      
      if (consentDoc.exists()) {
        const consentData = consentDoc.data() as UserConsent;
        setUserConsent(consentData);
        return consentData;
      }
      return null;
    } catch (error) {
      console.error('Error loading user consent:', error);
      return null;
    }
  };

  // Update user consent
  const updateConsent = async (consent: UserConsent) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Add server timestamp for audit trail
      const consentWithTimestamp = {
        ...consent,
        consentTimestamp: serverTimestamp(),
      };

      await setDoc(doc(db, 'user_consents', user.uid), consentWithTimestamp);
      setUserConsent(consent);

      // Log the consent action
      await logAction('consent_updated', user.uid, {
        consentTypes: Object.keys(consent).filter(key => 
          typeof consent[key as keyof UserConsent] === 'boolean' && consent[key as keyof UserConsent]
        ),
      });

    } catch (error) {
      console.error('Error updating consent:', error);
      throw error;
    }
  };

  // Withdraw user consent
  const withdrawConsent = async () => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      
      const withdrawnConsent = {
        ...userConsent,
        dataProcessing: false,
        sentimentAnalysis: false,
        anonymizedLicensing: false,
        researchParticipation: false,
        withdrawnAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'user_consents', user.uid), withdrawnConsent);
      setUserConsent(withdrawnConsent as UserConsent);

      // Log the withdrawal action
      await logAction('consent_withdrawn', user.uid);

    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw error;
    }
  };

  // Log user actions for audit trail
  const logAction = async (action: string, resourceId?: string, details?: any) => {
    if (!user) return;

    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      const auditLog: Omit<AuditLog, 'id'> = ComplianceUtils.createAuditLog(
        user.uid,
        action,
        resourceId,
        undefined, // resourceType will be inferred
        details
      );

      // Override with server timestamp for consistency
      const logWithServerTimestamp = {
        ...auditLog,
        timestamp: serverTimestamp(),
      };

      await addDoc(collection(db, 'audit_logs'), logWithServerTimestamp);
    } catch (error) {
      console.error('Error logging action:', error);
      // Don't throw - audit logging should not break app functionality
    }
  };

  // Set up data retention tracking
  const setupDataRetention = async (userId: string) => {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const jurisdiction = ComplianceUtils.detectJurisdiction();
      const retentionPeriod = ComplianceUtils.getRetentionPeriod(jurisdiction, 'personal');

      const retentionData = {
        userId,
        dataType: 'personal',
        createdAt: serverTimestamp(),
        retentionPeriod,
        jurisdiction,
      };

      await setDoc(doc(db, 'data_retention', userId), retentionData);
    } catch (error) {
      console.error('Error setting up data retention:', error);
    }
  };

  useEffect(() => {
    const { onAuthStateChanged } = auth;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Onboard user first
        await onboardUser(firebaseUser);
        
        // Load their consent status
        await loadUserConsent(firebaseUser.uid);
        
        // Set up data retention tracking
        await setupDataRetention(firebaseUser.uid);
        
        // Log sign-in action
        await logAction('user_signin', firebaseUser.uid);
      } else {
        setUserConsent(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, db, onboardUser]);

  // Check if user has valid consent for data processing
  const hasValidConsent = userConsent?.dataProcessing === true;

  const value: SecurityAuthContextType = {
    user,
    userConsent,
    loading,
    hasValidConsent,
    updateConsent,
    withdrawConsent,
    logAction,
  };

  return (
    <SecurityAuthContext.Provider value={value}>
      {!loading && children}
    </SecurityAuthContext.Provider>
  );
}

export const useSecurityAuth = () => {
  const context = useContext(SecurityAuthContext);
  if (context === undefined) {
    throw new Error('useSecurityAuth must be used within a SecurityAuthProvider');
  }
  return context;
};