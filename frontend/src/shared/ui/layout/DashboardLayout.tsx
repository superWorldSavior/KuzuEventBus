import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useNavigation, usePageMeta, useKeyboardNavigation } from "@/shared/hooks/useNavigation";
import { cn } from "@/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isMobileMenuOpen, closeMobileMenu } = useNavigation();
  
  // Initialize page meta and keyboard navigation
  usePageMeta();
  useKeyboardNavigation();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Main content */}
        <main
          className={cn(
            "flex-1 overflow-auto transition-all duration-300",
            "p-4 sm:p-6 lg:p-8",
            // Add subtle animation on content load
            "animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
          )}
        >
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
