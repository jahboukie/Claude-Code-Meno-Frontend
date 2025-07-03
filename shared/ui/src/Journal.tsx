// packages/shared/ui/src/Journal.tsx
'use client';

import React, { useState } from 'react';
import { Button } from './Button';

export interface JournalEntry {
  id: string;
  text: string;
  createdAt: { toDate: () => Date } | null;
  isShared: boolean;
}

interface JournalProps {
  entries: JournalEntry[];
  isSaving: boolean;
  onSaveEntry: (text: string, isShared: boolean) => Promise<void>;
  onAnalyzeClick: (text: string) => void;
}

export const Journal = ({ entries, isSaving, onSaveEntry, onAnalyzeClick }: JournalProps) => {
  const [newEntryText, setNewEntryText] = useState('');
  const [isShared, setIsShared] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveEntry(newEntryText, isShared);
    setNewEntryText('');
    setIsShared(false);
  };

  return (
    <div>
      <form onSubmit={handleSave} className="mb-6">
        <textarea
          value={newEntryText}
          onChange={(e) => setNewEntryText(e.target.value)}
          placeholder="How are you feeling today?"
          className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 h-32"
          disabled={isSaving}
        />
        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              disabled={isSaving}
            />
            <span className="ml-2 text-sm text-slate-700">Share with partner</span>
          </label>
          <Button
            type="submit"
            disabled={isSaving || !newEntryText.trim()}
            className="rounded-md bg-slate-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 disabled:bg-gray-400"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>

      <h3 className="text-xl font-bold text-slate-800 mb-4 pt-4 border-t">Past Entries</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {entries.length > 0 ? entries.map((entry) => (
          <div key={entry.id} className="bg-white p-4 rounded-lg shadow-md">
            <p className="text-slate-800 whitespace-pre-wrap">{entry.text}</p>
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-slate-500">
                {entry.createdAt ? entry.createdAt.toDate().toLocaleString() : 'Just now'}
              </p>
              <div className="flex items-center space-x-2">
                {entry.isShared && <span className="text-xs bg-sky-100 text-sky-700 font-medium px-2 py-1 rounded-full">Shared</span>}
                <Button
                  onClick={() => onAnalyzeClick(entry.text)}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  Analyze
                </Button>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-slate-500 text-center py-4">No past entries yet.</p>
        )}
      </div>
    </div>
  );
};
