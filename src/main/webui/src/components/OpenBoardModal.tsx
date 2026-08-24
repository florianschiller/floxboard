import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import * as api from "@/lib/api";

interface OpenBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBoard: (board: api.WhiteboardSummary) => void;
}

const PAGE_SIZE = 5;

export function OpenBoardModal({
  isOpen,
  onClose,
  onSelectBoard,
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

        if (list.length > PAGE_SIZE) {
          setHasNextPage(true);
          setWhiteboards(list.slice(0, PAGE_SIZE));
        } else {
          setHasNextPage(false);
          setWhiteboards(list);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-base">Open Whiteboard</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs for My Boards / Shared with Me */}
        <div className="flex border-b border-slate-700 px-4 pt-2">
          <button
            onClick={() => {
              setListTab("my");
              setListPage(1);
            }}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              listTab === "my"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            My Boards
          </button>
          <button
            onClick={() => {
              setListTab("shared");
              setListPage(1);
            }}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
              listTab === "shared"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
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
                className="p-3 rounded-xl bg-slate-700/40 border border-slate-700 hover:border-blue-500 cursor-pointer transition-colors flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-white">{b.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : ""}
                  </div>
                </div>
                {b.role && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-600 text-slate-300">
                    {b.role}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <div className="p-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => setListPage((p) => Math.max(1, p - 1))}
            disabled={listPage === 1}
            className="px-2.5 py-1 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-medium"
          >
            Previous
          </button>
          <span>Page {listPage}</span>
          <button
            onClick={() => setListPage((p) => p + 1)}
            disabled={!hasNextPage}
            className="px-2.5 py-1 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-30 rounded-lg text-white font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
