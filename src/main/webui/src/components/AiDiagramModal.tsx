import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Layers, ArrowRight, ArrowDown, Wand2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useEntitlements } from '@/lib/entitlementContext';
import {
  generateDiagramFromPrompt,
  estimateAiCredits,
  AiDiagramCategory,
  AiLayoutDirection,
  AiDiagramResponse
} from '@/lib/api/ai';

export interface AiDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  whiteboardId?: string;
  onInsertDiagram: (doc: any, mode: 'center' | 'replace' | 'new_board') => Promise<void> | void;
  onOpenLicenseModal?: () => void;
}

interface PresetCategory {
  key: AiDiagramCategory;
  label: string;
  defaultPrompt: string;
  description: string;
}

const PRESET_CATEGORIES: PresetCategory[] = [
  {
    key: 'ARCHITECTURE',
    label: 'Cloud Architecture',
    defaultPrompt: 'Microservices architecture with API Gateway, Auth Service, Order Service, PostgreSQL database, and Kafka event bus',
    description: 'Services, databases, and message queues with container grouping'
  },
  {
    key: 'FLOWCHART',
    label: 'Flowchart',
    defaultPrompt: 'User authentication process with login validation, password check, MFA challenge, and dashboard redirect',
    description: 'Decision branches, steps, and process workflows'
  },
  {
    key: 'MINDMAP',
    label: 'Mind Map',
    defaultPrompt: 'Product strategy for FloxBoard covering real-time collaboration, AI synthesis, export tools, and enterprise security',
    description: 'Hierarchical idea brainstorming and topic trees'
  },
  {
    key: 'SEQUENCE',
    label: 'Sequence Flow',
    defaultPrompt: 'Payment checkout flow between Customer, Web Frontend, Payment Gateway API, and Bank Authorization',
    description: 'Step-by-step actor and service message exchanges'
  },
  {
    key: 'GENERAL',
    label: 'Custom / Freeform',
    defaultPrompt: '',
    description: 'Generate any custom diagram from natural language'
  }
];

export const AiDiagramModal: React.FC<AiDiagramModalProps> = ({
  isOpen,
  onClose,
  whiteboardId,
  onInsertDiagram,
  onOpenLicenseModal
}) => {
  const { hasFeature, getQuota, refreshEntitlements } = useEntitlements();
  const isEntitled = hasFeature('ai:text_to_diagram');
  const aiCreditsQuota = getQuota('ai:monthly_credits');

  const [category, setCategory] = useState<AiDiagramCategory>('ARCHITECTURE');
  const [prompt, setPrompt] = useState<string>(PRESET_CATEGORIES[0].defaultPrompt);
  const [layoutDirection, setLayoutDirection] = useState<AiLayoutDirection>('HORIZONTAL');
  const [placementMode, setPlacementMode] = useState<'center' | 'replace' | 'new_board'>('center');

  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [estimatedCredits, setEstimatedCredits] = useState<number | null>(null);
  const [isAllowed, setIsAllowed] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<AiDiagramResponse | null>(null);

  const debounceTimerRef = useRef<any>(null);

  // Estimate credits on prompt or category change
  useEffect(() => {
    if (!isOpen || !isEntitled || !prompt.trim()) {
      setEstimatedCredits(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsEstimating(true);
        const estimate = await estimateAiCredits({ prompt: prompt.trim(), category });
        setEstimatedCredits(estimate.estimatedCredits);
        setIsAllowed(estimate.isAllowed);
      } catch (err) {
        // Fallback estimate locally if network or offline
        const localEstimate = 10 + Math.floor(prompt.trim().length / 100) * 2 + 20;
        setEstimatedCredits(localEstimate);
      } finally {
        setIsEstimating(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen, isEntitled, prompt, category]);

  if (!isOpen) return null;

  const handleSelectCategory = (cat: PresetCategory) => {
    setCategory(cat.key);
    if (cat.defaultPrompt) {
      setPrompt(cat.defaultPrompt);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    if (!isEntitled) {
      if (onOpenLicenseModal) {
        onClose();
        onOpenLicenseModal();
      }
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await generateDiagramFromPrompt({
        prompt: prompt.trim(),
        category,
        layoutDirection,
        whiteboardId,
      });

      setLastGenerated(response);
      await onInsertDiagram(response.doc, placementMode);
      await refreshEntitlements(true);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to synthesize diagram. Please check your credit balance.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              AI Text-to-Diagram Synthesis
            </h2>
            <p className="text-xs text-slate-500">
              Describe system architectures, workflows, or mind maps to generate FloxBoard whiteboard shapes automatically
            </p>
          </div>
        </div>

        {/* Feature Gate Warning if Free Plan */}
        {!isEntitled && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold">Pro Feature: AI Diagram Generation</h4>
              <p className="text-xs text-amber-700 mt-1">
                AI diagram synthesis is exclusive to Pro, Team, and Enterprise plans with monthly credit quotas.
              </p>
              {onOpenLicenseModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLicenseModal();
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Upgrade Subscription
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Preset Category Selector Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Diagram Preset Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                    category === cat.key
                      ? 'bg-purple-50 border-purple-300 text-purple-700 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Natural Language Prompt Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="ai-prompt-input" className="block text-xs font-semibold text-slate-700">
                Natural Language Description
              </label>
              <span className="text-[11px] text-slate-400">
                {prompt.length} characters
              </span>
            </div>
            <textarea
              id="ai-prompt-input"
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your architecture, flowchart, or diagram components..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:outline-hidden focus:ring-3 focus:ring-purple-100 transition-all resize-none font-sans"
              required
            />
          </div>

          {/* Layout Direction & Placement Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* Direction */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Layout Orientation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLayoutDirection('HORIZONTAL')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                    layoutDirection === 'HORIZONTAL'
                      ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Horizontal (Left-to-Right)
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutDirection('VERTICAL')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium rounded-lg border cursor-pointer transition-all ${
                    layoutDirection === 'VERTICAL'
                      ? 'bg-purple-50 border-purple-300 text-purple-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  Vertical (Top-to-Bottom)
                </button>
              </div>
            </div>

            {/* Placement Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Canvas Placement Mode
              </label>
              <select
                value={placementMode}
                onChange={(e) => setPlacementMode(e.target.value as any)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs text-slate-800 focus:border-purple-500 focus:outline-hidden focus:ring-2 focus:ring-purple-100 cursor-pointer"
              >
                <option value="center">Insert at Viewport Center</option>
                <option value="replace">Replace Canvas Content</option>
                <option value="new_board">Fork into New Whiteboard</option>
              </select>
            </div>
          </div>

          {/* Credit Estimation & Quota Meter Info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Wand2 className="w-4 h-4 text-purple-600" />
              <span>
                Estimated Credit Fee:{' '}
                <strong className="text-slate-900 font-semibold">
                  {isEstimating ? 'Estimating...' : estimatedCredits ? `${estimatedCredits} credits` : '~25 credits'}
                </strong>
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Remaining Quota:{' '}
              <span className="font-semibold text-purple-700">
                {aiCreditsQuota.isUnlimited
                  ? 'Unlimited'
                  : aiCreditsQuota.remaining !== null
                  ? `${aiCreditsQuota.remaining} / ${aiCreditsQuota.limit} mo`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim() || (!isAllowed && isEntitled)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 focus:outline-hidden focus:ring-3 focus:ring-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Synthesizing Diagram...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate & Insert Shapes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
