import { useState, useEffect, useMemo } from 'react';
import LineageGraph from './components/LineageGraph';
import TableDetails from './components/TableDetails';
import DashboardView from './components/DashboardView';
import SearchFilter from './components/SearchFilter';
import Legend from './components/Legend';
import { loadAndParseData } from './utils/dataParser';
import { buildGraphData } from './utils/graphBuilder';
import { ParsedData, FilterOptions, Table, GraphNode } from './types';
import { Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function App() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    datasets: [],
    layers: [],
    tableTypes: [],
    showScheduledOnly: false,
    searchTerm: '',
    selectedDashboard: undefined
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadAndParseData();
      setParsedData(data);
    } catch (err) {
      setError('Failed to load data. Please check that CSV files are in the public folder.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const graphData = useMemo(() => {
    if (!parsedData) return { nodes: [], links: [] };
    return buildGraphData(parsedData, filters);
  }, [parsedData, filters]);

  const handleNodeClick = (node: GraphNode) => {
    const table = parsedData?.tables.get(node.id);
    if (table) {
      setSelectedTable(table);
    }
  };

  const handleTableSelect = (tableId: string) => {
    const table = parsedData?.tables.get(tableId);
    if (table) {
      setSelectedTable(table);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading BigQuery lineage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold mb-2 text-destructive">Error Loading Data</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadData} variant="default">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!parsedData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="px-6 py-4">
          <h1 className="text-xl font-medium">
            <span className="text-foreground">BQ</span>{' '}
            <span className="text-primary">blueprint</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {parsedData.tables.size} tables • {parsedData.lineages.length} connections • {parsedData.dashboards.size} dashboards
          </p>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-[480px]'} bg-muted/10 border-r overflow-y-auto transition-all duration-300 ease-in-out relative`}>
          {/* Toggle button */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-2 right-2 z-10 h-8 w-8 ${sidebarCollapsed ? 'bg-background/80 hover:bg-background shadow-sm' : ''}`}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
          
          {!sidebarCollapsed && (
            <div className="p-4 space-y-4">
              <DashboardView
                parsedData={parsedData}
                selectedDashboard={selectedDashboard}
                onDashboardSelect={setSelectedDashboard}
                onTableHighlight={setHighlightedNodes}
              />
              <Legend />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-card border-b">
            <SearchFilter
              parsedData={parsedData}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          <div className="flex-1 relative bg-muted/5">
            <LineageGraph
              data={graphData}
              onNodeClick={handleNodeClick}
              highlightedNodes={highlightedNodes}
              focusedNodeId={selectedTable?.id}
            />
            
            {graphData.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground text-lg">No tables match the current filters</p>
                  <Button
                    onClick={() => setFilters({
                      datasets: [],
                      layers: [],
                      tableTypes: [],
                      showScheduledOnly: false,
                      searchTerm: '',
                      selectedDashboard: undefined
                    })}
                    variant="link"
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <TableDetails
          table={selectedTable}
          parsedData={parsedData}
          isOpen={!!selectedTable}
          onClose={() => setSelectedTable(null)}
          onTableSelect={handleTableSelect}
        />
      </div>
    </div>
  );
}

export default App;