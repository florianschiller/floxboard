import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/themeContext';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Shield,
  Zap,
  ArrowRight,
  Layers,
  Users,
  Brain,
  FileDown,
  Sun,
  Moon,
} from 'lucide-react';

export default function LandingPage() {
  const { user, login, isLoading } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  useEffect(() => {
    if (!isLoading && user) {
      const savedIntent = sessionStorage.getItem('flox_post_auth_action');
      if (savedIntent) {
        sessionStorage.removeItem('flox_post_auth_action');
        try {
          const { returnTo, openModal, tab } = JSON.parse(savedIntent);
          let destination = returnTo || '/board';
          if (openModal) {
            const separator = destination.includes('?') ? '&' : '?';
            destination = `${destination}${separator}modal=${openModal}&tab=${tab || ''}`;
          }
          navigate(destination, { replace: true });
          return;
        } catch {
          // Fallback to default
        }
      }
      navigate('/board', { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
              f
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              floxBoard
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Pricing
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
              data-testid="landing-theme-toggle-btn"
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <button
                onClick={() => login()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 mb-6 shadow-2xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/50">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real-time Whiteboard with Mock Payment & Licensing</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 mb-6">
          Visual collaboration, simplified for everyone.
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Infinite canvas, live multi-cursor presence, AI diagramming, and flexible subscription plans for creators and teams.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => login()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
          >
            Start for Free
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#pricing"
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            View Pricing Plans
          </a>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 border-t border-slate-200/80 bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mb-3">
              Simple, transparent pricing
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Choose the tier that fits your workflow. Upgrade or downgrade anytime with instant simulated checkout.
            </p>

            {/* Billing Interval Toggle */}
            <div className="inline-flex items-center gap-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 p-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <button
                type="button"
                onClick={() => setBillingInterval('MONTHLY')}
                className={`rounded-lg px-4 py-1.5 transition-all cursor-pointer ${
                  billingInterval === 'MONTHLY'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('YEARLY')}
                className={`rounded-lg px-4 py-1.5 transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingInterval === 'YEARLY'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Annual Billing
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Free</h3>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Starter
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">$0</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">/ forever</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Essential tools for individuals exploring ideas on infinite canvases.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Up to <strong>3 Whiteboards</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Up to <strong>2 Collaborators</strong> per board</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>PNG Canvas Export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Live real-time multiplayer sync</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => login()}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Get Started Free
              </button>
            </div>

            {/* Pro Tier (Highlighted) */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-blue-600 bg-white p-6 shadow-xl ring-1 ring-blue-600 dark:border-blue-500 dark:bg-slate-900 dark:ring-blue-500">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-extrabold tracking-wide uppercase text-white shadow-xs">
                Most Popular
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 mt-1">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Pro
                  </h3>
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                    Creators & Pros
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                    ${billingInterval === 'YEARLY' ? '120' : '12'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                    {billingInterval === 'YEARLY' ? '/ year' : '/ month'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Power features, AI diagrams, and unrestricted whiteboard creation.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span><strong>Unlimited Whiteboards</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Up to <strong>10 Collaborators</strong> per board</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span><strong>1,000 monthly AI Credits</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>PDF & PNG High-Res Export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Canvas Version History</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => login()}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
              >
                Upgrade to Pro
              </button>
            </div>

            {/* Enterprise Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Enterprise
                  </h3>
                  <span className="rounded-full bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                    Teams & Scale
                  </span>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                    ${billingInterval === 'YEARLY' ? '490' : '49'}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                    {billingInterval === 'YEARLY' ? '/ year' : '/ month'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Max capacity, workspace audit logs, and enterprise collaboration.
                </p>

                <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span><strong>Unlimited Whiteboards</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span><strong>Unlimited Collaborators</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span><strong>50,000 monthly AI Credits</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>PDF & PNG High-Res Export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>Workspace Audit Logs & Priority Support</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => login()}
                className="w-full rounded-xl border border-purple-200 bg-purple-50 py-2.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                Get Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
        &copy; {new Date().getFullYear()} floxBoard &bull; Real-time Visual Collaboration Platform
      </footer>
    </div>
  );
}
