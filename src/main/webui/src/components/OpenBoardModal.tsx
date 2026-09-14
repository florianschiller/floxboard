import { useState, useEffect, useCallback } from "react";
import { X, Plus } from "lucide-react";
import * as api from "@/lib/api";

interface OpenBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBoard: (board: api.WhiteboardSummary) => void;
  onNewBoard?: () => void;
}

const PAGE_SIZE = 5;

export function OpenBoardModal({
  isOpen,
  onClose,
  onSelectBoard,
  onNewBoard,
}: OpenBoardModalProps) {
  const [whiteboards, setWhiteboards] = useState<api.WhiteboardSummary[]>([]);
  const [listTab, setListTab] = useState<"my" | "shared">("my");
  const [listPage, setListPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadWhiteboardList = useCallback(
    async (tab: "my" | "shared", page: number) => {
      setIsLoading(true);
      try {
        const start = (page - 1) * PAGE_SIZE;
        const list =
          tab === "my"
            ? await api.listWhiteboards(start, PAGE_SIZE + 1)
            : await api.listSharedWhiteboards(start, PAGE_SIZE + 1);

        const items = Array.isArray(list) ? list : [];
        if (items.length > PAGE_SIZE) {
          setHasNextPage(true);
          setWhiteboards(items.slice(0, PAGE_SIZE));
        } else {
          setHasNextPage(false);
          setWhiteboards(items);
        }
      } catch (err) {
        console.error("Failed to load whiteboards list:", err);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isOpen) {
      setListTab("my");
      setListPage(1);
      loadWhiteboardList("my", 1);
    }
  }, [isOpen, loadWhiteboardList]);

  useEffect(() => {
    if (isOpen) {
      loadWhiteboardList(listTab, listPage);
    }
  }, [isOpen, listTab, listPage, loadWhiteboardList]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-slate-900">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-900 text-base">Open Whiteboard</h3>
            {onNewBoard && (
              <button
                onClick={() => {
                  onClose();
                  onNewBoard();
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Whiteboard</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs for My Boards / Shared with Me */}
        <div className="flex border-b border-slate-100 px-4 pt-2">
          <button
            onClick={() => {
              setListTab("my");
              setListPage(1);
            }}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              listTab === "my"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            My Boards
          </button>
          <button
            onClick={() => {
              setListTab("shared");
              setListPage(1);
            }}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              listTab === "shared"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Shared with Me
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading...</div>
          ) : whiteboards.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              {listTab === "my" ? "No saved whiteboards found." : "No shared whiteboards found."}
            </div>
          ) : (
            whiteboards.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectBoard(b)}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">{b.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : ""}
                  </div>
                </div>
                {b.role && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {b.role}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={() => setListPage((p) => Math.max(1, p - 1))}
            disabled={listPage === 1}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            Previous
          </button>
          <span>Page {listPage}</span>
          <button
            onClick={() => setListPage((p) => p + 1)}
            disabled={!hasNextPage}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700 font-medium cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
