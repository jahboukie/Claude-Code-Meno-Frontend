'use client';

import { useState } from 'react';
import { Button } from '@metiscore/ui';
import { useAuth } from './auth-provider';
import { doc, setDoc, Timestamp } from 'firebase/firestore'; // <-- Import Firestore tools
import { db } from '@/lib/firebase'; // <-- Import our db connection

export function InvitePartnerCard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const generateCode = async () => {
    if (!user) {
      setError("You must be logged in to generate an invite.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Generate a 6-digit code on the client
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const newInvite = {
        fromUserId: user.uid,
        status: "pending",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      // Create the document directly in Firestore using the code as the ID
      await setDoc(doc(db, "invites", code), newInvite);

      setInviteCode(code);

    } catch (err) {
      setError("Failed to generate code. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white shadow p-6">
      <h2 className="text-xl font-semibold leading-6 text-gray-900">
        Invite Your Partner
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        Generate a secure, single-use 6-digit code to share with your partner.
      </p>
      <div className="mt-4">
        {inviteCode ? (
          <div className="text-center p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">Share this code with your partner:</p>
            <div className="flex items-center justify-center gap-4 my-2">
              <p className="text-4xl font-bold tracking-widest text-indigo-600">{inviteCode}</p>
              <button
                onClick={() => navigator.clipboard.writeText(inviteCode)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded-md text-sm"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-500">This code expires in 7 days.</p>
          </div>
        ) : (
          <Button
            onClick={generateCode}
            className="w-full rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-gray-400"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Invite Code'}
          </Button>
        )}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}
