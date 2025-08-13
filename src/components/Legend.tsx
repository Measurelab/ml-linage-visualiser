import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const Legend: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <InformationCircleIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-gray-900">Legend</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Layers</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Raw</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Inter</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Target</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Table Types</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-xs text-gray-700">Table</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-gray-700">View</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-gray-700">Query</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 012-2v-5a2 2 0 012-2 1 1 0 000-2h-1a4 4 0 00-3 1.354A4 4 0 005 4H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2v4H4V5z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-gray-700">Sheet</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Special Indicators</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <div className="absolute inset-0 w-4 h-4 -top-0.5 -left-0.5 border border-purple-500 rounded-full border-dashed"></div>
              </div>
              <span className="text-xs text-gray-700">Scheduled Query</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-gray-900 rounded-full"></div>
              <span className="text-xs text-gray-700">Selected Table</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-red-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Dashboard Highlight</span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Tips:</strong> Click and drag to pan, scroll to zoom, click nodes to see details
          </p>
        </div>
      </div>
    </div>
  );
};

export default Legend;