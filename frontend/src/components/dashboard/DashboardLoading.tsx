import { LoadingSkeleton, SkeletonCard, SkeletonChart } from "../ui/LoadingSkeleton";
import { cn } from "@/utils";

interface DashboardLoadingProps {
  className?: string;
}

export function DashboardLoading({ className }: DashboardLoadingProps) {
  return (
    <div className={cn("space-y-8", className)}>
      {/* Welcome Section Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <LoadingSkeleton width="12rem" height="2rem" />
          <LoadingSkeleton width="20rem" height="1.25rem" />
        </div>
        <div className="flex space-x-3">
          <LoadingSkeleton width="8rem" height="2.5rem" className="rounded-lg" />
          <LoadingSkeleton width="8rem" height="2.5rem" className="rounded-lg" />
        </div>
      </div>

      {/* Metrics Overview Skeleton */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <LoadingSkeleton width="6rem" height="1.5rem" />
          <LoadingSkeleton width="8rem" height="1rem" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>

      {/* Charts Section Skeleton */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <LoadingSkeleton width="8rem" height="1.5rem" />
          <LoadingSkeleton width="10rem" height="1rem" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </section>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Queries Skeleton */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <LoadingSkeleton width="8rem" height="1.5rem" />
                <LoadingSkeleton width="6rem" height="1rem" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <LoadingSkeleton width="4rem" height="1rem" />
                      <LoadingSkeleton variant="circular" width="1.5rem" height="1.5rem" />
                    </div>
                    <LoadingSkeleton width="90%" height="3rem" />
                    <div className="flex items-center justify-between mt-3">
                      <LoadingSkeleton width="6rem" height="0.875rem" />
                      <LoadingSkeleton width="4rem" height="0.875rem" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Timeline Skeleton */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="animate-pulse space-y-4">
              <LoadingSkeleton width="8rem" height="1.5rem" />
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <LoadingSkeleton variant="circular" width="2rem" height="2rem" />
                    <div className="flex-1 space-y-2">
                      <LoadingSkeleton width="75%" height="1rem" />
                      <LoadingSkeleton width="50%" height="0.875rem" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <section>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <LoadingSkeleton width="8rem" height="1.5rem" />
                <LoadingSkeleton width="12rem" height="1rem" />
              </div>
              <LoadingSkeleton width="8rem" height="1rem" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-start space-x-4">
                    <LoadingSkeleton variant="circular" width="1.5rem" height="1.5rem" />
                    <div className="flex-1 space-y-2">
                      <LoadingSkeleton width="70%" height="1rem" />
                      <LoadingSkeleton width="90%" height="2rem" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

DashboardLoading.displayName = "DashboardLoading";