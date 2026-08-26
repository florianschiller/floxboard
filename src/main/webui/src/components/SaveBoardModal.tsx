import React, { useState, useEffect } from "react";

interface SaveBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (boardName: string) => Promise<void>;
  initialName?: string;
}

export function SaveBoardModal({
  isOpen,
  onClose,
  onSave,
  initialName = "",
}: SaveBoardModalProps) {
  const [boardName, setBoardName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBoardName(initialName);
      setSaveError(null);
      setIsSaving(false);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const trimmedName = boardName.trim();
  const isNameEmpty = !trimmedName;
  const isNameUnchanged = trimmedName === initialName.trim();
  const isSaveDisabled = isSaving || isNameEmpty || isNameUnchanged;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaveDisabled) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave(trimmedName);
    } catch (err: any) {
      setSaveError(err.message || "Failed to save whiteboard");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-slate-900">
        <h3 className="text-base font-bold text-slate-900">Save to Cloud</h3>
        {saveError && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
            {saveError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Board Name</label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Enter board name..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaveDisabled}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
