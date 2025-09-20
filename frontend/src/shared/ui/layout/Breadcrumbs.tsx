import { Link, useLocation } from "react-router-dom";
import { CaretRight, House } from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { useNavigationStore, generateBreadcrumbs } from "@/app/stores/navigation";

interface BreadcrumbsProps {
  className?: string;
  showHome?: boolean;
  maxItems?: number;
}

export function Breadcrumbs({ 
  className, 
  showHome = true, 
  maxItems = 5 
}: BreadcrumbsProps) {
  const location = useLocation();
  const { breadcrumbs } = useNavigationStore();

  // Use store breadcrumbs or generate from current path
  const currentBreadcrumbs =
    breadcrumbs.length > 0
      ? breadcrumbs
      : generateBreadcrumbs(location.pathname);

  // Truncate breadcrumbs if they exceed maxItems
  const displayBreadcrumbs = currentBreadcrumbs.length > maxItems
    ? [
        ...currentBreadcrumbs.slice(0, 1), // Always show first (Home)
        { label: "...", path: undefined }, // Ellipsis
        ...currentBreadcrumbs.slice(-maxItems + 2) // Show last items
      ]
    : currentBreadcrumbs;

  return (
    <nav 
      className={cn("flex items-center space-x-1 text-sm", className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {showHome && location.pathname !== "/dashboard" && (
          <>
            <li>
              <Link
                to="/dashboard"
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Home"
              >
                <House className="w-4 h-4" />
              </Link>
            </li>
            {displayBreadcrumbs.length > 0 && (
              <li>
                <CaretRight className="w-4 h-4 text-gray-400" />
              </li>
            )}
          </>
        )}

        {displayBreadcrumbs.map((crumb, index) => (
          <li key={crumb.path || crumb.label} className="flex items-center">
            {index > 0 && (
              <CaretRight className="w-4 h-4 text-gray-400 mr-1" />
            )}
            
            {crumb.label === "..." ? (
              <span className="text-gray-400 px-1">...</span>
            ) : crumb.path && index < displayBreadcrumbs.length - 1 ? (
              <Link
                to={crumb.path}
                className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-32"
                title={crumb.label}
              >
                {crumb.label}
              </Link>
            ) : (
              <span 
                className="text-gray-900 font-medium truncate max-w-32"
                title={crumb.label}
              >
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

Breadcrumbs.displayName = "Breadcrumbs";