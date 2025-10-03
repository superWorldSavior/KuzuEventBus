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
  selectedDatabaseId: string | null;
  selectedPitrPoint: string | null;
  currentAnchorTimestamp: string | null;
}

interface NavigationActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setCurrentPath: (path: string) => void;
  setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
  setSelectedDatabaseId: (id: string | null) => void;
  setSelectedPitrPoint: (ts: string | null) => void;
  setCurrentAnchorTimestamp: (ts: string | null) => void;
  reset: () => void;
}

type NavigationStore = NavigationState & NavigationActions;

const initialState: NavigationState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  currentPath: "/",
  breadcrumbs: [],
  selectedDatabaseId: null,
  selectedPitrPoint: null,
  currentAnchorTimestamp: null,
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

      setSelectedDatabaseId: (selectedDatabaseId) => set({ selectedDatabaseId }),

      setSelectedPitrPoint: (selectedPitrPoint) => set({ selectedPitrPoint }),

      setCurrentAnchorTimestamp: (currentAnchorTimestamp) => set({ currentAnchorTimestamp }),

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

// Navigation items configuration - MVP only
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
