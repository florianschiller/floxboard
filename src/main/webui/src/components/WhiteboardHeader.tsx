import React, { useState, useRef, useEffect } from "react";
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
  Shield,
  Eye,
  Pencil,
  Share2,
  Settings,
  Crosshair,
  FileCode,
  Image,
  FileText,
  ThumbsUp,
  History,
  Sparkles,
  Plus,
  Library,
  Code,
  Layers,
} from "lucide-react";
import { WhiteboardVotingConfig } from "@/types/voting";

interface WhiteboardHeaderProps {
  boardName?: string;
  activePageName?: string;
  boardId: string | null;
  role: api.BoardRole;
  canEdit: boolean;
  collabStatus: string;
  peers: Array<{ clientId: number; user: { name: string; color: string } }>;
  currentUser: { id?: string; name?: string; email?: string } | null;
  selectedShapeCount: number;
  votingConfig?: WhiteboardVotingConfig;
  userVotesUsed?: number;
  onNewBoard?: () => void;
  onOpenListModal: () => void;
  onOpenSaveModal: () => void;
  onOpenPageDrawer?: () => void;
  onExportSVG?: () => void;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteBoard?: () => void;
  onOpenShareModal: () => void;
  onOpenConfigModal?: () => void;
  onOpenHistoryModal?: () => void;
  onOpenAiModal?: () => void;
  onOpenShapeLibrary?: () => void;
  onOpenScriptDrawer?: () => void;
  onFocusAll: () => void;
}

export function WhiteboardHeader({
  boardName,
  activePageName,
  boardId,
  role,
  canEdit,
  collabStatus,
  peers,
  currentUser,
  selectedShapeCount,
  votingConfig,
  userVotesUsed = 0,
  onNewBoard,
  onOpenListModal,
  onOpenSaveModal,
  onOpenPageDrawer,
  onExportSVG,
  onExportPNG,
  onExportPDF,
  onExportJSON,
  onImportJSON,
  onDeleteBoard,
  onOpenShareModal,
  onOpenConfigModal,
  onOpenHistoryModal,
  onOpenAiModal,
  onOpenShapeLibrary,
  onOpenScriptDrawer,
  onFocusAll,
}: WhiteboardHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <>
      {/* Top Header Controls Bar (Left) */}
      <div className="absolute top-4 left-4 z-40 flex items-center gap-2.5">

        {/* Action Menu button */}
        <div ref={menuRef} className="relative">
          <button
            aria-label="Action menu"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-white/95 backdrop-blur-xs border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl shadow-sm hover:bg-slate-50 transition-colors cursor-pointer dark:bg-slate-900/95 dark:border-slate-800 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onNewBoard?.();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                New Whiteboard
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onOpenListModal();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <FolderOpen className="w-4 h-4 text-blue-600" />
                Open from Cloud
              </button>

              {onOpenPageDrawer && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenPageDrawer();
                  }}
                  data-testid="header-pages-menu-btn"
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Layers className="w-4 h-4 text-blue-600" />
                  Pages
                </button>
              )}

              {canEdit && onOpenShapeLibrary && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenShapeLibrary();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Library className="w-4 h-4 text-indigo-600" />
                  Shape Libraries
                </button>
              )}

              {canEdit && onOpenScriptDrawer && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenScriptDrawer();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Code className="w-4 h-4 text-indigo-600" />
                  Shape Customizer
                </button>
              )}

              {canEdit && (
                <FeatureGate
                  feature="ai:text_to_diagram"
                  fallback={
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onOpenAiModal) {
                          onOpenAiModal();
                        } else {
                          setIsLicenseModalOpen(true);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>Generate with AI</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/50">
                        PRO
                      </span>
                    </button>
                  }
                >
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAiModal?.();
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Generate with AI
                  </button>
                </FeatureGate>
              )}

              {canEdit && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenSaveModal();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Save className="w-4 h-4 text-emerald-600" />
                  Save to Cloud
                </button>
              )}

              {boardId && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenShareModal();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Share2 className="w-4 h-4 text-blue-600" />
                  Share Board
                </button>
              )}

              {boardId && (
                <FeatureGate
                  feature="whiteboard:version_history"
                  fallback={
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        if (onOpenHistoryModal) {
                          onOpenHistoryModal();
                        } else {
                          setIsLicenseModalOpen(true);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600" />
                        <span>Version History</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/50">
                        PRO
                      </span>
                    </button>
                  }
                >
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenHistoryModal?.();
                    }}
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <History className="w-4 h-4 text-indigo-600" />
                    Version History
                  </button>
                </FeatureGate>
              )}

              {onOpenConfigModal && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenConfigModal();
                  }}
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                >
                  <Settings className="w-4 h-4 text-slate-600" />
                  Whiteboard Settings
                </button>
              )}

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportSVG?.();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <FileCode className="w-4 h-4 text-indigo-600" />
                Export SVG
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onExportPNG?.();
                }}
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
                    className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span>Export PDF</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/50">
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
                  className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
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
                className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <Download className="w-4 h-4 text-amber-600" />
                Export JSON
              </button>

              {canEdit && (
                <label className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100">
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
            </div>
          )}
        </div>
      </div>

      {/* Top Right Header Area */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2.5">
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

          {/* Active Collaborators Avatars */}
          {boardId && (
            <div className="bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm dark:bg-slate-900/95 dark:border-slate-800">
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
              <div className="relative">
                <div
                  style={{ backgroundColor: getUserColor(currentUser?.id || "me") }}
                  title={`${currentUser?.name || currentUser?.email || "User"} (You)`}
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow-xs uppercase ring-2 ring-blue-500"
                >
                  {(currentUser?.name || currentUser?.email || "U").slice(0, 2)}
                </div>
                {role && (
                  <div
                    title={`Role: ${role}`}
                    data-testid="user-role-icon"
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] border shadow-xs ${
                      role === "OWNER"
                        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800"
                        : role === "ADMIN"
                        ? "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
                        : role === "EDITOR"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                        : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {(role === "OWNER" || role === "ADMIN") && <Shield className="w-2 h-2" />}
                    {role === "EDITOR" && <Pencil className="w-2 h-2" />}
                    {role === "VIEWER" && <Eye className="w-2 h-2" />}
                  </div>
                )}
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
        </div>

        {/* Voting Quota Badge Indicator */}
        {votingConfig?.enabled !== false && votingConfig && userVotesUsed > 0 && (
          <div
            data-testid="voting-quota-indicator"
            title={
              votingConfig.isLocked
                ? "Voting session is currently locked"
                : `You have used ${userVotesUsed} of ${votingConfig.maxVotesPerUser} votes`
            }
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border shadow-xs transition-colors ${
              votingConfig.isLocked
                ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                : userVotesUsed >= votingConfig.maxVotesPerUser
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-900/50"
                : "bg-white/95 text-blue-700 border-blue-200 backdrop-blur-xs dark:bg-slate-900/95 dark:text-blue-400 dark:border-blue-900/50"
            }`}
          >
            <ThumbsUp className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
            <span>
              Votes: {userVotesUsed}/{votingConfig.maxVotesPerUser} used
            </span>
            {votingConfig.isLocked && (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold ml-0.5">(Locked)</span>
            )}
          </div>
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
