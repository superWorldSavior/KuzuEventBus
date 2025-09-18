import React, { createContext, useContext, ReactNode } from 'react';
import { useRealTimeManager } from '@/hooks/useRealTime';

interface RealTimeContextType {
  isOnline: boolean;
  isRealTimeEnabled: boolean;
  enableRealTime: () => void;
  disableRealTime: () => void;
  connectionError: string | null;
  dashboardEventsConnected: boolean;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

interface RealTimeProviderProps {
  children: ReactNode;
}

export function RealTimeProvider({ children }: RealTimeProviderProps) {
  const {
    isOnline,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime,
    dashboardEvents,
    connectionError,
  } = useRealTimeManager();

  const value: RealTimeContextType = {
    isOnline,
    isRealTimeEnabled,
    enableRealTime,
    disableRealTime,
    connectionError,
    dashboardEventsConnected: dashboardEvents.isConnected,
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTimeContext() {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTimeContext must be used within a RealTimeProvider');
  }
  return context;
}

// Higher-order component for real-time features
export function withRealTime<P extends object>(
  Component: React.ComponentType<P & { realTime?: RealTimeContextType }>
) {
  return function WithRealTimeComponent(props: P) {
    const realTime = useRealTimeContext();
    return <Component {...props} realTime={realTime} />;
  };
}