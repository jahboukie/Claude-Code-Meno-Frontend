// packages/apps/partner-support/src/app/components/AcceptInviteForm.tsx
'use client';

import { useState } from 'react';
import { useAuth } from './auth-provider';
import { Button } from '@metiscore/ui';

interface AcceptInviteFormProps {
  onSuccess: () => void; // A function to call when the invite is accepted
}

export const AcceptInviteForm = ({ onSuccess }: AcceptInviteFormProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim() || !user) return;

    setIsLoading(true);
    setError(null);

    // IMPORTANT: Paste your full URL for the 'acceptPartnerInvite' function here
    const functionUrl = "https://us-central1-menowellness-prod.cloudfunctions.net/acceptPartnerInvite";

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: code,
          partnerUid: user.uid
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invite.');
      }

      alert('Success! You are now connected with your partner.'); // Simple success feedback
      onSuccess(); // Notify the parent page to refetch data or redirect

    } catch (err: any) {
      setError(err.message);
      console.error("Error accepting invite:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 text-center">Accept an Invitation</h2>
        <p className="text-center text-gray-600 mt-2">Enter the 6-digit code your partner shared with you.</p>
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        <div>
            <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            maxLength={6}
            className="block w-full rounded-md border-0 py-3 px-4 text-gray-900 text-center text-2xl tracking-[.5em] shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            placeholder="000000"
            required
            disabled={isLoading}
            />
        </div>

        {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md text-center">
            {error}
            </p>
        )}

        <Button
            type="submit"
            className="w-full flex justify-center rounded-md bg-sky-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-sky-500 disabled:bg-gray-400"
            disabled={isLoading || code.length !== 6}
        >
            {isLoading ? 'Connecting...' : 'Connect Accounts'}
        </Button>
        </form>
    </div>
  );
};
