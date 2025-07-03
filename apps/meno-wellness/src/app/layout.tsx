import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from './components/auth-provider';
import { AuthButton } from './components/auth-button'; // We can use our existing button

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Metiscore Health",
  description: "Your personal wellness ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-teal-400 to-blue-500`}>
        <AuthProvider>
          <nav className="bg-white/30 backdrop-blur-sm shadow-lg sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <span className="text-2xl font-bold text-white" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.2)' }}>
                  Metiscore Health
                </span>
                <div className="flex items-center">
                   {/* The AuthButton will handle showing "Welcome" and "Sign Out" */}
                  <AuthButton />
                </div>
              </div>
            </div>
          </nav>
          <main>
            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
