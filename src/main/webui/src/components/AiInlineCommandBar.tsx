import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, CornerDownLeft, X, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useEntitlements } from '@/lib/entitlementContext';

export interface AiInlineCommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPrompt: (prompt: string) => Promise<void> | void;
  isGenerating?: boolean;
  onOpenModal?: () => void;
}

export const AiInlineCommandBar: React.FC<AiInlineCommandBarProps> = ({
  isOpen,
  onClose,
  onSubmitPrompt,
  isGenerating = false,
  onOpenModal
}) => {
  const { hasFeature } = useEntitlements();
  const isEntitled = hasFeature('ai:text_to_diagram');
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setPrompt('');
    }
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    await onSubmitPrompt(prompt.trim());
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in fade-in slide-in-from-top-2 duration-150">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl backdrop-blur-md ring-1 ring-slate-900/5 transition-all"
      >
        {/* Sparkles Icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Sparkles className="h-4 w-4" />
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            isEntitled
              ? 'Describe diagram to generate... (e.g. Microservices architecture, Auth flow)'
              : 'AI Generation (Requires Pro plan subscription)'
          }
          disabled={isGenerating}
          className="flex-1 bg-transparent py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
        />

        {/* Modal Presets Button */}
        {onOpenModal && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenModal();
            }}
            title="Open Advanced AI Dialog with Presets"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Presets</span>
          </button>
        )}

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-purple-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>Generate</span>
              <CornerDownLeft className="h-3 w-3 opacity-70" />
            </>
          )}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isGenerating}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
