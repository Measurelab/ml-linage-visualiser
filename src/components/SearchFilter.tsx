import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FilterOptions, LayerType, TableType, ParsedData } from '../types';

interface SearchFilterProps {
  parsedData: ParsedData;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  parsedData,
  filters,
  onFiltersChange
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);

  useEffect(() => {
    const datasets = new Set<string>();
    parsedData.tables.forEach(table => {
      if (table.dataset) datasets.add(table.dataset);
    });
    setAvailableDatasets(Array.from(datasets).sort());
  }, [parsedData]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      searchTerm: e.target.value
    });
  };

  const handleDatasetToggle = (dataset: string) => {
    const newDatasets = filters.datasets.includes(dataset)
      ? filters.datasets.filter(d => d !== dataset)
      : [...filters.datasets, dataset];
    
    onFiltersChange({
      ...filters,
      datasets: newDatasets
    });
  };

  const handleLayerToggle = (layer: LayerType) => {
    const newLayers = filters.layers.includes(layer)
      ? filters.layers.filter(l => l !== layer)
      : [...filters.layers, layer];
    
    onFiltersChange({
      ...filters,
      layers: newLayers
    });
  };

  const handleTableTypeToggle = (type: TableType) => {
    const newTypes = filters.tableTypes.includes(type)
      ? filters.tableTypes.filter(t => t !== type)
      : [...filters.tableTypes, type];
    
    onFiltersChange({
      ...filters,
      tableTypes: newTypes
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      datasets: [],
      layers: [],
      tableTypes: [],
      showScheduledOnly: false,
      searchTerm: '',
      selectedDashboard: undefined
    });
  };

  const hasActiveFilters = 
    filters.datasets.length > 0 ||
    filters.layers.length > 0 ||
    filters.tableTypes.length > 0 ||
    filters.showScheduledOnly ||
    filters.searchTerm !== '';

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tables by name, ID, or dataset..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
            ${showFilters ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          <FunnelIcon className="h-5 w-5 flex-shrink-0" />
          Filters
          {hasActiveFilters && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              Active
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 flex items-center gap-2 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 flex-shrink-0" />
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Layers</h3>
            <div className="flex gap-2">
              {(['Raw', 'Inter', 'Target'] as LayerType[]).map(layer => (
                <button
                  key={layer}
                  onClick={() => handleLayerToggle(layer)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors
                    ${filters.layers.includes(layer)
                      ? layer === 'Raw' ? 'bg-green-500 text-white' :
                        layer === 'Inter' ? 'bg-blue-500 text-white' :
                        'bg-amber-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Table Types</h3>
            <div className="flex gap-2">
              {(['Table', 'View', 'Query', 'Sheet'] as TableType[]).map(type => (
                <button
                  key={type}
                  onClick={() => handleTableTypeToggle(type)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors
                    ${filters.tableTypes.includes(type)
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.showScheduledOnly}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  showScheduledOnly: e.target.checked
                })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show scheduled queries only</span>
            </label>
          </div>

          {availableDatasets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Datasets</h3>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2">
                  {availableDatasets.map(dataset => (
                    <label key={dataset} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={filters.datasets.includes(dataset)}
                        onChange={() => handleDatasetToggle(dataset)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700 truncate" title={dataset}>
                        {dataset}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;