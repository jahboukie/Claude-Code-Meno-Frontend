// packages/apps/partner-support/src/app/components/auth-button.tsx
'use client';

import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@metiscore/ui'; // Using our shared button

export function AuthButton() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/'); // Redirect to login page after sign out
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-gray-700">Welcome, {user.displayName || user.email}</span>
        <Button onClick={handleSignOut} className="rounded-md bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-300">
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleSignIn} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500">
      Partner Sign-in with Google
    </Button>
  );
}
