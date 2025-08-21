import { useState, useEffect, useMemo } from 'react';
import LineageGraph from './components/LineageGraph';
import TableDetails from './components/TableDetails';
import DashboardView from './components/DashboardView';
import SearchFilter from './components/SearchFilter';
import Legend from './components/Legend';
import ProjectTabs from './components/ProjectTabs';
import ExcelUpload from './components/ExcelUpload';
import DataUpload from './components/DataUpload';
import DevLogin from './components/DevLogin';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import CreateTableDialog from './components/CreateTableDialog';
import { PortalProvider, usePortal } from './contexts/PortalContext';
import { loadAndParseData } from './utils/dataParser';
import { loadDataFromSupabaseProject, hasProjectData, deleteTable, createTable, createLineage } from './services/lineageData';
import { getAllProjects } from './services/projects';
import { isSupabaseEnabled } from './services/supabase';
import { buildGraphData } from './utils/graphBuilder';
import { ParsedData, FilterOptions, Table, GraphNode, Project, TableLineage } from './types';
import { Loader2, PanelLeftClose, PanelLeftOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function AppContent() {
  const { portalName, isLoading: portalLoading, isAdmin } = usePortal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<GraphNode | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createConnectionNode, setCreateConnectionNode] = useState<GraphNode | null>(null);
  const [createConnectionMode, setCreateConnectionMode] = useState<'upstream' | 'downstream' | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      // Check if we're embedded in an iframe
      const embedded = window.self !== window.top;
      
      // In production, always require authentication unless embedded
      const isProduction = import.meta.env.PROD;
      const requireAuth = isProduction || import.meta.env.VITE_REQUIRE_AUTH === 'true';
      
      if (!requireAuth) {
        // Development mode with auth disabled - allow access
        setIsAuthenticated(true);
      } else if (embedded) {
        // Embedded in iframe with auth required - check if the page was loaded through proxy
        // by looking at the referrer, URL params, or current URL path
        const referrer = document.referrer;
        const allowedOrigin = import.meta.env.VITE_ALLOWED_ORIGIN;
        const urlParams = new URLSearchParams(window.location.search);
        const isEmbedded = urlParams.get('embedded') === 'true';
        
        if ((referrer && allowedOrigin && referrer.startsWith(allowedOrigin)) || isEmbedded) {
          // Loaded from allowed origin or has embedded parameter - trust the proxy
          setIsAuthenticated(true);
        } else {
          // Try API check as fallback
          try {
            const response = await fetch('/api/auth-check', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const result = await response.json();
              if (result.authenticated) {
                setIsAuthenticated(true);
              } else {
                setError('Iframe authentication failed: Invalid proxy headers');
                setLoading(false);
              }
            } else {
              setError('Iframe authentication failed: Proxy verification error');
              setLoading(false);
            }
          } catch (err) {
            setError('Iframe authentication failed: Cannot verify proxy');
            setLoading(false);
          }
        }
      } else {
        // Direct access with auth required - check dev login
        const auth = localStorage.getItem('devAuth');
        if (auth === 'true') {
          setIsAuthenticated(true);
        } else {
          setLoading(false);
        }
      }
    };

    checkAuthentication();
  }, []);

  // Wait for both authentication and portal context to be ready before initializing app
  useEffect(() => {
    if (isAuthenticated && !portalLoading) {
      initializeApp();
    }
  }, [isAuthenticated, portalLoading, portalName, isAdmin]);

  useEffect(() => {
    if (activeProject) {
      // Clear UI state when switching projects
      setSelectedTable(null);
      setHighlightedNodes(new Set());
      setSelectedDashboard(null);
      
      // Only load data if we don't already have it (e.g., from upload)
      if (!parsedData) {
        loadProjectData(activeProject.id);
      }
    } else {
      // No active project - clear everything
      setParsedData(null);
      setSelectedTable(null);
      setHighlightedNodes(new Set());
      setSelectedDashboard(null);
    }
  }, [activeProject]);

  const initializeApp = async () => {
    if (!isSupabaseEnabled) {
      // Fallback to CSV loading
      await loadCsvData();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Check if we have any projects (filtered by portal if in iframe, unless admin)
      const projects = await getAllProjects(portalName, isAdmin);
      
      if (projects.length === 0) {
        // No projects exist, show upload interface
        setShowUpload(true);
        setLoading(false);
        return;
      }
      
      // Set the first project as active only if we're not showing upload screen
      if (!showUpload) {
        setActiveProject(projects[0]);
      }
      
    } catch (err) {
      console.error('App initialization error:', err);
      setError('Failed to initialize app. Please check your Supabase connection and try refreshing the page.');
      setLoading(false);
      // On initialization error, still try to show a basic interface
      setShowUpload(true);
    }
  };

  const loadCsvData = async () => {
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

  const loadProjectData = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);
      setShowUpload(false); // Hide upload screen while loading
      
      const hasData = await hasProjectData(projectId);
      
      if (!hasData) {
        // Project exists but has no data - show upload for this project
        setParsedData(null);
        setShowUpload(true);
        setLoading(false);
        return;
      }
      
      const data = await loadDataFromSupabaseProject(projectId);
      
      // Validate data before setting
      if (data?.tables && data?.lineages !== undefined && data?.dashboards && data?.dashboardTables !== undefined) {
        setParsedData(data);
        // Data loaded successfully - ensure upload screen is hidden
        setShowUpload(false);
      } else {
        // Invalid data structure - show upload screen
        console.warn('Invalid data structure loaded from database:', data);
        setShowUpload(true);
        setError('Invalid data structure. Please re-upload your data.');
      }
    } catch (err) {
      setError(`Failed to load project data: ${err}`);
      console.error(err);
      // On error, don't change upload screen state - let user decide what to do
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    // Prevent selecting the same project or invalid projects
    if (!project || project.id === activeProject?.id) {
      return;
    }
    
    // Clear data when switching projects to force reload
    setParsedData(null);
    setActiveProject(project);
  };


  const handleUploadComplete = (project: Project, uploadedData?: ParsedData) => {
    // Hide upload screen first
    setShowUpload(false);
    
    if (uploadedData) {
      // Validate uploaded data before setting
      if (uploadedData.tables && uploadedData.lineages !== undefined && 
          uploadedData.dashboards && uploadedData.dashboardTables !== undefined) {
        setParsedData(uploadedData);
      } else {
        console.warn('Invalid uploaded data structure:', uploadedData);
        setError('Invalid data structure from upload. Please try again.');
        setShowUpload(true);
        return;
      }
    }
    
    // Set active project last (this will trigger useEffect if data isn't already set)
    setActiveProject(project);
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

  const handleLogin = () => {
    setIsAuthenticated(true);
    // initializeApp() will be called automatically by the useEffect when both auth and portal are ready
  };

  const handleNodeDelete = (node: GraphNode) => {
    setTableToDelete(node);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!tableToDelete || !activeProject) return;
    
    try {
      await deleteTable(tableToDelete.id, activeProject.id);
      
      // Update local state
      if (parsedData) {
        const newTables = new Map(parsedData.tables);
        newTables.delete(tableToDelete.id);
        
        const newLineages = parsedData.lineages.filter(
          l => l.sourceTableId !== tableToDelete.id && l.targetTableId !== tableToDelete.id
        );
        
        const newDashboardTables = parsedData.dashboardTables.filter(
          dt => dt.tableId !== tableToDelete.id
        );
        
        setParsedData({
          ...parsedData,
          tables: newTables,
          lineages: newLineages,
          dashboardTables: newDashboardTables
        });
      }
      
      // Clear selection if deleted table was selected
      if (selectedTable?.id === tableToDelete.id) {
        setSelectedTable(null);
      }
      
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    } catch (error) {
      console.error('Failed to delete table:', error);
      alert('Failed to delete table. Please try again.');
    }
  };

  const handleCreateTable = async (newTable: Table, autoConnect?: { node: GraphNode; mode: 'upstream' | 'downstream' }) => {
    if (!activeProject) return;
    
    try {
      await createTable(newTable, activeProject.id);
      
      // Update local state
      if (parsedData) {
        const newTables = new Map(parsedData.tables);
        newTables.set(newTable.id, newTable);
        
        let updatedLineages = parsedData.lineages;
        
        // If auto-connecting to another node
        if (autoConnect) {
          const newLineage: TableLineage = autoConnect.mode === 'upstream' ? {
            sourceTableId: newTable.id,
            targetTableId: autoConnect.node.id,
            sourceTableName: newTable.name,
            targetTableName: autoConnect.node.name
          } : {
            sourceTableId: autoConnect.node.id,
            targetTableId: newTable.id,
            sourceTableName: autoConnect.node.name,
            targetTableName: newTable.name
          };
          
          await createLineage(newLineage, activeProject.id);
          updatedLineages = [...parsedData.lineages, newLineage];
        }
        
        setParsedData({
          ...parsedData,
          tables: newTables,
          lineages: updatedLineages
        });
      }
      
      setCreateDialogOpen(false);
      setCreateConnectionNode(null);
      setCreateConnectionMode(null);
    } catch (error) {
      console.error('Failed to create table:', error);
      alert('Failed to create table. Please try again.');
    }
  };

  const handleNodeAddUpstream = (node: GraphNode) => {
    setCreateConnectionNode(node);
    setCreateConnectionMode('upstream');
    setCreateDialogOpen(true);
  };

  const handleNodeAddDownstream = (node: GraphNode) => {
    setCreateConnectionNode(node);
    setCreateConnectionMode('downstream');
    setCreateDialogOpen(true);
  };


  // Calculate upstream and downstream counts for delete dialog
  const getConnectionCounts = (nodeId: string) => {
    if (!parsedData) return { upstream: 0, downstream: 0 };
    
    const upstream = parsedData.lineages.filter(l => l.targetTableId === nodeId).length;
    const downstream = parsedData.lineages.filter(l => l.sourceTableId === nodeId).length;
    
    return { upstream, downstream };
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <DevLogin onLogin={handleLogin} />;
  }

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
              {activeProject && (
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
            existingProject={activeProject || undefined}
            mode={activeProject ? 'update' : 'create'}
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
            <Button onClick={() => activeProject ? loadProjectData(activeProject.id) : initializeApp()} variant="default">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!parsedData && !showUpload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">No Data Available</h1>
          <p className="text-muted-foreground mb-4">Upload your lineage data to get started</p>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Data
          </Button>
        </div>
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
                {loading ? 'Loading...' : activeProject?.name || 'BigQuery Lineage Visualizer'}
                {isAdmin && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">MEASURELAB ADMIN</span>}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? 'Please wait while we load your project data' : 
                 activeProject?.description || `${parsedData.tables.size} tables • ${parsedData.lineages.length} connections • ${parsedData.dashboards.size} dashboards`}
              </p>
            </div>
            {isSupabaseEnabled && !loading && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                {activeProject ? 'Update Data' : 'Upload Data'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Project Tabs */}
        {isSupabaseEnabled && (
          <div className="border-t">
            <ProjectTabs
              activeProject={activeProject}
              onProjectSelect={handleProjectSelect}
            />
          </div>
        )}
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-[480px]'} bg-muted/10 border-r overflow-y-auto transition-all duration-300 ease-in-out`}>
          
          {!sidebarCollapsed && (
            <div className="p-4 space-y-4">
              <Legend />
              <DashboardView
                parsedData={parsedData}
                selectedDashboard={selectedDashboard}
                onDashboardSelect={(dashboardId) => {
                  setSelectedDashboard(dashboardId);
                  // Update filters to include the selected dashboard
                  setFilters(prev => ({
                    ...prev,
                    selectedDashboard: dashboardId || undefined
                  }));
                }}
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
            
            {/* Loading overlay when switching projects */}
            {loading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading project data...</p>
                </div>
              </div>
            )}
            
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
              onNodeDelete={isSupabaseEnabled && activeProject ? handleNodeDelete : undefined}
              onNodeAddUpstream={isSupabaseEnabled && activeProject ? handleNodeAddUpstream : undefined}
              onNodeAddDownstream={isSupabaseEnabled && activeProject ? handleNodeAddDownstream : undefined}
              highlightedNodes={highlightedNodes}
              focusedNodeId={selectedTable?.id}
            />
            
            {graphData.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground text-lg">No tables match the current filters</p>
                  <Button
                    onClick={() => {
                      setFilters({
                        datasets: [],
                        layers: [],
                        tableTypes: [],
                        showScheduledOnly: false,
                        searchTerm: '',
                        selectedDashboard: undefined
                      });
                      setSelectedDashboard(null);
                      setHighlightedNodes(new Set());
                    }}
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
        
        {/* Delete confirmation dialog */}
        <DeleteConfirmDialog
          table={tableToDelete}
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setTableToDelete(null);
          }}
          onConfirm={confirmDelete}
          upstreamCount={tableToDelete ? getConnectionCounts(tableToDelete.id).upstream : 0}
          downstreamCount={tableToDelete ? getConnectionCounts(tableToDelete.id).downstream : 0}
        />
        
        {/* Create table dialog */}
        <CreateTableDialog
          isOpen={createDialogOpen}
          onClose={() => {
            setCreateDialogOpen(false);
            setCreateConnectionNode(null);
            setCreateConnectionMode(null);
          }}
          onConfirm={handleCreateTable}
          existingTableIds={new Set(parsedData?.tables.keys() || [])}
          connectionNode={createConnectionNode || undefined}
          connectionMode={createConnectionMode || undefined}
        />
      </div>
    </div>
  );
}

function App() {
  return (
    <PortalProvider>
      <AppContent />
    </PortalProvider>
  );
}

export default App;