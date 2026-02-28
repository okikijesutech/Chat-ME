import Link from 'next/link';
import { MessageSquare, Shield, Zap, Users } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-main)] text-white overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] -ml-64 -mb-64" />

      {/* Nav */}
      <nav className="relative z-10 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-2xl font-bold italic tracking-tighter">
          <div className="h-10 w-10 premium-button !p-0 rounded-xl">
             <MessageSquare className="h-6 w-6" />
          </div>
          Chatter
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-6 py-2 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors">
            Login
          </Link>
          <Link href="/signup" className="premium-button !px-6 !py-2 !text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm font-medium text-[var(--color-brand-primary)] mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-[var(--color-brand-primary)] animate-pulse" />
          Real-time Presence Enabled
        </div>
        
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          Real-time Connection.<br />
          <span className="bg-clip-text text-transparent bg-[var(--brand-gradient)]">Seamless Chat.</span>
        </h1>
        
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '200ms' }}>
          Experience the next level of communication with instant messaging, presence tracking, and a premium interface designed for focus.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '300ms' }}>
          <Link href="/signup" className="premium-button text-lg px-8 py-4">
            Start Chatting for Free
          </Link>
          <button className="px-8 py-4 rounded-xl text-lg font-semibold bg-white/5 hover:bg-white/10 border border-white/10 transition-all">
            See Documentation
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Zap className="h-6 w-6 text-yellow-400" />,
              title: "Instant Delivery",
              desc: "Built on Supabase Realtime for sub-millisecond message delivery across the globe."
            },
            {
              icon: <Users className="h-6 w-6 text-blue-400" />,
              title: "Presence Tracking",
              desc: "See who's online and getting typing indicators in real-time."
            },
            {
              icon: <Shield className="h-6 w-6 text-green-400" />,
              title: "Secure by Design",
              desc: "End-to-end sanitization, RLS policies, and XSS prevention baked into the core."
            }
          ].map((f, i) => (
            <div key={i} className="p-8 premium-card hover:border-[var(--color-brand-primary)]/50">
              <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-[var(--color-text-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 text-center text-[var(--color-text-muted)] text-sm border-t border-white/5">
        &copy; 2026 Chatter. Built with Next.js & Supabase.
      </footer>
    </main>
  );
}
