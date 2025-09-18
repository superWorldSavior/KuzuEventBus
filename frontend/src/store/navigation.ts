import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Breadcrumb {
  label: string;
  path?: string;
}

interface NavigationState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  currentPath: string;
  breadcrumbs: Breadcrumb[];
}

interface NavigationActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setCurrentPath: (path: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  reset: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

const initialState: NavigationState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  currentPath: "/",
  breadcrumbs: [],
};

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      ...initialState,

      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),

      toggleMobileMenu: () =>
        set((state) => ({
          mobileMenuOpen: !state.mobileMenuOpen,
        })),

      setCurrentPath: (currentPath) => set({ currentPath }),

      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      reset: () => set(initialState),
    }),
    {
      name: "navigation-storage",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// Navigation items configuration
export const navigationItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "Home",
    description: "Overview and metrics",
  },
  {
    path: "/databases",
    label: "Databases",
    icon: "Database",
    description: "Manage your databases",
  },
  {
    path: "/queries",
    label: "Queries",
    icon: "Code",
    description: "Build and execute queries",
  },
  {
    path: "/analytics",
    label: "Analytics",
    icon: "BarChart",
    description: "Performance insights",
  },
  {
    path: "/settings",
    label: "Settings",
    icon: "Settings",
    description: "Account and preferences",
  },
];

// Utility function to generate breadcrumbs from path
export function generateBreadcrumbs(path: string): Breadcrumb[] {
  const segments = path.split("/").filter(Boolean);
  const breadcrumbs: Breadcrumb[] = [{ label: "Home", path: "/dashboard" }];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Skip the first segment if it's "dashboard" since we already have Home
    if (segment === "dashboard" && index === 0) {
      return;
    }

    const navItem = navigationItems.find((item) => item.path === currentPath);
    breadcrumbs.push({
      label:
        navItem?.label || segment.charAt(0).toUpperCase() + segment.slice(1),
      path: currentPath,
    });
  });

  return breadcrumbs;
}
