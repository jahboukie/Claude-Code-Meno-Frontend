// packages/apps/partner-support/src/app/dashboard/page.tsx

'use client';



import { useState, useEffect } from 'react';

import { useAuth } from '../components/auth-provider';

import { db, functions } from '@/lib/firebase';

import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';

import { httpsCallable } from 'firebase/functions';

import { Button } from '@metiscore/ui';



// Interfaces for our data structures

interface JournalEntry {

  id: string;

  text: string;

  createdAt: any;

}

interface UserData {

  partnerId?: string;

  displayName?: string;

}

interface PartnerInfo {

  uid: string;

  displayName: string;

}



export default function PartnerDashboard() {

  const { user, loading: authLoading } = useAuth();

  const [userData, setUserData] = useState<UserData | null>(null);

  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);

  const [sharedEntries, setSharedEntries] = useState<JournalEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);



  // State for the connection form

  const [connectionCode, setConnectionCode] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);

  const [connectionError, setConnectionError] = useState('');



  // --- Fetch current user's data (including partnerId) ---

  useEffect(() => {

    if (!user) {

      setIsLoading(false);

      return;

    }

    const userDocRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {

      if (docSnap.exists()) {

        setUserData(docSnap.data() as UserData);

      }

      setIsLoading(false);

    });

    return () => unsubscribe();

  }, [user]);



  // --- Fetch Primary User's Info and Shared Entries once connected ---

  useEffect(() => {

    if (!userData?.partnerId) {

      setPartnerInfo(null);

      setSharedEntries([]);

      return;

    }



    // 1. Get the primary user's display name

    const partnerDocRef = doc(db, 'users', userData.partnerId);

    getDoc(partnerDocRef).then(docSnap => {

      if (docSnap.exists()) {

        setPartnerInfo({

          uid: docSnap.id,

          displayName: docSnap.data().displayName || 'Your Partner'

        });

      }

    });



    // 2. Set up the listener for shared journal entries

    const entriesQuery = query(

      collection(db, 'journal_entries'),

      where('userId', '==', userData.partnerId),

      where('isShared', '==', true),

      orderBy('createdAt', 'desc')

    );

    const unsubscribeEntries = onSnapshot(entriesQuery, (snapshot) => {

      const entries = snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

      })) as JournalEntry[];

      setSharedEntries(entries);

    });



    return () => unsubscribeEntries();

  }, [userData]);





  // --- CORRECTED connectToPartner function ---

  const connectToPartner = async () => {

    if (!connectionCode.trim() || !user) return;

    setIsConnecting(true);

    setConnectionError('');



    try {

      // Use Firebase Functions callable method

      const acceptPartnerInvite = httpsCallable(functions, 'acceptPartnerInvite');

      const result = await acceptPartnerInvite({

        inviteCode: connectionCode,

        partnerUid: user.uid

      });



      // Success! The onSnapshot listener will handle the UI update automatically.

      setConnectionCode('');

      console.log('Connection successful:', result.data);



    } catch (err: any) {

      console.error('Connection error:', err);

      setConnectionError(err.message || 'Failed to connect. Please try again.');

    } finally {

      setIsConnecting(false);

    }

  };



  // --- RENDER LOGIC ---



  if (authLoading || isLoading) {

    return <div className="text-center p-10"><p className="text-lg">Loading Dashboard...</p></div>;

  }



  if (!user) {

    return <div className="text-center p-10"><p className="text-lg">Please sign in to access the partner dashboard.</p></div>;

  }



  // If the user is logged in but not yet connected, show the connection form

  if (!userData?.partnerId) {

    return (

      <div className="max-w-md mx-auto p-6 mt-10">

        <div className="bg-white rounded-lg shadow-lg p-6">

          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect to Your Partner</h1>

          <p className="text-gray-600 mb-6">Enter the 6-digit code your partner shared with you.</p>

          <div className="space-y-4">

            <input

              type="text"

              value={connectionCode}

              onChange={(e) => setConnectionCode(e.target.value.replace(/\D/g, '').slice(0, 6))}

              placeholder="000000"

              className="w-full text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-lg p-4 focus:border-blue-500 focus:outline-none"

              maxLength={6}

            />

            {connectionError && (<p className="text-red-600 text-sm">{connectionError}</p>)}

            <Button

              onClick={connectToPartner}

              disabled={connectionCode.length !== 6 || isConnecting}

              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"

            >

              {isConnecting ? 'Connecting...' : 'Connect'}

            </Button>

          </div>

        </div>

      </div>

    );

  }



  // If the user IS connected, show the full dashboard

  return (

    <div className="max-w-4xl mx-auto p-6 space-y-6">

      <div className="bg-white rounded-lg shadow-lg p-6">

        <h1 className="text-2xl font-bold text-gray-900 mb-2">

          Supporting {partnerInfo?.displayName || 'your partner'}

        </h1>

        <p className="text-gray-600">Here's what your partner has chosen to share with you.</p>

      </div>



      <div className="bg-white rounded-lg shadow-lg p-6">

        <h2 className="text-xl font-bold text-gray-900 mb-4">Shared Journal Entries</h2>

        {sharedEntries.length > 0 ? (

          <div className="space-y-4">

            {sharedEntries.map((entry) => (

              <div key={entry.id} className="border border-gray-200 rounded-lg p-4">

                <p className="text-gray-800 mb-3 whitespace-pre-wrap">{entry.text}</p>

                <div className="flex justify-between items-center text-sm text-gray-500">

                  <span>

                    {entry.createdAt ? new Date(entry.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}

                  </span>

                  {/* We can add an analyze button here later if desired */}

                </div>

              </div>

            ))}

          </div>

        ) : (

          <div className="text-center py-8">

            <p className="text-gray-500">No shared entries yet.</p>

          </div>

        )}

      </div>



      {/* Placeholder for "How You Can Help" section from your design */}

    </div>

  );

}
