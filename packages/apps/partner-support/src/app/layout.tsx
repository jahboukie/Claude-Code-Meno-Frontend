// packages/apps/partner-support/src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./components/auth-provider"; // Import AuthProvider
import { AuthButton } from "./components/auth-button";   // Import AuthButton

export const metadata: Metadata = {
  title: "Metiscore Partner Support",
  description: "Supporting your partner's wellness journey.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <AuthProvider>
           <nav className="bg-white shadow-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <span className="text-2xl font-bold text-slate-800">
                  Partner Support
                </span>
                <div className="flex items-center">
                  <AuthButton />
                </div>
              </div>
            </div>
          </nav>
          <main>
             <div className="max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
