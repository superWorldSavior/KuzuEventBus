import React, { useEffect, useRef } from "react";

// Hook for managing focus
export function useFocusManagement() {
  const focusRef = useRef<HTMLElement>(null);

  const focusElement = (element?: HTMLElement) => {
    if (element) {
      element.focus();
    } else if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  const trapFocus = (containerElement: HTMLElement) => {
    const focusableElements = containerElement.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    );
    const firstFocusableElement = focusableElements[0] as HTMLElement;
    const lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            lastFocusableElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusableElement) {
            firstFocusableElement.focus();
            e.preventDefault();
          }
        }
      }
      if (e.key === 'Escape') {
        containerElement.blur();
      }
    };

    containerElement.addEventListener('keydown', handleTabKey);
    return () => containerElement.removeEventListener('keydown', handleTabKey);
  };

  return { focusRef, focusElement, trapFocus };
}

// Hook for managing ARIA announcements
export function useAnnouncements() {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announcementRef.current) {
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.textContent = message;
      
      // Clear the announcement after a delay
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  const AnnouncementRegion = () => (
    <div
      ref={announcementRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );

  return { announce, AnnouncementRegion };
}

// Hook for keyboard navigation
export function useKeyboardNavigation(onEnter?: () => void, onEscape?: () => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          if (onEnter) {
            e.preventDefault();
            onEnter();
          }
          break;
        case 'Escape':
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEnter, onEscape]);
}

// Utility functions for ARIA attributes
export const ariaUtils = {
  // Generate unique IDs for ARIA relationships
  generateId: (prefix = 'aria') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Common ARIA label patterns
  labelledBy: (id: string) => ({ 'aria-labelledby': id }),
  describedBy: (id: string) => ({ 'aria-describedby': id }),
  expanded: (isExpanded: boolean) => ({ 'aria-expanded': isExpanded }),
  selected: (isSelected: boolean) => ({ 'aria-selected': isSelected }),
  checked: (isChecked: boolean) => ({ 'aria-checked': isChecked }),
  disabled: (isDisabled: boolean) => ({ 'aria-disabled': isDisabled }),
  hidden: (isHidden: boolean) => ({ 'aria-hidden': isHidden }),
  live: (priority: 'polite' | 'assertive' | 'off') => ({ 'aria-live': priority }),
  
  // Role attributes
  role: {
    button: { role: 'button' },
    dialog: { role: 'dialog' },
    menu: { role: 'menu' },
    menuitem: { role: 'menuitem' },
    tab: { role: 'tab' },
    tabpanel: { role: 'tabpanel' },
    alert: { role: 'alert' },
    status: { role: 'status' },
    progressbar: { role: 'progressbar' },
  },
};

// Screen reader utilities
export const srUtils = {
  // Screen reader only text
  srOnly: "sr-only",
  
  // Skip link for main content
  SkipLink: ({ href = "#main", children = "Skip to main content" }) => (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
    >
      {children}
    </a>
  ),
};

// Color contrast utilities
export const colorUtils = {
  // Check if color combination meets WCAG standards
  meetsContrastRatio: (foreground: string, background: string, level: 'AA' | 'AAA' = 'AA') => {
    // This is a simplified check - in production, use a proper color contrast library
    // like 'color-contrast-checker'
    return true; // Placeholder
  },
  
  // Common accessible color combinations
  accessible: {
    primary: {
      bg: 'bg-blue-600',
      text: 'text-white',
      hover: 'hover:bg-blue-700',
    },
    secondary: {
      bg: 'bg-gray-600',
      text: 'text-white',
      hover: 'hover:bg-gray-700',
    },
    success: {
      bg: 'bg-green-600',
      text: 'text-white',
      hover: 'hover:bg-green-700',
    },
    warning: {
      bg: 'bg-yellow-600',
      text: 'text-white',
      hover: 'hover:bg-yellow-700',
    },
    danger: {
      bg: 'bg-red-600',
      text: 'text-white',
      hover: 'hover:bg-red-700',
    },
  },
};

export default {
  useFocusManagement,
  useAnnouncements,
  useKeyboardNavigation,
  ariaUtils,
  srUtils,
  colorUtils,
};