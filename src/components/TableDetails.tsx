import React from 'react';
import { Table, TableLineage, ParsedData } from '../types';
import { getUpstreamTables, getDownstreamTables } from '../utils/graphBuilder';
import { XMarkIcon, LinkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TableDetailsProps {
  table: Table | null;
  parsedData: ParsedData;
  onClose: () => void;
  onTableSelect: (tableId: string) => void;
}

const TableDetails: React.FC<TableDetailsProps> = ({
  table,
  parsedData,
  onClose,
  onTableSelect
}) => {
  if (!table) return null;

  const upstreamTables = getUpstreamTables(table.id, parsedData.lineages);
  const downstreamTables = getDownstreamTables(table.id, parsedData.lineages);

  const getTableById = (id: string) => parsedData.tables.get(id);

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-6 py-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{table.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{table.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />
          </button>
        </div>
      </div>

      <div className="px-6 py-4 space-y-6">
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-500">Dataset</span>
            <p className="text-gray-900">{table.dataset}</p>
          </div>
          
          <div className="flex gap-4">
            <div>
              <span className="text-sm font-medium text-gray-500">Layer</span>
              <p className="text-gray-900">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium text-white
                  ${table.layer === 'Raw' ? 'bg-green-500' : 
                    table.layer === 'Inter' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                  {table.layer}
                </span>
              </p>
            </div>
            
            <div>
              <span className="text-sm font-medium text-gray-500">Type</span>
              <p className="text-gray-900">{table.tableType}</p>
            </div>
          </div>

          {table.isScheduledQuery && (
            <div className="flex items-center gap-2 text-purple-600">
              <ClockIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Scheduled Query</span>
            </div>
          )}

          {table.description && (
            <div>
              <span className="text-sm font-medium text-gray-500">Description</span>
              <p className="text-gray-900 text-sm mt-1">{table.description}</p>
            </div>
          )}

          {table.link && (
            <div>
              <a
                href={table.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                <LinkIcon className="h-4 w-4 flex-shrink-0" />
                View in BigQuery
              </a>
            </div>
          )}
        </div>

        {upstreamTables.size > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Upstream Tables ({upstreamTables.size})
            </h3>
            <div className="space-y-1">
              {Array.from(upstreamTables).map(id => {
                const upTable = getTableById(id);
                if (!upTable) return null;
                return (
                  <button
                    key={id}
                    onClick={() => onTableSelect(id)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{upTable.name}</p>
                        <p className="text-xs text-gray-500">{upTable.dataset}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded
                        ${upTable.layer === 'Raw' ? 'bg-green-100 text-green-700' :
                          upTable.layer === 'Inter' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'}`}>
                        {upTable.layer}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {downstreamTables.size > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Downstream Tables ({downstreamTables.size})
            </h3>
            <div className="space-y-1">
              {Array.from(downstreamTables).map(id => {
                const downTable = getTableById(id);
                if (!downTable) return null;
                return (
                  <button
                    key={id}
                    onClick={() => onTableSelect(id)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{downTable.name}</p>
                        <p className="text-xs text-gray-500">{downTable.dataset}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded
                        ${downTable.layer === 'Raw' ? 'bg-green-100 text-green-700' :
                          downTable.layer === 'Inter' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'}`}>
                        {downTable.layer}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {upstreamTables.size === 0 && downstreamTables.size === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No connected tables found
          </div>
        )}
      </div>
    </div>
  );
};

export default TableDetails;