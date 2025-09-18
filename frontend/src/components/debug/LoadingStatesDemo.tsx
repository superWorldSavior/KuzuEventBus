import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardLoading } from "@/components/dashboard/DashboardLoading";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { LoadingSkeleton, SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/LoadingSkeleton";

export function LoadingStatesDemo() {
  const [showLoading, setShowLoading] = useState(false);

  if (showLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Loading States Demo</h1>
          <Button 
            onClick={() => setShowLoading(false)}
            variant="outline"
          >
            Show Loaded State
          </Button>
        </div>
        
        <DashboardLoading />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Skeleton Variants</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Text Skeleton</p>
                <LoadingSkeleton variant="text" lines={3} />
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Circular Skeleton</p>
                <LoadingSkeleton variant="circular" />
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-2">Rectangular Skeleton</p>
                <LoadingSkeleton variant="rectangular" height="4rem" />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Card Skeleton</h3>
            <SkeletonCard />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Chart Skeleton</h3>
            <SkeletonChart />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">List Skeleton</h3>
            <SkeletonList items={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard (Loaded)</h1>
        <Button onClick={() => setShowLoading(true)}>
          Show Loading States
        </Button>
      </div>
      
      <DashboardPage />
    </div>
  );
}

LoadingStatesDemo.displayName = "LoadingStatesDemo";