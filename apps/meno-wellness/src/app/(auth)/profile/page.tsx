'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/auth-provider';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@metiscore/ui';
import { UserConsent } from '@metiscore/types';
import { ComplianceUtils } from '@metiscore/ui';

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Consent state - each field can be individually controlled
  const [consent, setConsent] = useState<Partial<UserConsent>>({
    dataProcessing: false,
    sentimentAnalysis: false,
    anonymizedLicensing: false,
    researchParticipation: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [jurisdiction, setJurisdiction] = useState<'US' | 'CA' | 'EU' | 'OTHER'>('US');

  // Load existing consent on mount
  useEffect(() => {
    const loadUserConsent = async () => {
      if (!user) return;
      
      try {
        const consentDoc = await getDoc(doc(db, 'user_consents', user.uid));
        if (consentDoc.exists()) {
          const existingConsent = consentDoc.data() as UserConsent;
          setConsent({
            dataProcessing: existingConsent.dataProcessing || false,
            sentimentAnalysis: existingConsent.sentimentAnalysis || false,
            anonymizedLicensing: existingConsent.anonymizedLicensing || false,
            researchParticipation: existingConsent.researchParticipation || false,
          });
          setJurisdiction(existingConsent.jurisdiction || 'US');
        }
      } catch (error) {
        console.error('Error loading consent:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserConsent();
  }, [user]);

  // Handle individual consent toggle
  const handleConsentToggle = (field: keyof UserConsent, value: boolean) => {
    setConsent(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save consent changes
  const handleSaveConsent = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const fullConsent: UserConsent = {
        userId: user.uid,
        dataProcessing: consent.dataProcessing || false,
        sentimentAnalysis: consent.sentimentAnalysis || false,
        anonymizedLicensing: consent.anonymizedLicensing || false,
        researchParticipation: consent.researchParticipation || false,
        jurisdiction,
        version: '1.0',
        consentTimestamp: new Date(),
        ipAddress: '0.0.0.0', // Client-side doesn't have real IP
        userAgent: navigator.userAgent,
      };

      await setDoc(doc(db, 'user_consents', user.uid), {
        ...fullConsent,
        consentTimestamp: serverTimestamp(),
      });

      setSaveMessage('✅ Consent preferences saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error) {
      console.error('Error saving consent:', error);
      setSaveMessage('❌ Error saving preferences. Please try again.');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Get jurisdiction-specific text
  const getJurisdictionText = () => {
    switch (jurisdiction) {
      case 'EU':
        return {
          title: 'Data Processing Consent (GDPR)',
          subtitle: 'In accordance with the General Data Protection Regulation (GDPR)',
        };
      case 'CA':
        return {
          title: 'Privacy Consent (PIPEDA)',
          subtitle: 'In accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA)',
        };
      case 'US':
        return {
          title: 'Health Information Consent (HIPAA)',
          subtitle: 'In accordance with the Health Insurance Portability and Accountability Act (HIPAA)',
        };
      default:
        return {
          title: 'Data Processing Consent',
          subtitle: 'We respect your privacy and data protection rights',
        };
    }
  };

  const jurisdictionText = getJurisdictionText();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please sign in to access your profile.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-300 to-green-300 px-4 py-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🌿</div>
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
              Your Privacy & Wellness
            </h1>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="p-3 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white/30 transition-colors border border-white/20"
            aria-label="Back to dashboard"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {/* User Info Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8 transition-all duration-300 hover:shadow-xl">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Your Account</h2>
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-purple-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">🌸</span>
            </div>
            <div>
              <p className="text-xl font-medium text-gray-800 mb-1">{user.displayName || 'Welcome!'}</p>
              <p className="text-gray-600 mb-2">{user.email}</p>
              <p className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block">
                Protected by {jurisdiction === 'US' ? 'HIPAA' : jurisdiction === 'CA' ? 'PIPEDA' : 'GDPR'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-8 p-6 rounded-xl shadow-lg ${
            saveMessage.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <div className="text-2xl mr-3">{saveMessage.includes('✅') ? '🌿' : '⚠️'}</div>
              <p className="text-lg font-medium">{saveMessage}</p>
            </div>
          </div>
        )}

        {/* Consent Management Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-3xl">🔒</div>
              <h2 className="text-2xl font-semibold text-gray-800">
                {jurisdictionText.title}
              </h2>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed bg-gray-50 p-4 rounded-lg">
              {jurisdictionText.subtitle}
            </p>
            <p className="text-gray-500 mt-3 text-sm">
              We believe in giving you full control over your personal wellness data. 
              Each setting below can be customized to your comfort level.
            </p>
          </div>

          <div className="space-y-8">
            {/* Data Processing */}
            <div className="border border-red-200 rounded-xl p-6 bg-red-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-xl">📊</div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Data Processing <span className="text-red-600 text-sm font-medium bg-red-100 px-2 py-1 rounded-full">*Required</span>
                    </h3>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    I consent to the processing of my personal data for the purpose of providing wellness services and relationship insights.
                  </p>
                </div>
                <div className="flex space-x-6 ml-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="dataProcessing"
                      checked={consent.dataProcessing === true}
                      onChange={() => handleConsentToggle('dataProcessing', true)}
                      className="h-5 w-5 text-red-400 focus:ring-red-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-green-700">On</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="dataProcessing"
                      checked={consent.dataProcessing === false}
                      onChange={() => handleConsentToggle('dataProcessing', false)}
                      className="h-5 w-5 text-red-400 focus:ring-red-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-red-700">Off</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sentiment Analysis */}
            <div className="border border-purple-200 rounded-xl p-6 bg-purple-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-xl">🧠</div>
                    <h3 className="text-lg font-semibold text-gray-800">Sentiment Analysis</h3>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    I consent to the automated analysis of my journal entries to provide emotional insights and wellness recommendations.
                  </p>
                </div>
                <div className="flex space-x-6 ml-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="sentimentAnalysis"
                      checked={consent.sentimentAnalysis === true}
                      onChange={() => handleConsentToggle('sentimentAnalysis', true)}
                      className="h-5 w-5 text-purple-400 focus:ring-purple-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-green-700">On</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="sentimentAnalysis"
                      checked={consent.sentimentAnalysis === false}
                      onChange={() => handleConsentToggle('sentimentAnalysis', false)}
                      className="h-5 w-5 text-purple-400 focus:ring-purple-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-red-700">Off</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Anonymized Data Licensing */}
            <div className="border border-green-200 rounded-xl p-6 bg-green-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-xl">🌍</div>
                    <h3 className="text-lg font-semibold text-gray-800">Anonymized Data Licensing</h3>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    I consent to the use of my anonymized, aggregated data for research purposes and clinical trials to advance healthcare.
                  </p>
                </div>
                <div className="flex space-x-6 ml-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="anonymizedLicensing"
                      checked={consent.anonymizedLicensing === true}
                      onChange={() => handleConsentToggle('anonymizedLicensing', true)}
                      className="h-5 w-5 text-green-400 focus:ring-green-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-green-700">On</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="anonymizedLicensing"
                      checked={consent.anonymizedLicensing === false}
                      onChange={() => handleConsentToggle('anonymizedLicensing', false)}
                      className="h-5 w-5 text-green-400 focus:ring-green-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-red-700">Off</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Research Participation */}
            <div className="border border-blue-200 rounded-xl p-6 bg-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="text-xl">🔬</div>
                    <h3 className="text-lg font-semibold text-gray-800">Research Participation</h3>
                  </div>
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    I consent to participate in anonymous research studies that may help improve mental health and wellness services.
                  </p>
                </div>
                <div className="flex space-x-6 ml-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="researchParticipation"
                      checked={consent.researchParticipation === true}
                      onChange={() => handleConsentToggle('researchParticipation', true)}
                      className="h-5 w-5 text-blue-400 focus:ring-blue-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-green-700">On</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="researchParticipation"
                      checked={consent.researchParticipation === false}
                      onChange={() => handleConsentToggle('researchParticipation', false)}
                      className="h-5 w-5 text-blue-400 focus:ring-blue-300 border-gray-300"
                    />
                    <span className="ml-3 text-base font-medium text-red-700">Off</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* User Rights */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-2xl">⚖️</div>
              <h4 className="text-lg font-semibold text-blue-900">Your Rights</h4>
            </div>
            <ul className="text-blue-800 space-y-2">
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">✓</span>
                <span>Right to access your personal data</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">✓</span>
                <span>Right to correct inaccurate data</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">✓</span>
                <span>Right to delete your data</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">✓</span>
                <span>Right to data portability</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-blue-500">✓</span>
                <span>Right to withdraw consent at any time</span>
              </li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <Button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConsent}
              disabled={isSaving}
              className="px-8 py-3 bg-red-400 hover:bg-red-500 text-white rounded-lg font-semibold transition-all duration-300 hover:scale-105 disabled:bg-gray-400 disabled:scale-100"
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </div>
              ) : (
                '🌿 Save Preferences'
              )}
            </Button>
          </div>

          <p className="text-sm text-gray-600 mt-6 p-4 bg-gray-50 rounded-lg">
            🌿 <strong>Note:</strong> Data Processing consent is required for basic app functionality. 
            Optional consents help us provide better services and advance healthcare research. 
            You can change these settings anytime.
          </p>
        </div>
      </main>
    </div>
  );
}