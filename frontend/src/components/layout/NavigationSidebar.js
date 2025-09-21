import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Download,
  Languages,
  Eye,
  Upload,
  Settings,
  FileText
} from 'lucide-react';
import clsx from 'clsx';

const navigationItems = [
  {
    id: 'fetch',
    label: 'Content Discovery',
    icon: Download,
    path: '/fetch',
    description: 'Browse and select TWN content'
  },
  {
    id: 'translate',
    label: 'Translation',
    icon: Languages,
    path: '/translate',
    description: 'Translate content to Malay'
  },
  {
    id: 'review',
    label: 'Review & Edit',
    icon: Eye,
    path: '/review',
    description: 'Review and edit translations'
  },
  {
    id: 'publish',
    label: 'Publishing',
    icon: Upload,
    path: '/publish',
    description: 'Publish to HelloKahwin'
  }
];

const secondaryItems = [
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings',
    description: 'Configure WordPress connections'
  }
];

export function NavigationSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    return location.pathname === path || (path === '/fetch' && location.pathname === '/');
  };

  return (
    <div className="flex flex-col h-full">
      {/* App Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">HelloKahwin</h1>
            <p className="text-sm text-gray-500">Migration Tool</p>
          </div>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Workflow
          </h2>

          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={clsx(
                  'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={clsx(
                  'w-5 h-5',
                  active ? 'text-blue-600' : 'text-gray-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.label}
                  </p>
                  <p className={clsx(
                    'text-xs truncate',
                    active ? 'text-blue-600' : 'text-gray-500'
                  )}>
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Secondary Navigation */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-2">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.path)}
                className={clsx(
                  'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className={clsx(
                  'w-5 h-5',
                  active ? 'text-blue-600' : 'text-gray-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {item.label}
                  </p>
                  <p className={clsx(
                    'text-xs truncate',
                    active ? 'text-blue-600' : 'text-gray-500'
                  )}>
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}