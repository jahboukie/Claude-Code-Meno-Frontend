// Consent management component for GDPR/PIPEDA/HIPAA compliance
'use client';

import React, { useState, useEffect } from 'react';
import { UserConsent } from '@metiscore/types';
import { ComplianceUtils } from './security-utils';
import { Button } from './Button';

interface ConsentManagerProps {
  userId: string;
  onConsentGiven: (consent: UserConsent) => void;
  onConsentWithdrawn: () => void;
  initialConsent?: UserConsent | null;
}

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  userId,
  onConsentGiven,
  onConsentWithdrawn,
  initialConsent
}) => {
  const [consent, setConsent] = useState<Partial<UserConsent>>({
    userId,
    dataProcessing: false,
    sentimentAnalysis: false,
    anonymizedLicensing: false,
    researchParticipation: false,
    jurisdiction: ComplianceUtils.detectJurisdiction(),
    version: '1.0',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasExistingConsent, setHasExistingConsent] = useState(false);

  useEffect(() => {
    if (initialConsent) {
      setConsent(initialConsent);
      setHasExistingConsent(true);
    }
  }, [initialConsent]);

  const handleConsentChange = (field: keyof UserConsent, value: boolean) => {
    setConsent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitConsent = async () => {
    setIsLoading(true);
    try {
      const ipAddress = await ComplianceUtils.getClientIP();
      
      const fullConsent: UserConsent = {
        ...consent,
        consentTimestamp: new Date(),
        ipAddress,
        userAgent: navigator.userAgent,
      } as UserConsent;

      await onConsentGiven(fullConsent);
      setHasExistingConsent(true);
    } catch (error) {
      console.error('Error submitting consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdrawConsent = async () => {
    setIsLoading(true);
    try {
      await onConsentWithdrawn();
      setConsent(prev => ({
        ...prev,
        dataProcessing: false,
        sentimentAnalysis: false,
        anonymizedLicensing: false,
        researchParticipation: false,
      }));
      setHasExistingConsent(false);
    } catch (error) {
      console.error('Error withdrawing consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getJurisdictionSpecificText = () => {
    switch (consent.jurisdiction) {
      case 'EU':
        return {
          title: 'Data Processing Consent (GDPR)',
          subtitle: 'In accordance with the General Data Protection Regulation (GDPR)',
          withdrawalText: 'You have the right to withdraw your consent at any time.',
        };
      case 'CA':
        return {
          title: 'Privacy Consent (PIPEDA)',
          subtitle: 'In accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA)',
          withdrawalText: 'You may withdraw your consent at any time, subject to legal restrictions.',
        };
      case 'US':
        return {
          title: 'Health Information Consent (HIPAA)',
          subtitle: 'In accordance with the Health Insurance Portability and Accountability Act (HIPAA)',
          withdrawalText: 'You may revoke this consent at any time in writing.',
        };
      default:
        return {
          title: 'Data Processing Consent',
          subtitle: 'We respect your privacy and data protection rights',
          withdrawalText: 'You may withdraw your consent at any time.',
        };
    }
  };

  const jurisdictionText = getJurisdictionSpecificText();

  if (hasExistingConsent && consent.dataProcessing) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-green-800">
              ✓ Consent Active
            </h3>
            <p className="text-sm text-green-600">
              Your data processing consent is active. 
              Last updated: {consent.consentTimestamp ? new Date(consent.consentTimestamp).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <Button
            onClick={handleWithdrawConsent}
            disabled={isLoading}
            className="bg-red-600 text-white text-sm px-3 py-1 rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Processing...' : 'Withdraw Consent'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {jurisdictionText.title}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        {jurisdictionText.subtitle}
      </p>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="dataProcessing"
            checked={consent.dataProcessing || false}
            onChange={(e) => handleConsentChange('dataProcessing', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="dataProcessing" className="text-sm text-gray-700">
            <span className="font-medium">Data Processing</span>
            <span className="text-red-500 ml-1">*</span>
            <p className="text-xs text-gray-500 mt-1">
              I consent to the processing of my personal data for the purpose of providing wellness services and relationship insights.
            </p>
          </label>
        </div>

        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="sentimentAnalysis"
            checked={consent.sentimentAnalysis || false}
            onChange={(e) => handleConsentChange('sentimentAnalysis', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="sentimentAnalysis" className="text-sm text-gray-700">
            <span className="font-medium">Sentiment Analysis</span>
            <p className="text-xs text-gray-500 mt-1">
              I consent to the automated analysis of my journal entries to provide emotional insights and wellness recommendations.
            </p>
          </label>
        </div>

        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="anonymizedLicensing"
            checked={consent.anonymizedLicensing || false}
            onChange={(e) => handleConsentChange('anonymizedLicensing', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="anonymizedLicensing" className="text-sm text-gray-700">
            <span className="font-medium">Anonymized Data Licensing</span>
            <p className="text-xs text-gray-500 mt-1">
              I consent to the use of my anonymized, aggregated data for research purposes and clinical trials to advance healthcare.
            </p>
          </label>
        </div>

        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="researchParticipation"
            checked={consent.researchParticipation || false}
            onChange={(e) => handleConsentChange('researchParticipation', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="researchParticipation" className="text-sm text-gray-700">
            <span className="font-medium">Research Participation</span>
            <p className="text-xs text-gray-500 mt-1">
              I consent to participate in anonymous research studies that may help improve mental health and wellness services.
            </p>
          </label>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Your Rights</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Right to access your personal data</li>
          <li>• Right to correct inaccurate data</li>
          <li>• Right to delete your data</li>
          <li>• Right to data portability</li>
          <li>• {jurisdictionText.withdrawalText}</li>
        </ul>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmitConsent}
          disabled={!consent.dataProcessing || isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Processing...' : 'Give Consent'}
        </Button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        * Required for basic app functionality. Optional consents help us provide better services and advance healthcare research.
      </p>
    </div>
  );
};