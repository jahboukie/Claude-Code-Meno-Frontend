// packages/apps/partner-support/src/app/components/PartnerDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { RichAnalysisResponse, SentimentAnalysisResponse } from '@metiscore/types';
import { AnalysisReport, Button } from '@metiscore/ui';

interface PartnerDashboardProps {
  primaryUserId: string;
}

interface SharedJournalEntry {
  id: string;
  text: string;
  createdAt: Timestamp;
}

export const PartnerDashboard = ({ primaryUserId }: PartnerDashboardProps) => {
  const [sharedEntries, setSharedEntries] = useState<SharedJournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for handling the analysis report
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RichAnalysisResponse | SentimentAnalysisResponse | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (!primaryUserId) return;
    const entriesRef = collection(db, 'journal_entries');

    // This is the complex query that requires the Firestore Index
    const q = query(
      entriesRef,
      where('userId', '==', primaryUserId),
      where('isShared', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SharedJournalEntry[];
      setSharedEntries(entries);
      setIsLoading(false);
      setError(null); // Clear error on success
    }, (err) => {
      // This is where the error containing the "magic link" will be caught
      console.error("Firestore query error:", err);
      setError("Data could not be loaded. A database index is likely required. Please check the browser's developer console for a link to create it.");
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount
  }, [primaryUserId]);

  const handleAnalyzeClick = async (entry: SharedJournalEntry) => {
    setSelectedEntryId(entry.id);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_SENTIMENT_API_URL!, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ text: entry.text, focus: "Menopause Analysis" }),
      });
      if(!response.ok) throw new Error("API request failed");
      const result = await response.json();
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      // Set an error state to be displayed in the UI
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold text-gray-800">Partner Dashboard</h1>
      <p className="mt-2 text-gray-600">Viewing shared entries from your partner.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Column 1: List of Entries */}
        <div className="border-t pt-6 space-y-4 max-h-[60vh] overflow-y-auto pr-3">
          {isLoading && <p>Loading entries...</p>}
          {error && <p className="text-red-500 bg-red-50 p-3 rounded-md">{error}</p>}
          {!isLoading && sharedEntries.length === 0 && !error && (
            <p className="text-center text-gray-500 py-8">Your partner has not shared any entries yet.</p>
          )}
          {sharedEntries.map(entry => (
            <div key={entry.id} className={`p-4 rounded-lg transition-all border ${selectedEntryId === entry.id ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
              <p className="text-slate-800 whitespace-pre-wrap">{entry.text}</p>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-slate-500">{new Date(entry.createdAt.seconds * 1000).toLocaleString()}</p>
                <Button onClick={() => handleAnalyzeClick(entry)} disabled={isAnalyzing && selectedEntryId === entry.id} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                  {isAnalyzing && selectedEntryId === entry.id ? 'Loading...' : 'Analyze'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Column 2: Analysis Report */}
        <div className="sticky top-24">
          <div className="border rounded-lg p-4 min-h-[300px] flex items-center justify-center">
            {isAnalyzing && <p>Analyzing...</p>}
            {!isAnalyzing && analysisResult && <AnalysisReport response={analysisResult} />}
            {!isAnalyzing && !analysisResult && <p className="text-gray-500">Select an entry to analyze.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
