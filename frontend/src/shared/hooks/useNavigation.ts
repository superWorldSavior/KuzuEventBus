import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNavigationStore, type Breadcrumb, generateBreadcrumbs } from "../../app/stores/navigation";

/**
 * Enhanced navigation hook that provides route management, breadcrumb generation,
 * and navigation helpers as specified in the technical documentation
 */
export function useNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentPath,
    breadcrumbs,
    sidebarCollapsed,
    mobileMenuOpen,
    setCurrentPath,
    setBreadcrumbs,
    toggleSidebar,
    setMobileMenuOpen,
  } = useNavigationStore();

  // Update navigation state when route changes
  useEffect(() => {
    setCurrentPath(location.pathname);
    setBreadcrumbs(generateBreadcrumbs(location.pathname));
  }, [location.pathname, setCurrentPath, setBreadcrumbs]);

  // Close mobile menu when route changes
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname, mobileMenuOpen, setMobileMenuOpen]);

  // Navigation helpers
  const navigationHelpers = useMemo(
    () => ({
      // Go to dashboard
      goToDashboard: () => navigate("/dashboard"),
      
      // Go to databases
      goToDatabases: () => navigate("/databases"),
      
      // Go to specific database
      goToDatabase: (databaseId: string) => navigate(`/databases/${databaseId}`),
      
      // Go to queries
      goToQueries: () => navigate("/queries"),
      
      // Go to specific query
      goToQuery: (queryId: string) => navigate(`/queries/${queryId}`),
      
      // Go to analytics
      goToAnalytics: () => navigate("/analytics"),
      
      // Go to settings
      goToSettings: (tab?: string) => {
        const path = tab ? `/settings?tab=${tab}` : "/settings";
        navigate(path);
      },
      
      // Go back in history
      goBack: () => navigate(-1),
      
      // Go forward in history
      goForward: () => navigate(1),
      
      // Navigate to any path
      goTo: (path: string, options?: { replace?: boolean }) => {
        navigate(path, options);
      },
    }),
    [navigate]
  );

  // Route checking helpers
  const routeCheckers = useMemo(
    () => ({
      // Check if currently on dashboard
      isDashboard: currentPath === "/dashboard",
      
      // Check if on databases section
      isDatabases: currentPath.startsWith("/databases"),
      
      // Check if on queries section
      isQueries: currentPath.startsWith("/queries"),
      
      // Check if on analytics section
      isAnalytics: currentPath.startsWith("/analytics"),
      
      // Check if on settings section
      isSettings: currentPath.startsWith("/settings"),
      
      // Check if on a specific route
      isRoute: (path: string) => currentPath === path,
      
      // Check if route starts with path
      isRoutePrefix: (prefix: string) => currentPath.startsWith(prefix),
    }),
    [currentPath]
  );

  // Breadcrumb helpers
  const breadcrumbHelpers = useMemo(
    () => ({
      // Get current breadcrumbs
      getCurrentBreadcrumbs: () => breadcrumbs,
      
      // Set custom breadcrumbs
      setCustomBreadcrumbs: (customBreadcrumbs: Breadcrumb[]) => {
        setBreadcrumbs(customBreadcrumbs);
      },
      
      // Add breadcrumb to current path
      addBreadcrumb: (breadcrumb: Breadcrumb) => {
        setBreadcrumbs([...breadcrumbs, breadcrumb]);
      },
      
      // Reset breadcrumbs to auto-generated
      resetBreadcrumbs: () => {
        setBreadcrumbs(generateBreadcrumbs(currentPath));
      },
    }),
    [breadcrumbs, currentPath, setBreadcrumbs]
  );

  // Mobile navigation helpers
  const mobileHelpers = useMemo(
    () => ({
      // Open mobile menu
      openMobileMenu: () => setMobileMenuOpen(true),
      
      // Close mobile menu
      closeMobileMenu: () => setMobileMenuOpen(false),
      
      // Toggle mobile menu
      toggleMobileMenu: () => setMobileMenuOpen(!mobileMenuOpen),
      
      // Check if mobile menu is open
      isMobileMenuOpen: mobileMenuOpen,
    }),
    [mobileMenuOpen, setMobileMenuOpen]
  );

  // Sidebar helpers
  const sidebarHelpers = useMemo(
    () => ({
      // Toggle sidebar collapse
      toggleSidebar,
      
      // Check if sidebar is collapsed
      isSidebarCollapsed: sidebarCollapsed,
      
      // Set sidebar collapsed state
      setSidebarCollapsed: (collapsed: boolean) => {
        if (collapsed !== sidebarCollapsed) {
          toggleSidebar();
        }
      },
    }),
    [sidebarCollapsed, toggleSidebar]
  );

  // URL helpers
  const urlHelpers = useMemo(
    () => ({
      // Get current pathname
      getCurrentPath: () => currentPath,
      
      // Get query parameters
      getSearchParams: () => new URLSearchParams(location.search),
      
      // Get specific query parameter
      getSearchParam: (key: string) => {
        const params = new URLSearchParams(location.search);
        return params.get(key);
      },
      
      // Update query parameters
      updateSearchParams: (params: Record<string, string | null>) => {
        const searchParams = new URLSearchParams(location.search);
        
        Object.entries(params).forEach(([key, value]) => {
          if (value === null) {
            searchParams.delete(key);
          } else {
            searchParams.set(key, value);
          }
        });
        
        const newSearch = searchParams.toString();
        const newPath = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;
        navigate(newPath, { replace: true });
      },
    }),
    [currentPath, location.search, location.pathname, navigate]
  );

  return {
    // Current state
    currentPath,
    breadcrumbs,
    location,
    
    // Navigation helpers
    ...navigationHelpers,
    
    // Route checking
    ...routeCheckers,
    
    // Breadcrumb management
    ...breadcrumbHelpers,
    
    // Mobile navigation
    ...mobileHelpers,
    
    // Sidebar management
    ...sidebarHelpers,
    
    // URL helpers
    ...urlHelpers,
  };
}

