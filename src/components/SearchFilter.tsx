import React, { useState, useEffect } from 'react';
import { Search, Filter, X, BarChart3, Layers, Database, Table, Calendar } from 'lucide-react';
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

  // Filter section component for consistent styling
  const FilterSection: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }> = ({ title, icon, children, className = "" }) => (
    <div className={`bg-muted/20 rounded-lg p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Show focused item indicator */}
        {hasFocus && (
          <div className="mb-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                {focusedDashboard ? 'Dashboard Focus' : 'Table Focus'}
              </Badge>
              <span className="text-sm font-medium text-blue-900">
                Viewing connections for: <strong className="text-blue-950">{focusedTable?.name || focusedDashboard?.name}</strong>
              </span>
            </div>
            <Button
              onClick={clearFocus}
              variant="ghost"
              size="sm"
              className="h-8 px-3 font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
              Clear focus
            </Button>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              type="text"
              placeholder="Search tables by name, ID, or dataset..."
              value={filters.searchTerm}
              onChange={handleSearchChange}
              className="pl-10 h-11 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary/30 hover:border-border/80"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'default' : 'outline'}
              className={`gap-2 h-11 font-semibold transition-all duration-200 ${showFilters ? 'shadow-sm' : 'hover:shadow-sm'}`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (() => {
                const activeCount = Object.values(filters).filter(v => {
                  if (Array.isArray(v)) return v.length > 0;
                  if (typeof v === 'string') return v !== undefined && v !== '';
                  if (typeof v === 'boolean') return v;
                  return false;
                }).length;
                
                return (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-xs shadow-sm animate-pulse">
                    {activeCount}
                  </Badge>
                );
              })()}
            </Button>

            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                className="gap-2 h-11 font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 transition-all duration-200"
              >
                <X className="h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mt-6 pt-6 border-t">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <FilterSection
                  title="Data layers"
                  icon={<Layers className="h-4 w-4 text-primary" />}
                >
                  <div className="flex flex-wrap gap-2">
                    {(['Raw', 'Inter', 'Target', 'Reporting'] as LayerType[]).map(layer => (
                      <Button
                        key={layer}
                        onClick={() => handleLayerToggle(layer)}
                        variant={filters.layers.includes(layer) ? getLayerVariant(layer) as any : 'outline'}
                        size="sm"
                        className="font-semibold transition-all duration-200 hover:shadow-sm"
                      >
                        {layer}
                      </Button>
                    ))}
                  </div>
                </FilterSection>

                <FilterSection
                  title="Table types"
                  icon={<Table className="h-4 w-4 text-primary" />}
                >
                  <div className="flex flex-wrap gap-2">
                    {(['Table', 'View', 'Query', 'Sheet'] as TableType[]).map(type => (
                      <Button
                        key={type}
                        onClick={() => handleTableTypeToggle(type)}
                        variant={filters.tableTypes.includes(type) ? 'secondary' : 'outline'}
                        size="sm"
                        className="font-semibold transition-all duration-200 hover:shadow-sm"
                      >
                        {type}
                      </Button>
                    ))}
                  </div>
                </FilterSection>

                <FilterSection
                  title="Query scheduling"
                  icon={<Calendar className="h-4 w-4 text-primary" />}
                >
                  <div className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id="scheduled"
                      checked={filters.showScheduledOnly}
                      onCheckedChange={(checked) => onFiltersChange({
                        ...filters,
                        showScheduledOnly: checked as boolean
                      })}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <label
                      htmlFor="scheduled"
                      className="text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Show scheduled queries only
                    </label>
                  </div>
                </FilterSection>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {availableDatasets.length > 0 && (
                  <FilterSection
                    title="Datasets"
                    icon={<Database className="h-4 w-4 text-primary" />}
                  >
                    <ScrollArea className="h-36 rounded-md border border-border/50 p-4 bg-background/50">
                      <div className="grid grid-cols-1 gap-4">
                        {availableDatasets.map(dataset => (
                          <div key={dataset} className="flex items-center space-x-3 group">
                            <Checkbox
                              id={dataset}
                              checked={filters.datasets.includes(dataset)}
                              onCheckedChange={() => handleDatasetToggle(dataset)}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors"
                            />
                            <label
                              htmlFor={dataset}
                              className="text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate cursor-pointer group-hover:text-primary transition-colors"
                              title={dataset}
                            >
                              {dataset}
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </FilterSection>
                )}

                {availableDashboards.length > 0 && (
                  <FilterSection
                    title="Dashboards"
                    icon={<BarChart3 className="h-4 w-4 text-primary" />}
                  >
                    <ScrollArea className="h-36 rounded-md border border-border/50 p-3 bg-background/50">
                      <div className="space-y-2">
                        {availableDashboards.map(dashboard => (
                          <Button
                            key={dashboard.id}
                            variant={filters.selectedDashboard === dashboard.id ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handleDashboardSelect(dashboard.id)}
                            className="w-full justify-start h-auto p-3 font-semibold hover:shadow-sm transition-all duration-200"
                          >
                            <div className="flex flex-col items-start w-full space-y-1">
                              <div className="font-semibold text-sm truncate w-full text-left">
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
                  </FilterSection>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SearchFilter;