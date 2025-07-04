'use client';

import { useState } from 'react';
import { useAuth } from '../../../components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Button } from '@metiscore/ui';

// Mood options with emoji, label, and emotion-based colors
const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Great', value: 'great', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', activeColor: 'bg-yellow-100', shadowColor: 'shadow-yellow-200' },
  { emoji: '😐', label: 'Okay', value: 'okay', bgColor: 'bg-gray-50', borderColor: 'border-gray-300', activeColor: 'bg-gray-100', shadowColor: 'shadow-gray-200' },
  { emoji: '😔', label: 'Down', value: 'down', bgColor: 'bg-blue-50', borderColor: 'border-blue-300', activeColor: 'bg-blue-100', shadowColor: 'shadow-blue-200' },
  { emoji: '😰', label: 'Anxious', value: 'anxious', bgColor: 'bg-orange-50', borderColor: 'border-orange-300', activeColor: 'bg-orange-100', shadowColor: 'shadow-orange-200' },
  { emoji: '😴', label: 'Tired', value: 'tired', bgColor: 'bg-purple-50', borderColor: 'border-purple-300', activeColor: 'bg-purple-100', shadowColor: 'shadow-purple-200' },
  { emoji: '💪', label: 'Strong', value: 'strong', bgColor: 'bg-green-50', borderColor: 'border-green-300', activeColor: 'bg-green-100', shadowColor: 'shadow-green-200' },
];