/**
 * Hook for managing page titles and meta information
 */
export function usePageMeta() {
  const { currentPath } = useNavigation();

  const setPageTitle = (title: string) => {
    document.title = `${title} | Kuzu EventBus`;
  };

  const getPageTitle = () => {
    const pathSegments = currentPath.split("/").filter(Boolean);
    
    if (pathSegments.length === 0 || pathSegments[0] === "dashboard") {
      return "Dashboard";
    }
    
    const pageMap: Record<string, string> = {
      databases: "Databases",
      queries: "Queries", 
      analytics: "Analytics",
      settings: "Settings",
    };
    
    return pageMap[pathSegments[0]] || "Page";
  };

  useEffect(() => {
    setPageTitle(getPageTitle());
  }, [currentPath]);

  return {
    setPageTitle,
    getPageTitle,
  };
}

/**
 * Hook for handling keyboard navigation shortcuts
 */
export function useKeyboardNavigation() {
  const navigation = useNavigation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when no input/textarea is focused
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      // Handle keyboard shortcuts with Cmd/Ctrl modifier
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case "1":
            event.preventDefault();
            navigation.goToDashboard();
            break;
          case "2":
            event.preventDefault();
            navigation.goToDatabases();
            break;
          case "3":
            event.preventDefault();
            navigation.goToQueries();
            break;
          case "4":
            event.preventDefault();
            navigation.goToAnalytics();
            break;
          case "5":
            event.preventDefault();
            navigation.goToSettings();
            break;
          case "k":
            event.preventDefault();
            // Focus search input if available
            const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
            break;
        }
      }

      // Handle other shortcuts
      switch (event.key) {
        case "Escape":
          // Close mobile menu if open
          if (navigation.isMobileMenuOpen) {
            navigation.closeMobileMenu();
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigation]);

  return {
    // Keyboard shortcut reference
    shortcuts: {
      "Cmd/Ctrl + 1": "Go to Dashboard",
      "Cmd/Ctrl + 2": "Go to Databases",
      "Cmd/Ctrl + 3": "Go to Queries",
      "Cmd/Ctrl + 4": "Go to Analytics",
      "Cmd/Ctrl + 5": "Go to Settings",
      "Cmd/Ctrl + K": "Focus Search",
      "Escape": "Close Mobile Menu",
    },
  };
}