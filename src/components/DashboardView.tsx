import React from 'react';
import { Dashboard, DashboardTable, ParsedData } from '../types';
import { getTablesByDashboard } from '../utils/graphBuilder';
import { ChartBarIcon, LinkIcon } from '@heroicons/react/24/outline';

interface DashboardViewProps {
  parsedData: ParsedData;
  selectedDashboard: string | null;
  onDashboardSelect: (dashboardId: string | null) => void;
  onTableHighlight: (tableIds: Set<string>) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  parsedData,
  selectedDashboard,
  onDashboardSelect,
  onTableHighlight
}) => {
  const dashboards = Array.from(parsedData.dashboards.values());

  const handleDashboardClick = (dashboardId: string) => {
    if (selectedDashboard === dashboardId) {
      onDashboardSelect(null);
      onTableHighlight(new Set());
    } else {
      onDashboardSelect(dashboardId);
      const tableIds = getTablesByDashboard(dashboardId, parsedData);
      onTableHighlight(tableIds);
    }
  };

  const getTableCount = (dashboardId: string) => {
    return parsedData.dashboardTables.filter(dt => dt.dashboardId === dashboardId).length;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 flex-shrink-0" />
          Dashboards
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Click a dashboard to highlight its tables
        </p>
      </div>

      <div className="space-y-2">
        {dashboards.map(dashboard => {
          const tableCount = getTableCount(dashboard.id);
          const isSelected = selectedDashboard === dashboard.id;
          
          return (
            <div
              key={dashboard.id}
              className={`border rounded-lg p-3 cursor-pointer transition-all
                ${isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
              onClick={() => handleDashboardClick(dashboard.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {dashboard.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboard.id} • {tableCount} tables
                  </p>
                  {dashboard.businessArea && (
                    <p className="text-xs text-gray-600 mt-1">
                      {dashboard.businessArea}
                    </p>
                  )}
                  {dashboard.owner && (
                    <p className="text-xs text-gray-600">
                      Owner: {dashboard.owner}
                    </p>
                  )}
                </div>
                {dashboard.link && (
                  <a
                    href={dashboard.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-200 rounded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  </a>
                )}
              </div>
              
              {isSelected && tableCount > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-2">
                    Connected Tables:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {parsedData.dashboardTables
                      .filter(dt => dt.dashboardId === dashboard.id)
                      .slice(0, 10)
                      .map(dt => (
                        <span
                          key={dt.tableId}
                          className="inline-block px-2 py-1 text-xs bg-white border border-blue-300 rounded text-blue-700"
                        >
                          {dt.tableName || dt.tableId}
                        </span>
                      ))}
                    {tableCount > 10 && (
                      <span className="inline-block px-2 py-1 text-xs text-blue-600">
                        +{tableCount - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDashboard && (
        <button
          onClick={() => {
            onDashboardSelect(null);
            onTableHighlight(new Set());
          }}
          className="mt-4 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
        >
          Clear Selection
        </button>
      )}
    </div>
  );
};

export default DashboardView;