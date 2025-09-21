import React from 'react';
import { useAppStore } from '../../store/appStore';
import { Wifi, WifiOff, Activity, Clock } from 'lucide-react';
import clsx from 'clsx';

export function StatusBar() {
  const {
    isConnected,
    lastSync,
    currentOperation,
    systemStatus
  } = useAppStore(state => ({
    isConnected: state.isConnected,
    lastSync: state.lastSync,
    currentOperation: state.currentOperation,
    systemStatus: state.systemStatus
  }));

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-8 bg-gray-100 border-t border-gray-200 flex items-center justify-between px-4 text-xs text-gray-600">
      {/* Left side - Connection status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          {isConnected ? (
            <>
              <Wifi className="w-3 h-3 text-green-500" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-red-500" />
              <span>Disconnected</span>
            </>
          )}
        </div>

        {currentOperation && (
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
            <span>{currentOperation}</span>
          </div>
        )}
      </div>

      {/* Right side - System info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>Last sync: {formatLastSync(lastSync)}</span>
        </div>

        <div className={clsx(
          'px-2 py-0.5 rounded text-xs font-medium',
          systemStatus === 'healthy' && 'bg-green-100 text-green-700',
          systemStatus === 'warning' && 'bg-yellow-100 text-yellow-700',
          systemStatus === 'error' && 'bg-red-100 text-red-700'
        )}>
          {systemStatus === 'healthy' && 'System OK'}
          {systemStatus === 'warning' && 'Warning'}
          {systemStatus === 'error' && 'Error'}
        </div>
      </div>
    </div>
  );
}