import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNavigationStore, generateBreadcrumbs } from "@/store/navigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { setCurrentPath, setBreadcrumbs } = useNavigationStore();

  // Update navigation state when route changes
  useEffect(() => {
    setCurrentPath(location.pathname);
    setBreadcrumbs(generateBreadcrumbs(location.pathname));
  }, [location.pathname, setCurrentPath, setBreadcrumbs]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Main content */}
        <main
          className={`
            flex-1 overflow-auto p-4 sm:p-6 lg:p-8 
            transition-all duration-300
          `}
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
