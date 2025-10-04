import {
  CaretLeft,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { useNavigationStore } from "@/app/stores/navigation";
import { useDatabases } from "@/features/database-management/hooks/useDatabases";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { sidebarCollapsed, mobileMenuOpen, toggleSidebar, setMobileMenuOpen, selectedDatabaseId, setSelectedDatabaseId } =
    useNavigationStore();
  const { data: databases = [], isLoading } = useDatabases();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          "flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
          // Responsive width
          sidebarCollapsed ? "w-16" : "w-64",
          // Mobile overlay positioning
          "fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0",
          // Mobile show/hide
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {/* Logo/Title */}
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {sidebarCollapsed ? "K" : "KB"}
            </div>
            {!sidebarCollapsed && (
              <h1 className="ml-3 text-lg font-semibold text-gray-900 truncate">
                Kuzu EventBus
              </h1>
            )}
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center space-x-1">
            {/* Desktop collapse toggle */}
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Toggle sidebar"
            >
              <CaretLeft
                className={cn(
                  "w-4 h-4 text-gray-500 transition-transform duration-300",
                  sidebarCollapsed && "rotate-180"
                )}
              />
            </button>

            {/* Mobile close button */}
            <button
              onClick={closeMobileMenu}
              className="md:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Databases List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase px-2">Databases</h3>
          </div>
          <div className="p-2 space-y-1">
            {isLoading ? (
              <div className="text-center py-4 text-gray-400 text-xs">Loading...</div>
            ) : databases.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <Database className="w-8 h-8 mx-auto mb-1 opacity-30" />
                <p className="text-xs">No databases</p>
              </div>
            ) : (
              databases.map((db: any) => (
                <button
                  key={db.id}
                  onClick={() => setSelectedDatabaseId(db.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-all text-sm",
                    selectedDatabaseId === db.id
                      ? "bg-blue-50 border border-blue-200 text-blue-900"
                      : "border border-transparent hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{db.name}</p>
                      <p className="text-xs text-gray-500">
                        {db.sizeBytes ? `${(db.sizeBytes / 1024 / 1024).toFixed(1)} MB` : '0 MB'}
                      </p>
                    </div>
                    {selectedDatabaseId === db.id && (
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* PITR Section removed - handled in Dashboard vertical timeline */}
        
        {/* Bottom section */}
        <div className="p-4 border-t border-gray-200">
          {!sidebarCollapsed ? (
            <div className="text-xs text-gray-500 space-y-1">
              <div>Version 0.1.0</div>
              <div className="text-blue-600">© 2025 Kuzu EventBus</div>
            </div>
          ) : (
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
            )}
          </div>
      </aside>
    </>
  );
}

Sidebar.displayName = "Sidebar";
