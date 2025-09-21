import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';
import { useNotification } from '../../contexts/NotificationContext';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
};

const styles = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200'
};

export function Notification({ notification }) {
  const { removeNotification } = useNotification();
  const Icon = icons[notification.type] || Info;

  return (
    <div className={clsx(
      'max-w-sm w-full shadow-lg rounded-lg border pointer-events-auto',
      styles[notification.type]
    )}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="ml-3 w-0 flex-1">
            {notification.title && (
              <p className="text-sm font-medium">
                {notification.title}
              </p>
            )}
            <p className={clsx(
              'text-sm',
              notification.title ? 'mt-1' : ''
            )}>
              {notification.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
              onClick={() => removeNotification(notification.id)}
            >
              <span className="sr-only">Close</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}