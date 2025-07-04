'use client';

import { useState, useEffect } from "react";
import { useAuth } from "../../components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { JournalEntry, ConsentManager, DataMinimization, ComplianceUtils, Button } from "@metiscore/ui";
import { SentimentAnalysisResponse, UserConsent } from '@metiscore/types';

// Mood options for the hero section
const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Great', value: 'great' },
  { emoji: '😐', label: 'Okay', value: 'okay' },
  { emoji: '😔', label: 'Down', value: 'down' },
  { emoji: '😰', label: 'Anxious', value: 'anxious' },
  { emoji: '😴', label: 'Tired', value: 'tired' },
  { emoji: '💪', label: 'Strong', value: 'strong' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SentimentAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // Security and compliance state
  const [userConsent, setUserConsent] = useState<UserConsent | null>(null);
  const [showConsentManager, setShowConsentManager] = useState(false);
  
  // Quick mood logging state
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [moodNote, setMoodNote] = useState<string>('');
  const [isSharedWithPartner, setIsSharedWithPartner] = useState<boolean>(false);
  const [isSavingMood, setIsSavingMood] = useState<boolean>(false);
  const [showMoodSuccess, setShowMoodSuccess] = useState<boolean>(false);
  
  // Partner invite state
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string>('');
  
  // Mood history state
  const [selectedDayEntry, setSelectedDayEntry] = useState<JournalEntry | null>(null);
  
  // Partner connection state
  const [hasPartner, setHasPartner] = useState<boolean>(false);
  const [partnerName, setPartnerName] = useState<string>('Alex'); // Mock partner name
  const [showInviteForm, setShowInviteForm] = useState<boolean>(false);

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
      // Build audit log object, excluding undefined fields
      const auditLogBase = {
        userId: user.uid,
        action,
        details: details || {},
        timestamp: serverTimestamp(),
        ipAddress: '0.0.0.0', // Client-side doesn't have access to real IP
        userAgent: navigator.userAgent || 'Unknown',
      };

      // Only add resourceId and resourceType if they are defined
      const auditLog: any = { ...auditLogBase };
      if (resourceId !== undefined) {
        auditLog.resourceId = resourceId;
      }
      if (resourceId !== undefined) {
        auditLog.resourceType = 'journal_entry';
      }
      
      await addDoc(collection(db, 'audit_logs'), auditLog);
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

  // Handle quick mood save
  const handleQuickMoodSave = async () => {
    if (!user || !selectedMood) return;
    
    setIsSavingMood(true);
    
    try {
      await addDoc(collection(db, 'journal_entries'), {
        userId: user.uid,
        mood: selectedMood,
        text: moodNote.trim() || '',
        isShared: isSharedWithPartner,
        createdAt: serverTimestamp(),
        appOrigin: 'meno-wellness',
        type: 'mood_entry'
      });

      setShowMoodSuccess(true);
      setSelectedMood('');
      setMoodNote('');
      setIsSharedWithPartner(false);
      
      setTimeout(() => setShowMoodSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving mood:', error);
    } finally {
      setIsSavingMood(false);
    }
  };

  // Get mood emoji for display
  const getSelectedMoodEmoji = () => {
    const mood = MOOD_OPTIONS.find(m => m.value === selectedMood);
    return mood ? mood.emoji : '';
  };

  // Generate 7-day mood history
  const getLast7DaysMoodHistory = () => {
    const today = new Date();
    const last7Days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toDateString();
      
      // Find mood entry for this day
      const dayEntry = journalEntries.find(entry => {
        if (!entry.createdAt) return false;
        const entryDate = new Date(entry.createdAt.seconds * 1000);
        return entryDate.toDateString() === dateStr;
      });
      
      // Get day name
      const dayName = i === 0 ? 'Today' : 
                     i === 1 ? 'Yesterday' : 
                     date.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Get mood info
      const moodInfo = dayEntry?.mood ? 
        MOOD_OPTIONS.find(m => m.value === dayEntry.mood) : null;
      
      last7Days.push({
        date,
        dateStr,
        dayName,
        entry: dayEntry,
        moodInfo,
        shortDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    
    return last7Days;
  };
  
  // Get mood background color
  const getMoodBackgroundColor = (moodValue?: string) => {
    const mood = MOOD_OPTIONS.find(m => m.value === moodValue);
    if (!mood) return 'bg-gray-50';
    
    switch (moodValue) {
      case 'great': return 'bg-yellow-50 border-yellow-200';
      case 'okay': return 'bg-gray-50 border-gray-200';
      case 'down': return 'bg-blue-50 border-blue-200';
      case 'anxious': return 'bg-orange-50 border-orange-200';
      case 'tired': return 'bg-purple-50 border-purple-200';
      case 'strong': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };
  
  // Get recent shared entries for partner preview
  const getRecentSharedEntries = () => {
    return journalEntries
      .filter(entry => entry.isShared)
      .slice(0, 2)
      .map(entry => ({
        ...entry,
        dayName: entry.createdAt ? 
          (() => {
            const entryDate = new Date(entry.createdAt.seconds * 1000);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            
            if (entryDate.toDateString() === today.toDateString()) return 'Today';
            if (entryDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
            return entryDate.toLocaleDateString('en-US', { weekday: 'long' });
          })()
          : 'Recent'
      }));
  };

  // Generate partner invite code
  const generateInviteCode = async () => {
    if (!user) {
      setInviteError("You must be logged in to generate an invite.");
      return;
    }

    setIsGeneratingCode(true);
    setInviteError('');

    try {
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const newInvite = {
        fromUserId: user.uid,
        status: "pending",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      // Create the document in Firestore using the code as the ID
      await setDoc(doc(db, "invites", code), newInvite);
      setInviteCode(code);

    } catch (err) {
      setInviteError("Failed to generate code. Please try again.");
      console.error(err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  if (!user) return <div className="text-center text-white p-10">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-300 to-green-300 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Consent Manager - Shows when consent is needed */}
        {showConsentManager && (
          <div className="mb-8">
            <ConsentManager
              userId={user.uid}
              onConsentGiven={handleConsentGiven}
              onConsentWithdrawn={handleConsentWithdrawn}
              initialConsent={userConsent}
            />
          </div>
        )}
        
        {/* Main Dashboard Content - Only show when consent is given */}
        {userConsent?.dataProcessing && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mood-Focused Hero Section */}
              <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
                {/* Success Message */}
                {showMoodSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">{getSelectedMoodEmoji()}</div>
                      <p className="text-green-800 font-medium text-base">Your mood has been logged! 💚</p>
                    </div>
                  </div>
                )}
                
                <h1 className="text-3xl font-bold text-gray-800 text-center mb-8">
                  How are you feeling today?
                </h1>
                
                {/* Mood Selection Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => setSelectedMood(mood.value)}
                      className={`p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                        selectedMood === mood.value
                          ? 'border-red-300 bg-red-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="text-4xl mb-2">{mood.emoji}</div>
                      <div className={`text-base font-medium ${
                        selectedMood === mood.value ? 'text-red-700' : 'text-gray-700'
                      }`}>
                        {mood.label}
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* Note Input */}
                <div className="mb-6">
                  <textarea
                    value={moodNote}
                    onChange={(e) => setMoodNote(e.target.value)}
                    placeholder="Add a note about today..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-300 resize-none text-base"
                    maxLength={300}
                  />
                  <p className="text-sm text-gray-500 mt-2">{moodNote.length}/300 characters</p>
                </div>
                
                {/* Partner Sharing */}
                <div className="mb-8">
                  <label className="flex items-center p-4 bg-purple-50 rounded-lg border border-purple-200 cursor-pointer hover:bg-purple-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isSharedWithPartner}
                      onChange={(e) => setIsSharedWithPartner(e.target.checked)}
                      className="w-5 h-5 text-purple-400 border-gray-300 rounded focus:ring-purple-300 mr-3"
                    />
                    <div>
                      <span className="text-base font-medium text-purple-800">Share with partner</span>
                      <p className="text-sm text-purple-600 mt-1">
                        Let your partner know how you're feeling today 💕
                      </p>
                    </div>
                  </label>
                </div>
                
                {/* Log Mood Button */}
                <Button
                  onClick={handleQuickMoodSave}
                  disabled={!selectedMood || isSavingMood}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition-all duration-300 ${
                    !selectedMood || isSavingMood
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-red-400 hover:bg-red-500 hover:scale-105 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isSavingMood ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    'Log My Mood'
                  )}
                </Button>
              </div>
              
              {/* 7-Day Mood Journey */}
              <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="text-3xl">📅</div>
                  <h2 className="text-2xl font-semibold text-gray-800">Your Mood Journey</h2>
                </div>
                
                {journalEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🌱</div>
                    <p className="text-gray-600 text-lg mb-2">Start tracking your daily moods!</p>
                    <p className="text-gray-500 text-sm">Your 7-day mood journey will appear here</p>
                  </div>
                ) : (
                  <>
                    {/* 7-Day Mood Timeline */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                      {getLast7DaysMoodHistory().map((day, index) => (
                        <div
                          key={day.dateStr}
                          onClick={() => day.entry && setSelectedDayEntry(
                            selectedDayEntry?.id === day.entry.id ? null : day.entry
                          )}
                          className={`
                            relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
                            hover:scale-105 hover:shadow-md
                            ${day.entry 
                              ? `${getMoodBackgroundColor(day.entry.mood)} hover:shadow-lg`
                              : 'bg-gray-50 border-dashed border-gray-300 hover:border-gray-400'
                            }
                            ${selectedDayEntry?.id === day.entry?.id 
                              ? 'ring-2 ring-red-300 ring-offset-2 shadow-lg' 
                              : ''
                            }
                          `}
                        >
                          {/* Day Info */}
                          <div className="text-center">
                            <p className={`text-sm font-medium mb-2 ${
                              day.entry ? 'text-gray-800' : 'text-gray-500'
                            }`}>
                              {day.dayName}
                            </p>
                            <p className={`text-xs mb-3 ${
                              day.entry ? 'text-gray-600' : 'text-gray-400'
                            }`}>
                              {day.shortDate}
                            </p>
                            
                            {/* Mood Display */}
                            {day.entry && day.moodInfo ? (
                              <>
                                <div className="text-3xl mb-2" style={{ fontSize: '24px' }}>
                                  {day.moodInfo.emoji}
                                </div>
                                <p className="text-xs font-medium text-gray-700 mb-2">
                                  {day.moodInfo.label}
                                </p>
                                
                                {/* Sharing Indicator */}
                                {day.entry.isShared && (
                                  <div className="flex items-center justify-center">
                                    <div className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full flex items-center">
                                      <span className="mr-1">✓</span>
                                      <span>Shared</span>
                                    </div>
                                  </div>
                                )}
                                
                                {!day.entry.isShared && (
                                  <div className="text-xs text-gray-400">
                                    Private
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="text-3xl mb-2 text-gray-300">
                                  •••
                                </div>
                                <p className="text-xs text-gray-400">
                                  No mood logged
                                </p>
                              </>
                            )}
                          </div>
                          
                          {/* Gentle hover glow for entries */}
                          {day.entry && (
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-100/20 to-red-200/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Selected Day Details */}
                    {selectedDayEntry && (
                      <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-lg p-6 border border-red-200 animate-fadeIn">
                        <div className="flex items-start space-x-4">
                          <div className="text-4xl">
                            {selectedDayEntry.mood ? 
                              MOOD_OPTIONS.find(m => m.value === selectedDayEntry.mood)?.emoji || '💭' 
                              : '📝'
                            }
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-semibold text-gray-800">
                                {selectedDayEntry.createdAt && 
                                  new Date(selectedDayEntry.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'long', 
                                    day: 'numeric'
                                  })
                                }
                              </h4>
                              {selectedDayEntry.isShared && (
                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                                  💕 Shared with partner
                                </span>
                              )}
                            </div>
                            
                            {selectedDayEntry.text && (
                              <p className="text-gray-700 leading-relaxed">
                                {selectedDayEntry.text}
                              </p>
                            )}
                            
                            {selectedDayEntry.mood && (
                              <p className="text-sm text-gray-600 mt-2">
                                Mood: <span className="font-medium">
                                  {MOOD_OPTIONS.find(m => m.value === selectedDayEntry.mood)?.label}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* View Full History Link */}
                    <div className="text-center mt-8">
                      <button
                        onClick={() => router.push('/dashboard/journal')}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-red-400 to-red-500 text-white rounded-lg font-medium hover:from-red-500 hover:to-red-600 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        <span className="mr-2">📋</span>
                        View Full History
                        <span className="ml-2">→</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              {/* Journal Writing Section */}
              <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Journal & Reflection</h2>
                <p className="text-gray-600 mb-6">
                  Take a moment to write about your day, your thoughts, or anything on your mind.
                </p>
                <Button
                  onClick={() => router.push('/dashboard/journal')}
                  className="w-full sm:w-auto bg-green-400 hover:bg-green-500 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                >
                  ✍️ Open Journal
                </Button>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Enhanced Partner Connection */}
              <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
                {hasPartner ? (
                  // CONNECTED PARTNER STATE
                  <>
                    <div className="text-center mb-6">
                      <div className="text-4xl mb-3">💕</div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        Connected with {partnerName}
                      </h3>
                      <p className="text-gray-600 italic">Supporting each other's wellness journey</p>
                    </div>
                    
                    {/* Recent Sharing Preview */}
                    <div className="mb-6">
                      <h4 className="text-base font-semibold text-gray-700 mb-4 flex items-center">
                        <span className="mr-2">🔗</span>
                        Recent sharing:
                      </h4>
                      
                      {getRecentSharedEntries().length > 0 ? (
                        <div className="space-y-3">
                          {getRecentSharedEntries().map((entry) => (
                            <div key={entry.id} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                              <div className="flex items-start space-x-3">
                                <div className="text-2xl">
                                  {entry.mood ? MOOD_OPTIONS.find(m => m.value === entry.mood)?.emoji || '💭' : '📝'}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-purple-800 mb-1">
                                    {entry.dayName}
                                  </p>
                                  <p className="text-gray-700 text-sm line-clamp-2">
                                    "{entry.text || `Feeling ${entry.mood || 'reflective'} today`}"
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg">
                          <p className="text-gray-500 text-sm">
                            No shared moods yet. Start sharing to let {partnerName} support you! 🤗
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        onClick={() => router.push('/dashboard/partner')}
                        className="w-full bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                      >
                        <span className="mr-2">📊</span>
                        Partner Dashboard
                      </Button>
                      <Button
                        onClick={() => setHasPartner(false)} // Mock disconnect
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                      >
                        <span className="mr-2">⚙️</span>
                        Settings
                      </Button>
                    </div>
                  </>
                ) : (
                  // NO PARTNER STATE
                  <>
                    <div className="text-center mb-6">
                      <div className="text-4xl mb-3">🤝</div>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        Share Your Journey
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        Invite your partner to support your wellness journey together.
                      </p>
                    </div>
                    
                    {/* Benefits List */}
                    <div className="mb-8">
                      <h4 className="text-base font-semibold text-gray-700 mb-4 flex items-center">
                        <span className="mr-2">✨</span>
                        Benefits of sharing:
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="text-lg mt-0.5">👀</div>
                          <p className="text-gray-600 text-sm">
                            <span className="font-medium">They see your mood patterns</span><br/>
                            Help them understand your daily experiences
                          </p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="text-lg mt-0.5">🤗</div>
                          <p className="text-gray-600 text-sm">
                            <span className="font-medium">Better support during tough days</span><br/>
                            They'll know when you need extra care
                          </p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="text-lg mt-0.5">🎉</div>
                          <p className="text-gray-600 text-sm">
                            <span className="font-medium">Celebrate good days together</span><br/>
                            Share your wins and positive moments
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Invite Button or Form */}
                    {!showInviteForm ? (
                      <Button
                        onClick={() => setShowInviteForm(true)}
                        className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <span className="mr-2">💕</span>
                        Invite My Partner
                        <span className="ml-2">✨</span>
                      </Button>
                    ) : (
                      // Invite Code Generation
                      <div className="space-y-4">
                        {inviteCode ? (
                          <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                            <p className="text-purple-800 font-semibold mb-3">
                              🎉 Share this code with your partner:
                            </p>
                            <div className="flex items-center justify-center gap-3 mb-4">
                              <div className="text-3xl font-bold tracking-widest text-purple-600 bg-white px-6 py-3 rounded-xl shadow-sm border border-purple-100">
                                {inviteCode}
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(inviteCode);
                                }}
                                className="bg-purple-100 hover:bg-purple-200 text-purple-800 font-medium py-3 px-4 rounded-xl text-sm transition-colors"
                                title="Copy code"
                              >
                                📋 Copy
                              </button>
                            </div>
                            <p className="text-sm text-purple-600 mb-4">
                              💝 Code expires in 7 days
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                onClick={() => setInviteCode('')}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                              >
                                New Code
                              </Button>
                              <Button
                                onClick={() => setHasPartner(true)} // Mock connection
                                className="bg-green-100 hover:bg-green-200 text-green-700 py-2 px-4 rounded-lg font-medium transition-colors"
                              >
                                ✓ Test Connected
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Button
                              onClick={generateInviteCode}
                              disabled={isGeneratingCode}
                              className="w-full bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:bg-gray-400 disabled:scale-100"
                            >
                              {isGeneratingCode ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  Creating your invite...
                                </div>
                              ) : (
                                <>
                                  <span className="mr-2">💕</span>
                                  Generate Invite Code
                                  <span className="ml-2">✨</span>
                                </>
                              )}
                            </Button>
                            
                            <Button
                              onClick={() => setShowInviteForm(false)}
                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-4 rounded-lg font-medium transition-colors"
                            >
                              ← Back
                            </Button>
                          </>
                        )}
                        
                        {inviteError && (
                          <p className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-200">
                            {inviteError}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Wellness Tips */}
              <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Wellness Tip</h3>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-2xl mb-2">🌿</div>
                  <p className="text-green-800 text-sm font-medium mb-2">Mindful Breathing</p>
                  <p className="text-green-700 text-sm">
                    Take 5 deep breaths when you feel overwhelmed. Breathe in for 4, hold for 4, exhale for 6.
                  </p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Entries this week</span>
                    <span className="font-semibold text-red-500">{journalEntries.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Mood logged today</span>
                    <span className="font-semibold text-green-500">{showMoodSuccess ? 'Yes ✓' : 'Not yet'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Partner shared</span>
                    <span className="font-semibold text-purple-500">
                      {journalEntries.filter(e => e.isShared).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Show message when consent is withdrawn */}
        {!userConsent?.dataProcessing && !showConsentManager && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Consent Required</h2>
            <p className="text-gray-600 mb-6">
              We need your consent to help you track your wellness journey.
            </p>
            <Button
              onClick={() => setShowConsentManager(true)}
              className="bg-red-400 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
            >
              Update Privacy Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
