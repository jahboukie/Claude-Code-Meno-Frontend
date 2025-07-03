'use client';

import { useState } from 'react';
import { Button } from '@metiscore/ui';
import { useAuth } from './auth-provider';

export function InviteForm() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !user) return;

    setIsLoading(true);
    setMessage('');

    // IMPORTANT: Paste your full URL for the 'sendpartnerinvite' function here
    const functionUrl = "YOUR_SEND_PARTNER_INVITE_FUNCTION_URL";

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { email: email, uid: user.uid } }),
      });

      if (!response.ok) throw new Error('Failed to send invite');

      setMessage("Invitation sent successfully!");
    } catch (error) {
      setMessage("Failed to send invitation. Please try again.");
      console.error("Error sending invite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ... The JSX for your form remains the same ...
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
          Partner's Email Address
        </label>
        <div className="mt-2">
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-md border-0 p-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="you@example.com"
            required
            disabled={isLoading}
          />
        </div>
      </div>
      {message && (
        <p className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-gray-400"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? 'Sending...' : 'Send Invite'}
        </Button>
      </div>
    </form>
  );
}
