import React from "react";
import { cn } from "@/shared/lib";

interface DropdownMenuProps {
  children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}

interface DropdownMenuContentProps {
  align?: "start" | "end";
  children: React.ReactNode;
}

interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, (child) =>
        React.cloneElement(child as React.ReactElement, { isOpen, setIsOpen })
      )}
    </div>
  );
}

export function DropdownMenuTrigger({
  asChild = false,
  children,
  onClick,
  isOpen,
  setIsOpen,
}: DropdownMenuTriggerProps & { isOpen?: boolean; setIsOpen?: (open: boolean) => void }) {
  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    setIsOpen?.(!isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: handleClick });
  }

  return (
    <button onClick={handleClick} className="inline-flex items-center">
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  align = "start",
  children,
  isOpen,
}: DropdownMenuContentProps & { isOpen?: boolean }) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5",
        align === "end" ? "right-0" : "left-0"
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, className, onClick, ...props }: DropdownMenuItemProps) {
  return (
    <div
      className={cn(
        "flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}