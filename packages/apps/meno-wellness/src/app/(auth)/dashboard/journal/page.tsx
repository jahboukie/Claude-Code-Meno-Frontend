'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@metiscore/ui';
import { JournalEntry } from '@metiscore/types';

export default function JournalPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Journal state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<string>('');
  const [isShared, setIsShared] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  // Load journal entries
  useEffect(() => {
    if (!user) {
      setJournalEntries([]);
      return;
    }
    
    const q = query(
      collection(db, 'journal_entries'), 
      where('userId', '==', user.uid), 
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as JournalEntry[];
      setJournalEntries(entries);
    }, (error) => {
      console.error("Journal query failed:", error);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Save new journal entry
  const handleSaveEntry = async () => {
    if (!user || !currentEntry.trim()) return;
    
    setIsSaving(true);
    
    try {
      await addDoc(collection(db, 'journal_entries'), {
        userId: user.uid,
        text: currentEntry.trim(),
        isShared: isShared,
        createdAt: serverTimestamp(),
        appOrigin: 'meno-wellness',
        type: 'journal_entry'
      });

      setShowSuccess(true);
      setCurrentEntry('');
      setIsShared(false);
      
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error saving journal entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete journal entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    
    try {
      await deleteDoc(doc(db, 'journal_entries', entryId));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-300 to-green-300 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🌸</div>
          <p className="text-white text-xl font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
            Please sign in to access your journal
          </p>
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
            <div className="text-3xl">📝</div>
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
              My Journal
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
        <p className="text-white/90 mt-2 text-lg" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.2)' }}>
          A safe space for your thoughts, feelings, and reflections
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Writing Area */}
        <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center">
                <div className="text-2xl mr-3">✨</div>
                <div>
                  <p className="text-green-800 font-semibold">Journal entry saved!</p>
                  <p className="text-green-600 text-sm mt-1">Your thoughts have been safely stored 💚</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 mb-6">
            <div className="text-2xl">🌸</div>
            <h2 className="text-2xl font-semibold text-gray-800">Write Your Thoughts</h2>
          </div>

          {/* Writing Textarea */}
          <div className="mb-6">
            <label htmlFor="journal-entry" className="block text-base font-medium text-gray-700 mb-3">
              What's on your mind today?
            </label>
            <textarea
              id="journal-entry"
              value={currentEntry}
              onChange={(e) => {
                setCurrentEntry(e.target.value);
                // Auto-expand textarea
                const textarea = e.target as HTMLTextAreaElement;
                textarea.style.height = 'auto';
                textarea.style.height = Math.max(120, textarea.scrollHeight) + 'px';
              }}
              placeholder="Dear journal... Share your thoughts, feelings, experiences, or anything that comes to mind. This is your safe space."
              rows={6}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-base leading-relaxed resize-none transition-all duration-200 focus:border-red-300 focus:ring-0 focus:outline-none placeholder:text-gray-400 placeholder:italic"
              style={{ minHeight: '120px' }}
            />
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm text-gray-500 italic">
                {currentEntry.length > 0 && "Thank you for sharing 💭"}
              </div>
              <div className="text-xs text-gray-400">
                {currentEntry.length} characters
              </div>
            </div>
          </div>

          {/* Partner Sharing Toggle */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-purple-800">
                    Share with partner
                  </h4>
                  <p className="text-sm text-purple-600">
                    Let them read this journal entry 💕
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsShared(!isShared)}
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300
                    focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2
                    ${isShared ? 'bg-purple-400' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300
                      ${isShared ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveEntry}
            disabled={!currentEntry.trim() || isSaving}
            className={`
              w-full py-4 px-6 rounded-xl font-bold text-white text-lg transition-all duration-300
              ${!currentEntry.trim() || isSaving
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 shadow-lg hover:shadow-xl hover:scale-105'
              }
            `}
          >
            {isSaving ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                Saving your thoughts...
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="mr-2">🌸</span>
                Save Journal Entry
                <span className="ml-2">✨</span>
              </div>
            )}
          </Button>
        </div>

        {/* Journal Entries History */}
        <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center space-x-2 mb-6">
            <div className="text-2xl">📖</div>
            <h3 className="text-2xl font-semibold text-gray-800">Your Journal Entries</h3>
          </div>

          {journalEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌱</div>
              <p className="text-gray-600 text-lg">Start your journaling journey!</p>
              <p className="text-gray-500 text-sm mt-2">Your first entry will appear here</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {journalEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="text-lg">
                          {entry.mood ? '😊' : '📝'}
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatDate(entry.createdAt)}
                        </p>
                        {entry.isShared && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                            💕 Shared
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-800 text-sm line-clamp-3">
                        {entry.text}
                      </p>
                      
                      {selectedEntry?.id === entry.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                            {entry.text}
                          </p>
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEntry(entry.id);
                              }}
                              className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                            >
                              Delete Entry
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}