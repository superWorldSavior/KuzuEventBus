import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CaretDown,
  Gear,
  Key,
  Bell,
  Moon,
  Sun,
  SignOut,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleMenuAction = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case "profile":
        navigate("/settings/profile");
        break;
      case "api-keys":
        navigate("/settings/api-keys");
        break;
      case "notifications":
        navigate("/settings/notifications");
        break;
      case "theme":
        setTheme(theme === "light" ? "dark" : "light");
        break;
      case "logout":
        handleLogout();
        break;
      default:
        break;
    }
  };

  const userInitials = user?.adminEmail
    ? user.adminEmail
        .split("@")[0]
        .split(".")
        .map((part: string) => part.charAt(0).toUpperCase())
        .join("")
        .slice(0, 2)
    : "U";

  return (
    <div className={cn("relative", className)} ref={menuRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
          "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500",
          isOpen && "bg-gray-100"
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-blue-700">
            {userInitials}
          </span>
        </div>

        {/* User info - hidden on mobile */}
        <div className="hidden md:block text-left min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {user?.adminEmail ? user.adminEmail.split("@")[0] : "User"}
          </div>
          <div className="text-xs text-gray-500">Account</div>
        </div>

        {/* Chevron */}
        <CaretDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-base font-medium text-blue-700">
                    {userInitials}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user?.adminEmail || "User"}
                  </div>
                  <div className="text-xs text-gray-500">Free Plan</div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={() => handleMenuAction("profile")}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Gear className="w-4 h-4 text-gray-400" />
                <span>Profile Settings</span>
              </button>

              <button
                onClick={() => handleMenuAction("api-keys")}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Key className="w-4 h-4 text-gray-400" />
                <span>API Keys</span>
              </button>

              <button
                onClick={() => handleMenuAction("notifications")}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Bell className="w-4 h-4 text-gray-400" />
                <span>Notifications</span>
              </button>

              <button
                onClick={() => handleMenuAction("theme")}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4 text-gray-400" />
                ) : (
                  <Sun className="w-4 h-4 text-gray-400" />
                )}
                <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
              </button>
            </div>

            {/* Divider and logout */}
            <div className="border-t border-gray-100 pt-1">
              <button
                onClick={() => handleMenuAction("logout")}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <SignOut className="w-4 h-4 text-red-400" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

UserMenu.displayName = "UserMenu";