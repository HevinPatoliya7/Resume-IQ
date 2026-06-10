import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import UploadZone from './components/UploadZone';
import LoadingState from './components/LoadingState';
import ResultView from './components/ResultView';
import CustomCursor from './components/CustomCursor';
import type { ReviewResult } from './lib/types';

type AppState =
  | { phase: 'idle' }
  | { phase: 'loading'; resumeText: string }
  | { phase: 'result'; resumeText: string; result: ReviewResult }
  | { phase: 'error'; resumeText: string; error: string };

const App = () => {
  const [state, setState] = useState<AppState>({ phase: 'idle' });

  const handleReview = async (resumeText: string) => {
    setState({ phase: 'loading', resumeText });

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Review failed.');
      }

      setState({ phase: 'result', resumeText, result: data as ReviewResult });

      // Scroll to top so the user sees the score
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setState({ phase: 'error', resumeText, error: msg });
    }
  };

  const reset = () => setState({ phase: 'idle' });

  return (
    <main className="relative min-h-screen w-full bg-[#0C0C0C]">
      <CustomCursor />
      {/* Header */}
      <header className="sticky top-0 z-50 header-glass w-full px-6 md:px-10 py-4 flex items-center justify-between">
        <a
          href="/"
          className="header-logo-container flex items-center gap-2.5 text-[#D7E2EA] font-medium uppercase tracking-widest text-sm sm:text-base cursor-pointer"
        >
          <span className="score-gradient font-black text-2xl sm:text-3xl select-none">
            R
          </span>
          <span className="font-semibold text-lg sm:text-xl tracking-wider text-[#D7E2EA] hover:text-white transition-colors">
            ResumeIQ
          </span>
        </a>
        <div className="hevin-badge px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-[#D7E2EA]/80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
          Powered by HEVIN
        </div>
      </header>

      <div className="px-5 sm:px-8 md:px-10 pt-12 sm:pt-20 md:pt-24 pb-16">
        {state.phase === 'idle' && (
          <>
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-center flex flex-col items-center gap-6 mb-12 sm:mb-16"
            >
              <h1
                className="hero-heading font-black uppercase leading-none tracking-tight"
                style={{ fontSize: 'clamp(3rem, 11vw, 9rem)' }}
              >
                Resume reviewer
              </h1>
              <p
                className="max-w-2xl font-light text-[#D7E2EA]/70 leading-relaxed"
                style={{ fontSize: 'clamp(1rem, 1.7vw, 1.25rem)' }}
              >
                Drop in your resume. Get a brutally honest, AI-powered review with
                scores, strengths, weaknesses, and rewritten bullets — in seconds.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <UploadZone onSubmit={handleReview} isProcessing={false} />
            </motion.div>

            {/* Trust strip */}
            <div className="mt-16 sm:mt-20 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
              {[
                { num: '4', label: 'Scored categories' },
                { num: '3', label: 'Bullets rewritten' },
                { num: '~8s', label: 'Average response' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[#D7E2EA]/10 bg-[#141418]/50 p-5 flex flex-col items-center gap-2"
                >
                  <span className="score-gradient text-3xl sm:text-4xl font-black">
                    {stat.num}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-[#D7E2EA]/50">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {state.phase === 'loading' && <LoadingState />}

        {state.phase === 'result' && (
          <ResultView
            result={state.result}
            resumeText={state.resumeText}
            onReset={reset}
          />
        )}

        {state.phase === 'error' && (
          <div className="max-w-xl mx-auto flex flex-col items-center gap-6 py-16 text-center">
            <AlertCircle size={48} className="text-red-400" strokeWidth={1.4} />
            <h2 className="text-2xl font-medium text-[#D7E2EA]">
              Couldn't review that resume
            </h2>
            <p className="text-[#D7E2EA]/70 leading-relaxed">{state.error}</p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#D7E2EA] px-8 py-3 text-sm font-medium uppercase tracking-widest text-[#D7E2EA] hover:bg-[#D7E2EA]/10 transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="footer-blur px-6 md:px-10 py-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs uppercase tracking-widest text-[#D7E2EA]/40">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 z-10">
          <span className="font-semibold text-[#D7E2EA]/60">© 2026 Hevin Patoliya</span>
          <a
            href="https://www.linkedin.com/in/hevinpatoliya9106011772/"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link inline-flex items-center gap-1.5 text-[#D7E2EA]/50 hover:text-[#0077B5] transition-colors duration-200"
            title="LinkedIn Profile"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
        </div>
        <span className="text-center sm:text-right text-[#D7E2EA]/30 z-10 font-light max-w-sm sm:max-w-none">
          Your resume is processed in real time and never stored
        </span>
        <a
          href="https://mrhevin.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="hevin-dev-btn inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[#D7E2EA]/80 z-10 font-semibold uppercase tracking-widest cursor-pointer"
          title="Visit Hevin Patoliya's Portfolio"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          Developed by Hevin Patoliya
        </a>
      </footer>
    </main>
  );
};

export default App;
