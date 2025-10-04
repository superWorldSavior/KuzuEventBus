import { useState, useEffect, useRef } from "react";
import { cn } from "@/shared/lib";
import { formatRelativeDate } from "@/shared/utils/dateUtils";

export interface MutatingWin {
  start: string;
  end: string;
  files?: number;
}

interface PitrTimelineProps {
  mutatingWins: MutatingWin[];
  currentAnchorTimestamp: string | null;
  lastAnchorValue: string; // e.g. PITR_ANCHOR.LAST
  onBackToLast: () => void;
  onSelectNode: (endTs: string) => void;
  // Context and branch rail
  context: 'prod' | 'preview' | 'branch';
  branch?: { name: string; color: string; wins: MutatingWin[] } | null;
  isProdArmed?: boolean; // Whether Run on Prod is armed (red state)
  // Actions via white node (on PROD rail only)
  databaseName?: string | null;
  onCreateBranch?: (fromTs: string) => void; // from current selection or HEAD
  onRunOnProd?: () => void; // quick action to run at prod
  onRestoreAt?: (ts: string) => void; // destructive restore at timestamp
  // Optional: selecting a node on the branch rail
  onSelectBranchNode?: (index: number) => void;
}

export function PitrTimeline({
  mutatingWins,
  currentAnchorTimestamp,
  lastAnchorValue,
  onBackToLast,
  onSelectNode,
  context,
  branch,
  isProdArmed = false,
  databaseName,
  onCreateBranch,
  onRunOnProd,
  onRestoreAt,
  onSelectBranchNode,
}: PitrTimelineProps) {
  const isAtHead = currentAnchorTimestamp === lastAnchorValue;
  // const selectedTs = isAtHead ? lastAnchorValue : (currentAnchorTimestamp || lastAnchorValue);
  const whiteNodeRef = useRef<HTMLDivElement>(null);
  const [menuTs, setMenuTs] = useState<string | null>(null); // which PROD node shows tooltip actions
  const [confirmRestoreTs, setConfirmRestoreTs] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState<string>("");

  // Close tooltip on click outside for PROD rail area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (whiteNodeRef.current && !whiteNodeRef.current.contains(event.target as Node)) {
        setMenuTs(null);
        setConfirmRestoreTs(null);
        setConfirmInput("");
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-80 px-3 bg-gradient-to-br from-gray-50 to-gray-100 border-r border-gray-200 flex flex-row items-start py-6 overflow-y-auto gap-4">
      {/* PROD rail */}
      <div className="flex-1 flex flex-col items-center">
        <div className="text-[10px] tracking-wider text-gray-600 mb-2 font-semibold">PROD</div>
        <div className="w-px h-2 bg-gray-300" />

        {/* White action node appears BEFORE HEAD (always visible). No tooltip; click only arms PROD. */}
        <div 
          ref={whiteNodeRef}
          className="relative flex flex-col items-center space-y-2 mt-2"
        >
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 cursor-pointer hover:scale-110 transition",
                isProdArmed ? "border-red-500 bg-red-500" : "border-gray-400 bg-white"
              )}
              title={isProdArmed ? "Armed for Prod" : "Click to arm Run on Prod"}
              onClick={() => onRunOnProd && onRunOnProd()}
            />
            <div className="w-0.5 h-8 my-1 rounded-full bg-gray-300" />
          </div>
        </div>

        {/* HEAD node */}
        <div className="relative flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200",
                currentAnchorTimestamp === lastAnchorValue
                  ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50 scale-125 ring-4 ring-blue-200"
                  : "bg-gray-300 border-gray-400 hover:scale-110 hover:bg-gray-400"
              )}
              onClick={() => {
                onBackToLast();
                setMenuTs(lastAnchorValue);
                setConfirmRestoreTs(null);
                setConfirmInput("");
              }}
              title="Last mutating query (HEAD)"
              data-testid="now-node"
            />
            {(mutatingWins.length > 0) && (
              <div className={cn(
                "w-0.5 h-8 my-1 rounded-full",
                currentAnchorTimestamp === lastAnchorValue ? "bg-blue-300" : "bg-gray-300"
              )} />
            )}
          </div>
          {currentAnchorTimestamp === lastAnchorValue && (
            <div className="absolute left-6 text-[11px] font-medium bg-blue-600 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
              Last
            </div>
          )}
          {menuTs === lastAnchorValue && onCreateBranch && (
            <div className="absolute left-6 top-6 bg-white border border-gray-200 rounded p-1 shadow-sm flex items-center gap-1">
              <button
                type="button"
                className="px-2 py-1 text-[11px] rounded border border-gray-300 hover:bg-gray-50"
                onClick={() => onCreateBranch(lastAnchorValue)}
              >
                New Branch
              </button>
            </div>
          )}
        </div>

        {/* PROD mutating nodes */}
        <div className="flex flex-col items-center space-y-2 mt-2 mx-auto">
          {mutatingWins.map((w, idx) => {
            const isSelected = currentAnchorTimestamp === w.end;
            const selectedIdx = mutatingWins.findIndex(x => currentAnchorTimestamp === x.end);
            const isFuture = selectedIdx >= 0 && idx < selectedIdx;
            return (
              <div key={`node-${w.end}-${idx}`} className="relative flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200",
                      isSelected
                        ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50 scale-125 ring-4 ring-blue-200"
                        : isFuture
                        ? "bg-gray-300 border-gray-400 hover:scale-110 hover:bg-gray-400"
                        : "bg-blue-500 border-blue-300 hover:scale-110 hover:shadow-md"
                    )}
                    title={`Mutation: ${formatRelativeDate(w.end)}`}
                    onClick={() => {
                      onSelectNode(w.end);
                      setMenuTs(w.end);
                      setConfirmRestoreTs(null);
                      setConfirmInput("");
                    }}
                    data-testid={`curr-node-${idx}`}
                  />
                  {idx < mutatingWins.length - 1 && (
                    <div className={cn(
                      "w-0.5 h-8 my-1 rounded-full",
                      isFuture || (selectedIdx >= 0 && idx === selectedIdx - 1) ? "bg-gray-300" : "bg-blue-300"
                    )} />
                  )}
                </div>
                {isSelected && (
                  <div className="absolute left-8 flex flex-col gap-2 text-[11px]">
                    <div className="font-medium bg-blue-600 text-white px-2 py-1 rounded shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                      {formatRelativeDate(w.end)}{w.files && <span className="ml-1 opacity-80">• {w.files} WAL</span>}
                    </div>
                    {menuTs === w.end && (
                      <div className="bg-white border border-gray-200 rounded shadow-sm p-1.5 flex flex-col gap-1 min-w-[140px]">
                        {onCreateBranch && (
                          <button
                            type="button"
                            className="px-2 py-1 text-[11px] rounded border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 whitespace-nowrap"
                            onClick={() => onCreateBranch(w.end)}
                          >
                            New Branch
                          </button>
                        )}
                        {onRestoreAt && (
                          <div className="flex flex-col gap-2">
                            {confirmRestoreTs !== w.end ? (
                              <button
                                type="button"
                                className="px-2 py-1 text-[11px] rounded border bg-red-50 text-red-700 border-red-300 hover:bg-red-100 whitespace-nowrap"
                                onClick={() => {
                                  setConfirmRestoreTs(w.end);
                                  setConfirmInput("");
                                }}
                                title="Danger zone: destructive restore"
                              >
                                Restore (danger)
                              </button>
                            ) : (
                              <div className="p-1.5 border border-red-300 rounded bg-red-50">
                                <div className="text-[10px] text-red-700 mb-1">Type database name:</div>
                                <input
                                  className="w-full border border-gray-300 rounded px-1.5 py-1 text-[11px]"
                                  placeholder={databaseName || 'database-name'}
                                  value={confirmInput}
                                  onChange={(e) => setConfirmInput(e.target.value)}
                                />
                                <div className="mt-1.5 flex items-center gap-1">
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-[10px] rounded bg-red-600 text-white disabled:opacity-50"
                                    disabled={!databaseName || confirmInput !== databaseName}
                                    onClick={() => {
                                      onRestoreAt(w.end);
                                      setConfirmRestoreTs(null);
                                      setMenuTs(null);
                                      setConfirmInput("");
                                    }}
                                  >
                                    Confirm Restore
                                  </button>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-[10px] rounded border border-gray-300"
                                    onClick={() => {
                                      setConfirmRestoreTs(null);
                                      setConfirmInput("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* BRANCH rail (optional) */}
      {branch && (
        <div className="flex-1 flex flex-col items-center">
          <div className="text-[10px] tracking-wider mb-2 font-semibold" style={{ color: branch.color }}>
            {branch.name}
          </div>
          <div className="w-px h-2" style={{ backgroundColor: branch.color, opacity: 0.6 }} />
          {/* Branch nodes */}
          <div className="flex flex-col items-center space-y-2 mt-4 mx-auto">
            {branch.wins.length === 0 && (
              <div className="text-[10px] text-gray-400">No queries yet</div>
            )}
            {branch.wins.map((w, idx) => (
              <div key={`bnode-${w.end}-${idx}`} className="relative flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="w-4 h-4 rounded-full border-2 cursor-pointer transition-all duration-200"
                    style={{ backgroundColor: branch.color, borderColor: branch.color }}
                    title={`Branch node: ${formatRelativeDate(w.end)}`}
                    onClick={() => onSelectBranchNode && onSelectBranchNode(idx)}
                  />
                  {idx < branch.wins.length - 1 && (
                    <div className="w-0.5 h-8 my-1 rounded-full" style={{ backgroundColor: branch.color, opacity: 0.7 }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
