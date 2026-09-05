import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { Shield } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexus-Agent | AI-Native Payment Infrastructure',
  description: 'Intelligent routing, automatic failover, and compliance built-in. The payment infrastructure that actually works.',
  keywords: ['payments', 'AI', 'payment infrastructure', 'failover', 'RBI compliance', 'merchant'],
  authors: [{ name: 'Nexus-Agent' }],
  openGraph: {
    title: 'Nexus-Agent',
    description: 'AI-native payment infrastructure for the modern web',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-neutral-50">
        {/* Global Glass Navigation */}
        <nav className="nav-glass">
          <div className="max-w-7xl mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-neutral-900">Nexus-Agent</span>
              </Link>
              
              <div className="hidden md:flex items-center gap-8 text-sm text-neutral-500">
                <Link href="/agent-catalog" className="hover:text-neutral-950 transition-colors">Agent Catalog</Link>
                <Link href="/merchant-dashboard" className="hover:text-neutral-950 transition-colors">Dashboard</Link>
              </div>

              <div className="flex items-center gap-4">
                <Link 
                  href="/merchant-dashboard" 
                  className="btn-glass text-sm"
                >
                  Launch App
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {children}
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              color: '#0a0a0a',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
