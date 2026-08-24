import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '@/lib/api';
import { Lock, Send, Clock, CheckCircle, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

interface RequestAccessViewProps {
  boardId: string;
  onAccessGranted?: () => void;
}

export function RequestAccessView({ boardId, onAccessGranted }: RequestAccessViewProps) {
  const navigate = useNavigate();
  const [requestedRole, setRequestedRole] = useState<api.BoardRole>('EDITOR');
  const [message, setMessage] = useState('');
  const [existingRequest, setExistingRequest] = useState<api.AccessRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      // Check if user already gained access
      try {
        const roleRes = await api.getBoardRole(boardId);
        if (roleRes && roleRes.role) {
          onAccessGranted?.();
          return;
        }
      } catch {}

      const req = await api.getMyAccessRequest(boardId);
      setExistingRequest(req);
      if (req?.status === 'APPROVED') {
        onAccessGranted?.();
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [boardId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await api.requestAccess(boardId, requestedRole, message.trim() || undefined);
      setExistingRequest(res);
      setSuccessMessage('Access request submitted! Board owners and admins have been notified.');
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-2">Access Required</h2>
        <p className="text-slate-400 text-center text-sm mb-6">
          You don't have permission to view or edit this whiteboard. You can request access from the board owner.
        </p>

        {existingRequest ? (
          <div className="bg-slate-700/50 rounded-xl p-5 border border-slate-600 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300 font-medium">Request Status</span>
              {existingRequest.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300">
                  <Clock className="w-3.5 h-3.5" /> Pending Approval
                </span>
              )}
              {existingRequest.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved
                </span>
              )}
              {existingRequest.status === 'REJECTED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300">
                  <XCircle className="w-3.5 h-3.5" /> Declined
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div>
                Requested Role: <span className="text-slate-200 font-medium">{existingRequest.requestedRole}</span>
              </div>
              {existingRequest.message && (
                <div>
                  Note: <span className="text-slate-200 italic font-normal">"{existingRequest.message}"</span>
                </div>
              )}
            </div>

            {existingRequest.status === 'APPROVED' ? (
              <button
                onClick={() => onAccessGranted?.()}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Open Board Now
              </button>
            ) : existingRequest.status === 'PENDING' ? (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking for approval automatically...
              </div>
            ) : null}
          </div>
        ) : null}

        {(!existingRequest || existingRequest.status === 'REJECTED') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
                {successMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Desired Permission Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['VIEWER', 'EDITOR', 'ADMIN'] as api.BoardRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRequestedRole(role)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                      requestedRole === role
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                        : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Optional Message for Owner
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Hi, I'm working on the architecture diagram with you..."
                rows={3}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/20"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sending Request...' : 'Submit Access Request'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-700/60 flex justify-center">
          <button
            onClick={() => navigate('/board')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Whiteboards
          </button>
        </div>
      </div>
    </div>
  );
}
