import { useRealTimeContext } from '@/app/providers/RealTimeProvider';
import { WifiHigh, WifiSlash, CircleNotch, Warning } from '@phosphor-icons/react';

interface RealTimeIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function RealTimeIndicator({ 
  className, 
  showLabel = false,
  size = 'md' 
}: RealTimeIndicatorProps) {
  const { 
    isOnline, 
    isRealTimeEnabled, 
    dashboardEventsConnected, 
    connectionError 
  } = useRealTimeContext();

  const getStatus = () => {
    if (!isOnline) {
      return {
        color: 'text-red-500',
        icon: WifiSlash,
        label: 'Offline',
        description: 'No internet connection',
      };
    }
    
    if (!isRealTimeEnabled) {
      return {
        color: 'text-yellow-500',
        icon: Warning,
        label: 'Real-time Disabled',
        description: 'Real-time updates are disabled',
      };
    }
    
    if (connectionError) {
      return {
        color: 'text-red-500',
        icon: WifiSlash,
        label: 'Connection Error',
        description: connectionError,
      };
    }
    
    if (!dashboardEventsConnected) {
      return {
        color: 'text-yellow-500',
        icon: CircleNotch,
        label: 'Connecting...',
        description: 'Establishing real-time connection',
      };
    }
    
    return {
      color: 'text-green-500',
      icon: WifiHigh,
      label: 'Connected',
      description: 'Real-time updates active',
    };
  };

  const status = getStatus();
  const IconComponent = status.icon;
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSize = sizeClasses[size];
  const isConnecting = status.icon === CircleNotch;

  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      <div className="relative">
        <IconComponent 
          className={`${iconSize} ${status.color} ${isConnecting ? 'animate-spin' : ''}`}
        />
        
        {/* Pulse effect for connected state */}
        {status.icon === WifiHigh && (
          <div className={`absolute inset-0 ${iconSize} bg-green-400 rounded-full animate-ping opacity-20`} />
        )}
      </div>
      
      {showLabel && (
        <div className="flex flex-col">
          <span className={`text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-gray-500">
              {status.description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for header/status bars
export function RealTimeStatus() {
  return (
    <RealTimeIndicator 
      size="sm" 
      className="ml-2"
    />
  );
}

// Detailed version for settings or debug panels
export function RealTimeStatusCard() {
  const { 
    isOnline, 
    isRealTimeEnabled, 
    dashboardEventsConnected, 
    connectionError,
    enableRealTime,
    disableRealTime,
  } = useRealTimeContext();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Real-time Status</h3>
        <RealTimeIndicator showLabel size="sm" />
      </div>
      
      <div className="space-y-2 text-xs text-gray-600">
        <div className="flex justify-between">
          <span>Internet:</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Real-time:</span>
          <span className={isRealTimeEnabled ? 'text-green-600' : 'text-yellow-600'}>
            {isRealTimeEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Live Updates:</span>
          <span className={dashboardEventsConnected ? 'text-green-600' : 'text-yellow-600'}>
            {dashboardEventsConnected ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      {connectionError && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {connectionError}
        </div>
      )}
      
      <div className="flex space-x-2 pt-2">
        {isRealTimeEnabled ? (
          <button
            onClick={disableRealTime}
            className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200"
          >
            Disable Real-time
          </button>
        ) : (
          <button
            onClick={enableRealTime}
            className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200"
          >
            Enable Real-time
          </button>
        )}
      </div>
    </div>
  );
}