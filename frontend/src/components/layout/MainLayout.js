import React from 'react';
import { NavigationSidebar } from './NavigationSidebar';
import { StatusBar } from './StatusBar';
import { useNotification } from '../../contexts/NotificationContext';
import { Notification } from '../common/Notification';

export function MainLayout({ children }) {
  const { notifications } = useNotification();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <NavigationSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {/* Status Bar */}
        <StatusBar />
      </div>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  );
}