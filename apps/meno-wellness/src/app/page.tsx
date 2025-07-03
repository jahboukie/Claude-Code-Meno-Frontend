// packages/apps/meno-wellness/src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './components/auth-provider';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // When user is no longer loading and is authenticated, send them to the dashboard
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // While loading, show a generic loading screen
  if (loading) {
    return <div className="text-white text-center p-10 text-xl font-semibold">Loading Ecosystem...</div>;
  }

  // If not loading and still no user, show the public landing page content
  if (!user) {
    return (
      <div className="text-center p-10 mt-16">
        <h1 className="text-5xl text-white font-bold" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.3)' }}>
          Relational Health Intelligence
        </h1>
        <p className="text-white/80 mt-4 text-lg max-w-2xl mx-auto">
          Welcome to the Metiscore Health Ecosystem. Please sign in to access your personal wellness journey.
        </p>
        {/* The sign-in button is in the main layout's navigation bar */}
      </div>
    );
  }

  // Fallback content while redirecting
  return <div className="text-white text-center p-10">Authenticating...</div>;
}
