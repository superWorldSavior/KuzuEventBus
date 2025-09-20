import { useState } from "react";
import { Check, Buildings, Plus, CaretDown } from "@phosphor-icons/react";
import { cn } from "@/shared/lib";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

// Mock tenant data - would come from API in real app
const mockTenants: Tenant[] = [
  { id: "1", name: "Acme Corp", slug: "acme", isActive: true },
  { id: "2", name: "TechStart Inc", slug: "techstart", isActive: false },
  { id: "3", name: "DataCorp Ltd", slug: "datacorp", isActive: false },
];

interface TenantSwitcherProps {
  className?: string;
}

export function TenantSwitcher({ className }: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tenants, setTenants] = useState(mockTenants);

  const activeTenant = tenants.find((tenant) => tenant.isActive);

  const handleTenantChange = (tenantId: string) => {
    setTenants((prev) =>
      prev.map((tenant) => ({
        ...tenant,
        isActive: tenant.id === tenantId,
      }))
    );
    setIsOpen(false);
  };

  const handleAddTenant = () => {
    // Handle adding new tenant
    setIsOpen(false);
    console.log("Add new tenant clicked");
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          "bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          isOpen && "ring-2 ring-blue-500 border-transparent"
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center flex-shrink-0">
            <Buildings className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-left min-w-0">
            <div className="text-gray-900 truncate">
              {activeTenant?.name || "Select Tenant"}
            </div>
          </div>
        </div>
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
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-30 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40 max-h-64 overflow-auto">
            {/* Header */}
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Switch Organization
              </div>
            </div>

            {/* Tenant list */}
            <div className="py-1">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantChange(tenant.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors",
                    "hover:bg-gray-50",
                    tenant.isActive && "bg-blue-50"
                  )}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
                        tenant.isActive
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      )}
                    >
                      <Buildings
                        className={cn(
                          "w-4 h-4",
                          tenant.isActive
                            ? "text-blue-600"
                            : "text-gray-500"
                        )}
                      />
                    </div>
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "font-medium truncate",
                          tenant.isActive
                            ? "text-blue-900"
                            : "text-gray-900"
                        )}
                      >
                        {tenant.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {tenant.slug}.kuzu-eventbus.com
                      </div>
                    </div>
                  </div>
                  {tenant.isActive && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Add tenant option */}
            <div className="border-t border-gray-100 pt-1">
              <button
                onClick={handleAddTenant}
                className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                  <Plus className="w-4 h-4 text-gray-400" />
                </div>
                <span>Add Organization</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

TenantSwitcher.displayName = "TenantSwitcher";