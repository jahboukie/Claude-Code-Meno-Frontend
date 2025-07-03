// packages/apps/meno-wellness/src/app/(auth)/dashboard/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useAuth } from "../../components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';

import { Journal, AnalysisReport, JournalEntry, ConsentManager, DataMinimization, ComplianceUtils } from "@metiscore/ui";
import { InvitePartnerCard } from "../../components/InvitePartnerCard";
import { DashboardCard } from "../../components/DashboardCard";
import { SentimentAnalysisResponse, UserConsent } from '@metiscore/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SentimentAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Security and compliance state
  const [userConsent, setUserConsent] = useState<UserConsent | null>(null);
  const [showConsentManager, setShowConsentManager] = useState(false);

  // Load user consent on component mount
  useEffect(() => {
    const loadUserConsent = async () => {
      if (!user) return;
      
      try {
        const consentDoc = await getDoc(doc(db, 'user_consents', user.uid));
        if (consentDoc.exists()) {
          const consent = consentDoc.data() as UserConsent;
          setUserConsent(consent);
          setShowConsentManager(!consent.dataProcessing);
        } else {
          setShowConsentManager(true);
        }
      } catch (error) {
        console.error('Error loading consent:', error);
        setShowConsentManager(true);
      }
    };

    loadUserConsent();
  }, [user]);

  // Handle consent submission
  const handleConsentGiven = async (consent: UserConsent) => {
    try {
      await setDoc(doc(db, 'user_consents', user!.uid), {
        ...consent,
        consentTimestamp: serverTimestamp(),
      });
      setUserConsent(consent);
      setShowConsentManager(false);
      
      // Log consent action for audit trail
      await logUserAction('consent_given');
    } catch (error) {
      console.error('Error saving consent:', error);
      throw error;
    }
  };

  // Handle consent withdrawal
  const handleConsentWithdrawn = async () => {
    try {
      if (!user || !userConsent) return;
      
      const withdrawnConsent = {
        ...userConsent,
        dataProcessing: false,
        sentimentAnalysis: false,
        anonymizedLicensing: false,
        researchParticipation: false,
        withdrawnAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, 'user_consents', user.uid), withdrawnConsent);
      setUserConsent(withdrawnConsent as UserConsent);
      setShowConsentManager(true);
      
      // Log withdrawal action
      await logUserAction('consent_withdrawn');
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      throw error;
    }
  };

  // Audit logging function
  const logUserAction = async (action: string, resourceId?: string, details?: any) => {
    if (!user) return;
    
    try {
      const auditLog = ComplianceUtils.createAuditLog(
        user.uid,
        action,
        resourceId,
        'journal_entry',
        details
      );
      
      await addDoc(collection(db, 'audit_logs'), {
        ...auditLog,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging action:', error);
      // Don't throw - audit logging should not break functionality
    }
  };

  // DATA FETCHING LOGIC NOW LIVES ON THE PAGE
  useEffect(() => {
    if (!user) {
      setJournalEntries([]);
      return;
    }
    const q = query(collection(db, 'journal_entries'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as JournalEntry[];
      setJournalEntries(entries);
    }, (error) => {
      console.error("MenoWellness query failed:", error); // Log the specific error
    });
    return () => unsubscribe();
  }, [user]);

  // ENHANCED SAVE LOGIC WITH SECURITY AND COMPLIANCE
  const handleSaveEntry = async (text: string, isShared: boolean) => {
    if (!text.trim() || !user) return;
    
    // Check consent before saving
    if (!userConsent?.dataProcessing) {
      console.error('Cannot save entry: No data processing consent');
      return;
    }
    
    setIsSaving(true);
    try {
      // Data minimization and sanitization
      const sanitizedText = ComplianceUtils.validateConsentRequirements(
        userConsent,
        ['dataProcessing']
      ) ? text : '[CONSENT_REQUIRED]';
      
      // Create journal entry with compliance metadata
      const journalData = DataMinimization.sanitizeJournalData({
        userId: user.uid,
        text: sanitizedText,
        isShared: isShared,
        createdAt: serverTimestamp(),
        appOrigin: 'MenoWellness',
        analysis: {}, // Will be populated by sentiment analysis
      });

      const docRef = await addDoc(collection(db, 'journal_entries'), journalData);
      
      // Log the action for audit trail
      await logUserAction('journal_entry_created', docRef.id, {
        isShared,
        textLength: text.length,
        hasConsent: userConsent.dataProcessing,
      });
      
    } catch (err) {
      console.error("Failed to save entry:", err);
      await logUserAction('journal_entry_create_failed', undefined, {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyzeRequest = async (text: string) => {
    // Check consent for sentiment analysis
    if (!userConsent?.sentimentAnalysis) {
      setAnalysisError("Sentiment analysis consent required. Please update your consent preferences.");
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    
    const analysisApiUrl = process.env.NEXT_PUBLIC_SENTIMENT_API_URL;
    if (!analysisApiUrl) {
      setAnalysisError("The analysis service is not configured correctly.");
      setIsAnalyzing(false);
      return;
    }
    
    try {
      // Log analysis request for audit trail
      await logUserAction('sentiment_analysis_requested', undefined, {
        textLength: text.length,
        hasConsent: userConsent.sentimentAnalysis,
      });
      
      const response = await fetch(analysisApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, focus: "Menopause Analysis" }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed');
      }
      
      const result: SentimentAnalysisResponse = await response.json();
      setAnalysisResult(result);
      
      // Log successful analysis
      await logUserAction('sentiment_analysis_completed', undefined, {
        hasResult: !!result,
        riskLevel: result.crisisAssessment?.risk_level,
      });
      
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred.";
      setAnalysisError(errorMessage);
      
      // Log analysis failure
      await logUserAction('sentiment_analysis_failed', undefined, {
        error: errorMessage,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!user) return <div className="text-center text-white p-10">Redirecting...</div>;

  return (
    <div className="p-4 md:p-0">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto items-start">
        <div className="lg:col-span-2 space-y-8">
          {/* Consent Manager - Shows when consent is needed */}
          {showConsentManager && (
            <ConsentManager
              userId={user.uid}
              onConsentGiven={handleConsentGiven}
              onConsentWithdrawn={handleConsentWithdrawn}
              initialConsent={userConsent}
            />
          )}
          
          {/* Main Dashboard Content - Only show when consent is given */}
          {userConsent?.dataProcessing && (
            <>
              <DashboardCard title="AI Chat"><p className="text-center text-gray-500 p-8">The AI Chat component will go here.</p></DashboardCard>
              <DashboardCard title="My Journal">
                <Journal
                  entries={journalEntries}
                  isSaving={isSaving}
                  onSaveEntry={handleSaveEntry}
                  onAnalyzeClick={handleAnalyzeRequest}
                />
              </DashboardCard>
              <DashboardCard title="Invite Your Partner"><InvitePartnerCard /></DashboardCard>
            </>
          )}
          
          {/* Show message when consent is withdrawn */}
          {!userConsent?.dataProcessing && !showConsentManager && (
            <DashboardCard title="Consent Required">
              <div className="text-center p-8">
                <p className="text-gray-600 mb-4">
                  Data processing consent is required to use this application.
                </p>
                <button
                  onClick={() => setShowConsentManager(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Update Consent Preferences
                </button>
              </div>
            </DashboardCard>
          )}
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <DashboardCard title="Analysis Report" className="min-h-[24rem] flex flex-col justify-center">
              {isAnalyzing && <div className="text-center"><p className="text-lg font-semibold text-slate-700">Analyzing...</p></div>}
              {analysisError && !isAnalyzing && <div className="text-center text-red-600 bg-red-50 p-4 rounded-lg"><p className="font-bold">Analysis Failed</p><p className="text-sm">{analysisError}</p></div>}
              {!isAnalyzing && analysisResult && <AnalysisReport response={analysisResult} />}
              {!isAnalyzing && !analysisResult && !analysisError && <div className="text-center"><p className="text-slate-500">Click "Analyze" on a past journal entry.</p></div>}
            </DashboardCard>
          </div>
        </div>
      </div>
    </div>
  );
}
