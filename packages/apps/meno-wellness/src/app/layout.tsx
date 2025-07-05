import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from './components/auth-provider';
import { AuthButton } from './components/auth-button'; // We can use our existing button

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MenoWellness - Your Supportive Journey",
  description: "A warm, supportive space for women navigating menopause with mood tracking, journaling, and partner connection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-red-300 to-green-300 min-h-screen`}>
        <AuthProvider>
          <nav className="bg-white/20 backdrop-blur-sm shadow-lg sticky top-0 z-40 border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">🌸</div>
                  <span className="text-2xl font-bold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}>
                    MenoWellness
                  </span>
                </div>
                <div className="flex items-center">
                  <AuthButton />
                </div>
              </div>
            </div>
          </nav>
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
