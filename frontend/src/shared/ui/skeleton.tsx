import { cn } from "@/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  );
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="w-16 h-4 rounded" />
      </div>
      <div className="space-y-2">
        <Skeleton className="w-24 h-8 rounded" />
        <Skeleton className="w-32 h-4 rounded" />
        <Skeleton className="w-20 h-3 rounded" />
      </div>
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center space-x-4 p-4", className)}>
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="w-3/4 h-4 rounded" />
        <Skeleton className="w-1/2 h-3 rounded" />
      </div>
      <Skeleton className="w-16 h-8 rounded" />
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("flex items-center space-x-4 p-4 border-b border-gray-100", className)}>
      {Array.from({ length: columns }).map((_, index) => (
        <div key={index} className="flex-1">
          <Skeleton className="w-full h-4 rounded" />
        </div>
      ))}
    </div>
  );
}

// Activity item skeleton
export function ActivitySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex space-x-3 p-3", className)}>
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-3/4 h-4 rounded" />
        <Skeleton className="w-1/2 h-3 rounded" />
        <Skeleton className="w-20 h-3 rounded" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg border border-gray-200 p-6", className)}>
      <div className="mb-4">
        <Skeleton className="w-32 h-6 rounded" />
      </div>
      <div className="space-y-3">
        <div className="flex items-end space-x-2 h-32">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton
              key={index}
              className="flex-1 rounded-t"
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Page skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-8 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8 rounded" />
          <Skeleton className="w-64 h-4 rounded" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="w-24 h-10 rounded" />
          <Skeleton className="w-32 h-10 rounded" />
        </div>
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="w-40 h-6 rounded" />
          {Array.from({ length: 5 }).map((_, index) => (
            <ListItemSkeleton key={index} />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="w-32 h-6 rounded" />
          {Array.from({ length: 8 }).map((_, index) => (
            <ActivitySkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

Skeleton.displayName = "Skeleton";