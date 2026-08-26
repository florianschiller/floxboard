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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full shadow-xl text-slate-900">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 text-amber-600 mx-auto mb-6">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Access Required</h2>
        <p className="text-slate-500 text-center text-sm mb-6">
          You don't have permission to view or edit this whiteboard. You can request access from the board owner.
        </p>

        {existingRequest ? (
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700 font-medium">Request Status</span>
              {existingRequest.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3.5 h-3.5" /> Pending Approval
                </span>
              )}
              {existingRequest.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" /> Approved
                </span>
              )}
              {existingRequest.status === 'REJECTED' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <XCircle className="w-3.5 h-3.5" /> Declined
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div>
                Requested Role: <span className="text-slate-800 font-medium">{existingRequest.requestedRole}</span>
              </div>
              {existingRequest.message && (
                <div>
                  Note: <span className="text-slate-700 italic font-normal">"{existingRequest.message}"</span>
                </div>
              )}
            </div>

            {existingRequest.status === 'APPROVED' ? (
              <button
                onClick={() => onAccessGranted?.()}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-xs cursor-pointer"
              >
                Open Board Now
              </button>
            ) : existingRequest.status === 'PENDING' ? (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" /> Checking for approval automatically...
              </div>
            ) : null}
          </div>
        ) : null}

        {(!existingRequest || existingRequest.status === 'REJECTED') && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg">
                {successMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Desired Permission Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['VIEWER', 'EDITOR', 'ADMIN'] as api.BoardRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRequestedRole(role)}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      requestedRole === role
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Optional Message for Owner
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Hi, I'm working on the architecture diagram with you..."
                rows={3}
                className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Sending Request...' : 'Submit Access Request'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-200 flex justify-center">
          <button
            onClick={() => navigate('/board')}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to My Whiteboards
          </button>
        </div>
      </div>
    </div>
  );
}
