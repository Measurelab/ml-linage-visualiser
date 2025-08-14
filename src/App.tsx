import { useState, useEffect, useMemo } from 'react';
import LineageGraph from './components/LineageGraph';
import TableDetails from './components/TableDetails';
import DashboardView from './components/DashboardView';
import SearchFilter from './components/SearchFilter';
import Legend from './components/Legend';
import DataUpload from './components/DataUpload';
import ExcelUpload from './components/ExcelUpload';
import { loadAndParseData } from './utils/dataParser';
import { loadDataFromSupabase, hasDataInSupabase } from './services/lineageData';
import { isSupabaseEnabled } from './services/supabase';
import { buildGraphData } from './utils/graphBuilder';
import { ParsedData, FilterOptions, Table, GraphNode } from './types';
import { Loader2, PanelLeftClose, PanelLeftOpen, Upload } from 'lucide-react';
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
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'excel' | 'csv'>('excel');
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
      
      let data: ParsedData;
      
      if (isSupabaseEnabled) {
        // Check if data exists in Supabase
        const hasData = await hasDataInSupabase();
        
        if (hasData) {
          // Load from Supabase
          data = await loadDataFromSupabase();
          setShowUpload(false);
        } else {
          // No data in Supabase, show upload interface
          setShowUpload(true);
          setLoading(false);
          return;
        }
      } else {
        // Fallback to CSV files
        data = await loadAndParseData();
      }
      
      setParsedData(data);
      setShowUpload(false);
    } catch (err) {
      if (isSupabaseEnabled) {
        setShowUpload(true);
        setError('No data found. Please upload your CSV files.');
      } else {
        setError('Failed to load data. Please check that CSV files are in the public folder.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async () => {
    setShowUpload(false);
    await loadData();
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

  if (showUpload) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-2xl font-semibold">BigQuery Lineage Visualizer</h1>
            <div className="flex gap-2">
              {uploadMode === 'csv' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadMode('excel')}
                >
                  Switch to Excel Upload
                </Button>
              )}
              {uploadMode === 'excel' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadMode('csv')}
                >
                  Switch to CSV Upload
                </Button>
              )}
              {parsedData && (
                <Button
                  variant="outline"
                  onClick={() => setShowUpload(false)}
                >
                  Back to Visualization
                </Button>
              )}
            </div>
          </div>
        </div>
        {uploadMode === 'excel' ? (
          <ExcelUpload 
            onUploadComplete={handleUploadComplete}
            isSupabaseEnabled={isSupabaseEnabled}
          />
        ) : (
          <DataUpload 
            onUploadComplete={handleUploadComplete}
            isSupabaseEnabled={isSupabaseEnabled}
          />
        )}
      </div>
    );
  }

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-medium">
                Digital Science
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                BigQuery project: ds-bi-gbq • {parsedData.tables.size} tables • {parsedData.lineages.length} connections • {parsedData.dashboards.size} dashboards
              </p>
            </div>
            {isSupabaseEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New Data
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-[480px]'} bg-muted/10 border-r overflow-y-auto transition-all duration-300 ease-in-out`}>
          
          {!sidebarCollapsed && (
            <div className="p-4 space-y-4">
              <Legend />
              <DashboardView
                parsedData={parsedData}
                selectedDashboard={selectedDashboard}
                onDashboardSelect={setSelectedDashboard}
                onTableHighlight={setHighlightedNodes}
              />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-card">
            <SearchFilter
              parsedData={parsedData}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          <div className="flex-1 relative bg-muted/5">
            {/* Sidebar Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-4 z-20 h-10 w-10 bg-background/80 hover:bg-background shadow-md"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
            
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