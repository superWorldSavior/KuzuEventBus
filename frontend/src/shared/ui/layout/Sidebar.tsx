import { NavLink, useLocation } from "react-router-dom";
import {
  House,
  Database,
  Code,
  ChartBar,
  Gear,
  CaretLeft,
  X,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { useNavigationStore, navigationItems } from "@/app/stores/navigation";

const iconMap = {
  Home: House,
  Database,
  Code,
  BarChart: ChartBar,
  Settings: Gear,
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation();
  const { sidebarCollapsed, mobileMenuOpen, toggleSidebar, setMobileMenuOpen } =
    useNavigationStore();

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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/dashboard" &&
                location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={({ isActive: navIsActive }) =>
                  cn(
                    // Base styles
                    "group flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    // Active states
                    navIsActive || isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    // Collapsed styles
                    sidebarCollapsed ? "justify-center px-2" : "justify-start"
                  )
                }
              >
                <Icon
                  className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive
                      ? "text-blue-700"
                      : "text-gray-400 group-hover:text-gray-500",
                    !sidebarCollapsed && "mr-3"
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {sidebarCollapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

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
