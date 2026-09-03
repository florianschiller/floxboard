import React, { useState } from "react";
import * as api from "@/lib/api";
import { getUserColor } from "@/lib/useWhiteboardCollab";
import { FeatureGate } from "./FeatureGate";
import { LicenseModal } from "./LicenseModal";
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
  FileCode,
  Image,
  FileText,
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
  onExportSVG?: () => void;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
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
  onExportSVG,
  onExportPNG,
  onExportPDF,
  onExportJSON,
  onImportJSON,
  onDeleteBoard,
  onOpenShareModal,
  onFocusAll,
}: WhiteboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  return (
    <>
      {/* Top Header Controls Bar (Left) */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2.5">
        {/* Title and Board Management */}
        <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
          <span className="font-semibold text-xs text-slate-800 max-w-[150px] truncate">
            {boardName}
          </span>

          {/* Role Badge */}
          {boardId && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                role === "OWNER"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : role === "ADMIN"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : role === "EDITOR"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
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
            aria-label="Action menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40 text-xs">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenListModal();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-blue-600" />
                Open from Cloud
              </button>

              {canEdit && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSaveModal();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-emerald-600" />
                  Save to Cloud
                </button>
              )}

              <div className="my-1 border-t border-slate-100" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportSVG?.();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-indigo-600" />
                Export SVG
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportPNG?.();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Image className="w-4 h-4 text-teal-600" />
                Export PNG
              </button>

              <FeatureGate
                feature="whiteboard:export:pdf"
                fallback={
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsLicenseModalOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span>Export PDF</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      PRO
                    </span>
                  </button>
                }
              >
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExportPDF?.();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  Export PDF
                </button>
              </FeatureGate>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportJSON();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-600" />
                Export JSON
              </button>

              {canEdit && (
                <label className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-purple-600" />
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
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDeleteBoard();
                    }}
                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
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
          <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
            {/* Connection Status Dot */}
            <div
              title={collabStatus === "connected" ? "Connected to live room" : "Connecting..."}
              className="flex items-center gap-1 mr-1"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  collabStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : collabStatus === "connecting"
                    ? "bg-amber-500 animate-ping"
                    : "bg-slate-400"
                }`}
              />
            </div>

            {/* Current user avatar */}
            <div
              style={{ backgroundColor: getUserColor(currentUser?.id || "me") }}
              title={`${currentUser?.name || currentUser?.email || "User"} (You)`}
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-xs uppercase ring-2 ring-blue-500"
            >
              {(currentUser?.name || currentUser?.email || "U").slice(0, 2)}
            </div>

            {/* Peer collaborator avatars */}
            {peers.map((peer) => (
              <div
                key={peer.clientId}
                style={{ backgroundColor: peer.user.color }}
                title={peer.user.name}
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-xs uppercase"
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
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all flex items-center gap-1.5 animate-in fade-in cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Focus All
          </button>
        )}

        {/* Share Button */}
        {boardId && (
          <button
            onClick={onOpenShareModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        )}
      </div>

      {/* Upgrade / License Plan Modal */}
      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
      />
    </>
  );
}
