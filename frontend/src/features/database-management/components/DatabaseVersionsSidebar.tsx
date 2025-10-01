import { useState } from "react";
import { 
  ClockCounterClockwise, 
  Camera, 
  CircleDashed,
  Play,
  Calendar,
} from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib";

interface Snapshot {
  id: string;
  created_at: string;
  size_bytes: number;
  checksum: string;
}

interface DatabaseVersionsSidebarProps {
  databaseId: string;
  snapshots: Snapshot[];
  isLoading: boolean;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onRestorePITR: (timestamp: Date) => void;
  className?: string;
}

export function DatabaseVersionsSidebar({
  snapshots,
  isLoading,
  onCreateSnapshot,
  onRestoreSnapshot,
  onRestorePITR,
  className,
}: DatabaseVersionsSidebarProps) {
  const [showPITRPicker, setShowPITRPicker] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className={cn("bg-white border-l border-gray-200 overflow-y-auto", className)}>
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClockCounterClockwise className="w-5 h-5 mr-2" />
            Versions
          </h3>
          <Button size="sm" onClick={onCreateSnapshot}>
            <Camera className="w-4 h-4 mr-1" />
            Snapshot
          </Button>
        </div>

        {/* PITR Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowPITRPicker(!showPITRPicker)}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Restore to Time
        </Button>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-4 bg-gray-200 rounded" />
                    <div className="w-full h-3 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            {/* Current State */}
            <div className="flex items-start space-x-3 mb-6">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CircleDashed className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">Current</span>
                  <Badge className="bg-green-50 text-green-700 text-xs">Live</Badge>
                </div>
                <p className="text-xs text-gray-500">Active database state</p>
              </div>
            </div>

            {/* Timeline Line */}
            {snapshots.length > 0 && (
              <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-200" />
            )}

            {/* Snapshots */}
            <div className="space-y-6">
              {snapshots.map((snapshot, index) => (
                <div key={snapshot.id} className="relative flex items-start space-x-3 group">
                  {/* Timeline Dot */}
                  <div className="relative flex-shrink-0 z-10">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Camera className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>

                  {/* Snapshot Info */}
                  <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 group-hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {formatDate(snapshot.created_at)}
                          </span>
                          {index === 0 && (
                            <Badge className="bg-blue-50 text-blue-700 text-xs">Latest</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{formatTime(snapshot.created_at)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1"
                        onClick={() => onRestoreSnapshot(snapshot.id)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatSize(snapshot.size_bytes)}</span>
                      <span className="font-mono text-[10px]" title={snapshot.checksum}>
                        {snapshot.checksum.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {snapshots.length === 0 && (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">No snapshots yet</p>
                <p className="text-xs text-gray-500 mb-4">
                  Create your first snapshot to enable version history
                </p>
                <Button size="sm" onClick={onCreateSnapshot}>
                  <Camera className="w-4 h-4 mr-1" />
                  Create Snapshot
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PITR Picker - shown when showPITRPicker is true */}
      {showPITRPicker && (
        <div className="border-t border-gray-200 p-4 bg-blue-50">
          <p className="text-xs text-gray-600 mb-3">
            Select any point in time to restore the database to that exact moment
          </p>
          <input
            type="datetime-local"
            className="w-full px-3 py-2 border rounded-md text-sm"
            max={new Date().toISOString().slice(0, 16)}
            onChange={(e) => {
              if (e.target.value) {
                onRestorePITR(new Date(e.target.value));
                setShowPITRPicker(false);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
