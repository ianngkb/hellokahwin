import React from 'react';
import { Languages, Play, Pause, RotateCcw } from 'lucide-react';

export function TranslationWorkspace() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Translation Workspace</h1>
        <p className="text-gray-600">Manage bulk translation operations and progress tracking</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Languages className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Translation Workspace</h3>
            <p className="text-gray-600">
              Select content from the Content Discovery page to start translating
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}