export default function MoodLoggingPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  // Form state
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isShared, setIsShared] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // Handle mood selection
  const handleMoodSelect = (moodValue: string) => {
    setSelectedMood(moodValue);
  };

  // Handle form submission
  const handleSave = async () => {
    if (!user || !selectedMood) return;
    
    setIsLoading(true);
    
    try {
      // Save to journal_entries collection
      await addDoc(collection(db, 'journal_entries'), {
        userId: user.uid,
        mood: selectedMood,
        text: note.trim() || '', // Use 'text' field to match existing schema
        isShared: isShared,
        createdAt: serverTimestamp(),
        appOrigin: 'meno-wellness',
        type: 'mood_entry'
      });

      // Show success message
      setShowSuccess(true);
      
      // Reset form
      setSelectedMood('');
      setNote('');
      setIsShared(false);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error saving mood entry:', error);
      alert('Failed to save mood entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Get mood emoji for selected mood
  const getSelectedMoodEmoji = () => {
    const mood = MOOD_OPTIONS.find(m => m.value === selectedMood);
    return mood ? mood.emoji : '';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-300 to-green-300 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🌸</div>
          <p className="text-white text-xl font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
            Please sign in to log your mood
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-300 to-green-300 px-4 py-8">
      {/* Header */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🌸</div>
            <h1 className="text-3xl font-bold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
              Mood Check-in
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
      <main className="max-w-lg mx-auto">
        {/* Enhanced Success Message */}
        {showSuccess && (
          <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border-2 border-green-200 animate-fadeIn">
            <div className="text-center">
              <div className="text-6xl mb-3 animate-bounce">{getSelectedMoodEmoji()}</div>
              <div className="space-y-2">
                <p className="text-green-800 font-bold text-xl flex items-center justify-center">
                  <span className="mr-2 animate-pulse">🌸</span>
                  Mood logged successfully!
                  <span className="ml-2 animate-pulse">✨</span>
                </p>
                <p className="text-green-700 text-base leading-relaxed">
                  Thank you for taking care of yourself today. You're doing great! 💕
                </p>
                {isShared && (
                  <p className="text-purple-600 text-sm bg-white/60 rounded-lg py-2 px-3 mt-3">
                    💜 Your partner has been notified
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Mood Logging Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">
            How are you feeling today?
          </h2>
          
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-8">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodSelect(mood.value)}
                className={`
                  relative flex flex-col items-center justify-center
                  w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28
                  rounded-2xl border-3 transition-all duration-300 ease-out
                  touch-manipulation active:scale-95
                  ${selectedMood === mood.value
                    ? `${mood.activeColor} ${mood.borderColor} shadow-lg ${mood.shadowColor} ring-2 ring-opacity-50 ring-offset-2`
                    : `${mood.bgColor} border-gray-200 hover:${mood.borderColor} hover:shadow-md hover:scale-105`
                  }
                `}
                style={{
                  boxShadow: selectedMood === mood.value 
                    ? `0 0 0 3px rgba(255, 138, 128, 0.3), 0 10px 25px -5px rgba(0, 0, 0, 0.1)` 
                    : undefined
                }}
              >
                <div className="text-3xl sm:text-4xl mb-1" style={{ fontSize: '32px' }}>
                  {mood.emoji}
                </div>
                <div className={`text-xs sm:text-sm font-medium text-center leading-tight ${
                  selectedMood === mood.value ? 'text-gray-800' : 'text-gray-600'
                }`}>
                  {mood.label}
                </div>
                
                {/* Gentle glow effect for selected state */}
                {selectedMood === mood.value && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-200/30 to-red-300/30 pointer-events-none" />
                )}
              </button>
            ))}
          </div>

          {/* Enhanced Note Input */}
          <div className="mb-8">
            <label htmlFor="note" className="block text-base font-medium text-gray-700 mb-3">
              Share what's on your mind (optional)
            </label>
            <div className="relative">
              <textarea
                id="note"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  // Auto-expand textarea
                  const textarea = e.target as HTMLTextAreaElement;
                  textarea.style.height = 'auto';
                  textarea.style.height = Math.max(72, textarea.scrollHeight) + 'px';
                }}
                placeholder="What's contributing to this feeling?"
                rows={3}
                className={`
                  w-full px-4 py-4 border-2 rounded-xl text-base leading-relaxed
                  transition-all duration-200 ease-out resize-none
                  placeholder:text-gray-400 placeholder:italic
                  focus:outline-none focus:ring-0
                  ${
                    note.length > 0
                      ? 'border-red-300 bg-red-50/30 focus:border-red-400'
                      : 'border-gray-300 bg-white focus:border-red-300 hover:border-gray-400'
                  }
                `}
                style={{ minHeight: '72px' }}
                maxLength={500}
              />
              
              {/* Character count - subtle and non-limiting */}
              <div className="flex justify-between items-center mt-2">
                <div className="text-sm text-gray-500 italic">
                  {note.length > 0 && "Thank you for sharing your thoughts 💭"}
                </div>
                <div className={`text-xs transition-colors ${
                  note.length > 450 ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {note.length}/500
                </div>
              </div>
            </div>
          </div>

          {/* Modern Toggle Switch for Partner Sharing */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-purple-800 mb-1">
                    Share this mood with my partner
                  </h4>
                  <p className="text-sm text-purple-600">
                    Let them know how you're feeling today 💕
                  </p>
                </div>
                
                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setIsShared(!isShared)}
                  className={`
                    relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ease-out
                    focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2
                    ${isShared ? 'bg-purple-400 shadow-lg' : 'bg-gray-300'}
                  `}
                  aria-pressed={isShared}
                  aria-label="Toggle partner sharing"
                >
                  <span
                    className={`
                      inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-300 ease-out
                      shadow-sm
                      ${isShared ? 'translate-x-6 shadow-md' : 'translate-x-1'}
                    `}
                  >
                    {/* Heart icon when active */}
                    {isShared && (
                      <div className="flex items-center justify-center h-full text-purple-400 text-xs">
                        💜
                      </div>
                    )}
                  </span>
                </button>
              </div>
              
              {/* Visual feedback when sharing is enabled */}
              {isShared && (
                <div className="mt-3 text-center">
                  <p className="text-sm text-purple-700 font-medium bg-white/50 rounded-lg py-2 px-3">
                    ✨ Your partner will be notified about this mood entry
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Save Button */}
          <div className="relative">
            <Button
              onClick={handleSave}
              disabled={!selectedMood || isLoading}
              className={`
                w-full py-5 px-6 rounded-xl font-bold text-white text-lg
                transition-all duration-300 ease-out transform
                focus:outline-none focus:ring-4 focus:ring-red-200
                ${!selectedMood
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none'
                  : isLoading
                  ? 'bg-red-400 cursor-wait scale-98'
                  : 'bg-red-400 hover:bg-red-500 active:scale-98 shadow-lg hover:shadow-xl hover:scale-105'
                }
              `}
              style={{
                background: !selectedMood 
                  ? undefined 
                  : 'linear-gradient(135deg, #FF8A80 0%, #FF7043 100%)',
                boxShadow: selectedMood && !isLoading 
                  ? '0 8px 25px -8px rgba(255, 138, 128, 0.5)' 
                  : undefined
              }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  <span className="animate-pulse">Saving your mood...</span>
                </div>
              ) : !selectedMood ? (
                'Please select a mood first'
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">🌸</span>
                  Log My Mood
                  <span className="ml-2">✨</span>
                </div>
              )}
            </Button>
            
            {/* Success animation overlay */}
            {showSuccess && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-400 rounded-xl animate-pulse">
                <div className="flex items-center text-white font-bold text-lg">
                  <div className="w-6 h-6 mr-2 animate-bounce">✅</div>
                  Saved Successfully!
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
