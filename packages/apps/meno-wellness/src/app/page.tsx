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

  // While loading, show a warm loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🌸</div>
          <div className="text-white text-2xl font-bold mb-2" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
            MenoWellness
          </div>
          <p className="text-white/80 text-lg">Getting ready for you...</p>
        </div>
      </div>
    );
  }

  // If not loading and still no user, show the public landing page content
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-8xl mb-6">🌸</div>
          <h1 className="text-5xl text-white font-bold mb-6" style={{ textShadow: '2px 2px 6px rgba(0,0,0,0.3)' }}>
            Welcome to MenoWellness
          </h1>
          <p className="text-white/90 text-xl mb-8 leading-relaxed">
            A warm, supportive space for women navigating menopause.
            Track your moods, journal your thoughts, and connect with your partner.
          </p>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <p className="text-white/80 text-lg">
              Sign in above to begin your wellness journey ✨
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback content while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🌸</div>
        <p className="text-white text-xl font-semibold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
          Taking you to your wellness dashboard...
        </p>
      </div>
    </div>
  );
}
