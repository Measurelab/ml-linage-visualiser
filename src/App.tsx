import React, { useState, useEffect, useMemo } from 'react';
import LineageGraph from './components/LineageGraph';
import TableDetails from './components/TableDetails';
import DashboardView from './components/DashboardView';
import SearchFilter from './components/SearchFilter';
import Legend from './components/Legend';
import { loadAndParseData } from './utils/dataParser';
import { buildGraphData } from './utils/graphBuilder';
import { ParsedData, FilterOptions, Table, GraphNode } from './types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

function App() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
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
      setError('Failed to load data. Please check that CSV files are in the /datasets folder.');
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4 flex-shrink-0" />
          <p className="text-gray-600">Loading BigQuery lineage data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 text-red-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
            <p>{error}</p>
            <button
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!parsedData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            BigQuery Lineage Visualizer
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {parsedData.tables.size} tables • {parsedData.lineages.length} connections • {parsedData.dashboards.size} dashboards
          </p>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto p-4 space-y-4">
          <DashboardView
            parsedData={parsedData}
            selectedDashboard={selectedDashboard}
            onDashboardSelect={setSelectedDashboard}
            onTableHighlight={setHighlightedNodes}
          />
          <Legend />
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-white border-b border-gray-200">
            <SearchFilter
              parsedData={parsedData}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          <div className="flex-1 relative">
            <LineageGraph
              data={graphData}
              onNodeClick={handleNodeClick}
              highlightedNodes={highlightedNodes}
            />
            
            {graphData.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">No tables match the current filters</p>
                  <button
                    onClick={() => setFilters({
                      datasets: [],
                      layers: [],
                      tableTypes: [],
                      showScheduledOnly: false,
                      searchTerm: '',
                      selectedDashboard: undefined
                    })}
                    className="mt-2 text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedTable && (
          <TableDetails
            table={selectedTable}
            parsedData={parsedData}
            onClose={() => setSelectedTable(null)}
            onTableSelect={handleTableSelect}
          />
        )}
      </div>
    </div>
  );
}

export default App;