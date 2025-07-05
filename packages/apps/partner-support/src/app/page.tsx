// packages/apps/partner-support/src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './components/auth-provider';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // When authentication is checked and a user exists, go to the dashboard
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="text-center p-10">Loading...</div>;
  }

  // If no user, show a simple sign-in prompt
  return (
    <div className="text-center p-10 mt-10">
      <h1 className="text-2xl font-bold text-gray-800">Welcome to Partner Support</h1>
      <p className="mt-2 text-gray-600">
        Please sign in to connect with your partner or view your dashboard.
      </p>
    </div>
  );
}
