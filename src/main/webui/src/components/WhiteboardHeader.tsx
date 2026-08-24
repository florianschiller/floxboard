import React, { useState } from "react";
import * as api from "@/lib/api";
import { getUserColor } from "@/lib/useWhiteboardCollab";
import {
  MoreVertical,
  FolderOpen,
  Save,
  Download,
  Upload,
  Trash2,
  Shield,
  Eye,
  Share2,
  Crosshair,
} from "lucide-react";

interface WhiteboardHeaderProps {
  boardName: string;
  boardId: string | null;
  role: api.BoardRole;
  canEdit: boolean;
  collabStatus: string;
  peers: Array<{ clientId: number; user: { name: string; color: string } }>;
  currentUser: { id?: string; name?: string; email?: string } | null;
  selectedShapeCount: number;
  onOpenListModal: () => void;
  onOpenSaveModal: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteBoard: () => void;
  onOpenShareModal: () => void;
  onFocusAll: () => void;
}

export function WhiteboardHeader({
  boardName,
  boardId,
  role,
  canEdit,
  collabStatus,
  peers,
  currentUser,
  selectedShapeCount,
  onOpenListModal,
  onOpenSaveModal,
  onExportJSON,
  onImportJSON,
  onDeleteBoard,
  onOpenShareModal,
  onFocusAll,
}: WhiteboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Top Header Controls Bar (Left) */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
        {/* Title and Board Management */}
        <div className="bg-slate-800/90 backdrop-blur-xs border border-slate-700 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-lg">
          <span className="font-semibold text-xs text-white max-w-[150px] truncate">
            {boardName}
          </span>

          {/* Role Badge */}
          {boardId && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                role === "OWNER"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : role === "ADMIN"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : role === "EDITOR"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-600/30 text-slate-300 border border-slate-600/40"
              }`}
            >
              {role === "OWNER" && <Shield className="w-2.5 h-2.5" />}
              {role === "VIEWER" && <Eye className="w-2.5 h-2.5" />}
              {role}
            </span>
          )}
        </div>

        {/* Action Menu button */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-slate-800/90 backdrop-blur-xs border border-slate-700 text-slate-300 hover:text-white rounded-xl shadow-lg hover:bg-slate-700 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 z-40 text-xs">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenListModal();
                }}
                className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-blue-400" />
                Open from Cloud
              </button>

              {canEdit && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSaveModal();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-emerald-400" />
                  Save to Cloud
                </button>
              )}

              <div className="my-1 border-t border-slate-700" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportJSON();
                }}
                className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-amber-400" />
                Export JSON
              </button>

              {canEdit && (
                <label className="w-full px-4 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-purple-400" />
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      setIsMenuOpen(false);
                      onImportJSON(e);
                    }}
                    className="hidden"
                  />
                </label>
              )}

              {boardId && role === "OWNER" && (
                <>
                  <div className="my-1 border-t border-slate-700" />
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteBoard();
                    }}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Board
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top Right Collaborator Pill Tray & Share Button */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2.5">
        {/* Active Collaborators Avatars */}
        {boardId && (
          <div className="bg-slate-800/90 backdrop-blur-xs border border-slate-700 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg">
            {/* Connection Status Dot */}
            <div
              title={collabStatus === "connected" ? "Connected to live room" : "Connecting..."}
              className="flex items-center gap-1 mr-1"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  collabStatus === "connected"
                    ? "bg-emerald-400 animate-pulse"
                    : collabStatus === "connecting"
                    ? "bg-amber-400 animate-ping"
                    : "bg-slate-500"
                }`}
              />
            </div>

            {/* Current user avatar */}
            <div
              style={{ backgroundColor: getUserColor(currentUser?.id || "me") }}
              title={`${currentUser?.name || currentUser?.email || "User"} (You)`}
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-sm uppercase ring-2 ring-blue-500"
            >
              {(currentUser?.name || currentUser?.email || "U").slice(0, 2)}
            </div>

            {/* Peer collaborator avatars */}
            {peers.map((peer) => (
              <div
                key={peer.clientId}
                style={{ backgroundColor: peer.user.color }}
                title={peer.user.name}
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-sm uppercase"
              >
                {peer.user.name.slice(0, 2)}
              </div>
            ))}
          </div>
        )}

        {/* Focus on Selection Action (visible when shapes are selected) */}
        {selectedShapeCount > 0 && canEdit && (
          <button
            onClick={onFocusAll}
            title="Bring all collaborators to this selection"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-1.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 animate-in fade-in"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Focus All
          </button>
        )}

        {/* Share Button */}
        {boardId && (
          <button
            onClick={onOpenShareModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-lg transition-colors flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        )}
      </div>
    </>
  );
}
