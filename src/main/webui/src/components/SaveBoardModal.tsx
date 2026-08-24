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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNameEmpty || isSaving) return;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white">Save to Cloud</h3>
        {saveError && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
            {saveError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Board Name</label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="Enter board name..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isNameEmpty}
              className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
