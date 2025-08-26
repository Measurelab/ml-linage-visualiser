import React, { useState, useEffect } from 'react';
import { Search, Filter, X, BarChart3 } from 'lucide-react';
import { FilterOptions, LayerType, TableType, ParsedData } from '@/types';
import { getTablesByDashboard } from '@/utils/graphBuilder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchFilterProps {
  parsedData: ParsedData;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onTableHighlight?: (tableIds: Set<string>) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  parsedData,
  filters,
  onFiltersChange,
  onTableHighlight
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);
  const [availableDashboards, setAvailableDashboards] = useState<Array<{id: string, name: string, tableCount: number}>>([]);

  useEffect(() => {
    const datasets = new Set<string>();
    parsedData.tables.forEach(table => {
      if (table.dataset) datasets.add(table.dataset);
    });
    setAvailableDatasets(Array.from(datasets).sort());

    // Get available dashboards with table counts
    const dashboards = Array.from(parsedData.dashboards.values()).map(dashboard => ({
      id: dashboard.id,
      name: dashboard.name,
      tableCount: parsedData.dashboardTables.filter(dt => dt.dashboardId === dashboard.id).length
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    setAvailableDashboards(dashboards);
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

  const handleDashboardSelect = (dashboardId: string) => {
    const isCurrentlySelected = filters.selectedDashboard === dashboardId;
    
    if (isCurrentlySelected) {
      // Deselect dashboard
      onFiltersChange({
        ...filters,
        selectedDashboard: undefined
      });
      onTableHighlight?.(new Set());
    } else {
      // Select dashboard
      onFiltersChange({
        ...filters,
        selectedDashboard: dashboardId
      });
      // Highlight connected tables
      const tableIds = getTablesByDashboard(dashboardId, parsedData);
      onTableHighlight?.(tableIds);
    }
  };


  const clearFilters = () => {
    onFiltersChange({
      datasets: [],
      layers: [],
      tableTypes: [],
      showScheduledOnly: false,
      searchTerm: '',
      selectedDashboard: undefined,
      focusedTableId: undefined,
      focusedDashboardId: undefined
    });
  };

  const clearFocus = () => {
    onFiltersChange({
      ...filters,
      focusedTableId: undefined,
      focusedDashboardId: undefined
    });
  };

  const hasActiveFilters = 
    filters.datasets.length > 0 ||
    filters.layers.length > 0 ||
    filters.tableTypes.length > 0 ||
    filters.showScheduledOnly ||
    filters.searchTerm !== '' ||
    !!filters.selectedDashboard;

  const getLayerVariant = (layer: LayerType): "default" | "success" | "info" | "warning" | "destructive" => {
    switch (layer) {
      case 'Raw': return 'success';
      case 'Inter': return 'info';
      case 'Target': return 'warning';
      case 'Reporting': return 'destructive';
      default: return 'default';
    }
  };


  // Get the focused table or dashboard name
  const focusedTable = filters.focusedTableId ? parsedData.tables.get(filters.focusedTableId) : null;
  const focusedDashboard = filters.focusedDashboardId ? parsedData.dashboards.get(filters.focusedDashboardId) : null;
  const hasFocus = focusedTable || focusedDashboard;

  return (
    <Card>
      <CardContent className="py-2 px-4">
        {/* Show focused item indicator */}
        {hasFocus && (
          <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-md px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-blue-600">
                {focusedDashboard ? 'Dashboard Focus' : 'Table Focus'}
              </Badge>
              <span className="text-sm font-medium">
                Viewing connections for: <strong>{focusedTable?.name || focusedDashboard?.name}</strong>
              </span>
            </div>
            <Button
              onClick={clearFocus}
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
              Clear focus
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tables by name, ID, or dataset..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'default' : 'outline'}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs">
                Active
              </Badge>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              onClick={clearFilters}
              variant="outline"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Layers</h3>
              <div className="flex gap-2">
                {(['Raw', 'Inter', 'Target', 'Reporting'] as LayerType[]).map(layer => (
                  <Button
                    key={layer}
                    onClick={() => handleLayerToggle(layer)}
                    variant={filters.layers.includes(layer) ? getLayerVariant(layer) as any : 'outline'}
                    size="sm"
                  >
                    {layer}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3">Table types</h3>
              <div className="flex gap-2">
                {(['Table', 'View', 'Query', 'Sheet'] as TableType[]).map(type => (
                  <Button
                    key={type}
                    onClick={() => handleTableTypeToggle(type)}
                    variant={filters.tableTypes.includes(type) ? 'secondary' : 'outline'}
                    size="sm"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="scheduled"
                checked={filters.showScheduledOnly}
                onCheckedChange={(checked) => onFiltersChange({
                  ...filters,
                  showScheduledOnly: checked as boolean
                })}
              />
              <label
                htmlFor="scheduled"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show scheduled queries only
              </label>
            </div>

            {availableDatasets.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Datasets</h3>
                <ScrollArea className="h-40 rounded-md border p-3">
                  <div className="grid grid-cols-2 gap-3">
                    {availableDatasets.map(dataset => (
                      <div key={dataset} className="flex items-center space-x-2">
                        <Checkbox
                          id={dataset}
                          checked={filters.datasets.includes(dataset)}
                          onCheckedChange={() => handleDatasetToggle(dataset)}
                        />
                        <label
                          htmlFor={dataset}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate"
                          title={dataset}
                        >
                          {dataset}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {availableDashboards.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4" />
                  <h3 className="text-sm font-semibold">Dashboards</h3>
                </div>
                <ScrollArea className="h-40 rounded-md border p-3">
                  <div className="space-y-2">
                    {availableDashboards.map(dashboard => (
                      <Button
                        key={dashboard.id}
                        variant={filters.selectedDashboard === dashboard.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => handleDashboardSelect(dashboard.id)}
                        className="w-full justify-start h-auto p-2"
                      >
                        <div className="flex flex-col items-start w-full">
                          <div className="font-medium text-xs truncate w-full text-left">
                            {dashboard.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dashboard.tableCount} tables
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchFilter;