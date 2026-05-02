import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

export const metadata: Metadata = {
  title: 'CI/CD Pipeline Dashboard',
  description: 'Monitor GitHub Actions workflows across your repositories in real time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans bg-bg text-white min-h-screen">
        {/* Ambient background glow */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        >
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-950/30 blur-[120px]" />
          <div className="absolute top-1/3 -right-60 w-[500px] h-[500px] rounded-full bg-violet-950/20 blur-[120px]" />
        </div>

        {/* Dot grid */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-dot-grid opacity-100" />

        {/* Nav */}
        <nav className="relative z-10 border-b border-white/5 bg-bg/60 backdrop-blur-xl sticky top-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            {/* Logo mark */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded-md bg-indigo-500/20 blur-sm" />
                <div className="relative w-5 h-5 rounded-md bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 3h8M2 6h5M2 9h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <span className="font-semibold text-sm text-white/90 tracking-tight">
                Pipeline<span className="text-white/40 font-normal"> Dashboard</span>
              </span>
            </div>

            <div className="flex-1" />

            {/* Live indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/4 border border-white/6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              <span className="text-xs text-white/40 font-mono">live</span>
            </div>
          </div>
        </nav>

        <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
