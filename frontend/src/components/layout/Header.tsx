import { useState } from "react";
import {
  List,
  MagnifyingGlass,
  Bell,
} from "@phosphor-icons/react";
import { cn } from "@/utils";
import { useNavigationStore } from "@/store/navigation";
import { TenantSwitcher } from "./TenantSwitcher";
import { UserMenu } from "./UserMenu";
import { MobileSearchModal } from "./MobileSearchModal";
import { Breadcrumbs } from "./Breadcrumbs";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const { mobileMenuOpen, setMobileMenuOpen } = useNavigationStore();

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <header className={cn("bg-white border-b border-gray-200", className)}>
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left section - Mobile menu + Breadcrumbs */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Mobile menu button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <List className="w-5 h-5 text-gray-500" />
          </button>

          {/* Breadcrumbs */}
          <Breadcrumbs className="ml-2 md:ml-0" showHome={false} />
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-lg mx-4 hidden sm:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlass className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search databases, queries..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right section - Tenant switcher + Notifications + User menu */}
        <div className="flex items-center space-x-3">
          {/* Tenant switcher - hidden on mobile */}
          <div className="hidden lg:block">
            <TenantSwitcher />
          </div>

          {/* Search button for mobile */}
          <button 
            onClick={() => setIsMobileSearchOpen(true)}
            className="sm:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <MagnifyingGlass className="w-5 h-5 text-gray-500" />
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-md hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <UserMenu />
        </div>
      </div>

      {/* Mobile search modal */}
      <MobileSearchModal 
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
      />
    </header>
  );
}

Header.displayName = "Header";
