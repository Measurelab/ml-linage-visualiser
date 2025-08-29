import { useState, useEffect, useMemo } from 'react';
import LineageGraph from './components/LineageGraph';
import DAGLineageGraph from './components/DAGLineageGraph';
import TableDetails from './components/TableDetails';
import SearchFilter from './components/SearchFilter';
import ProjectTabs from './components/ProjectTabs';
import ExcelUpload from './components/ExcelUpload';
import DataUpload from './components/DataUpload';
import DevLogin from './components/DevLogin';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import CreateTableDialog from './components/CreateTableDialog';
import CreateDashboardDialog, { DashboardFormData } from './components/CreateDashboardDialog';
import DashboardDetails from './components/DashboardDetails';
import { PortalProvider, usePortal } from './contexts/PortalContext';
import { loadAndParseData } from './utils/dataParser';
import { loadDataFromSupabaseProject, hasProjectData, deleteTable, createTable, createLineage, createDashboard, createDashboardTable, deleteDashboard, deleteLineage, deleteDashboardTable } from './services/lineageData';
import { getAllProjects, createProject } from './services/projects';
import { isSupabaseEnabled } from './services/supabase';
import { buildGraphData, getUpstreamTables, getDownstreamTables, getTablesByDashboard } from './utils/graphBuilder';
import { ParsedData, FilterOptions, Table, GraphNode, Project, TableLineage, Dashboard, DashboardTable } from './types';
import { Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function AppContent() {
  const { portalName, isLoading: portalLoading, isAdmin } = usePortal();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedDashboardDetails, setSelectedDashboardDetails] = useState<Dashboard | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<'excel' | 'csv'>('excel');
  const [filters, setFilters] = useState<FilterOptions>({
    datasets: [],
    layers: [],
    tableTypes: [],
    showScheduledOnly: false,
    searchTerm: '',
    selectedDashboards: [],
    focusedTableId: undefined,
    focusedDashboardId: undefined
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<GraphNode | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createConnectionNode, setCreateConnectionNode] = useState<GraphNode | null>(null);
  const [createConnectionMode, setCreateConnectionMode] = useState<'upstream' | 'downstream' | null>(null);
  const [createDashboardDialogOpen, setCreateDashboardDialogOpen] = useState(false);
  const [dashboardConnectionNode, setDashboardConnectionNode] = useState<GraphNode | null>(null);
  const [canvasClickPosition, setCanvasClickPosition] = useState<{ x: number; y: number } | null>(null);
  const [layoutMode, setLayoutMode] = useState<'force' | 'dag'>('force');

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
          } catch (_err) {
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
      setSelectedDashboardDetails(null);
      setHighlightedNodes(new Set());
      
      // Only load data if we don't already have it (e.g., from upload)
      if (!parsedData) {
        loadProjectData(activeProject.id);
      }
    } else {
      // No active project - clear everything
      setParsedData(null);
      setSelectedTable(null);
      setSelectedDashboardDetails(null);
      setHighlightedNodes(new Set());
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
    if (!parsedData) return;
    
    if (node.nodeType === 'dashboard') {
      // Check if clicking the same dashboard that's already selected
      const isAlreadySelected = selectedDashboardDetails?.id === node.id;
      
      if (isAlreadySelected) {
        // Clear selection and highlighting
        setSelectedDashboardDetails(null);
        setHighlightedNodes(new Set());
      } else {
        // Dashboard clicked - show dashboard details panel and highlight its connections
        const dashboard = parsedData.dashboards.get(node.id);
        if (dashboard) {
          setSelectedDashboardDetails(dashboard);
          // Clear table selection when showing dashboard details
          setSelectedTable(null);
          
          // Highlight all tables connected to this dashboard AND the dashboard itself
          const connectedTables = getTablesByDashboard(node.id, parsedData);
          const highlightedNodes = new Set(connectedTables);
          highlightedNodes.add(node.id); // Include the dashboard itself
          setHighlightedNodes(highlightedNodes);
        }
      }
    } else {
      // Check if clicking the same table that's already selected
      const isAlreadySelected = selectedTable?.id === node.id;
      
      if (isAlreadySelected) {
        // Clear selection and highlighting
        setSelectedTable(null);
        setHighlightedNodes(new Set());
      } else {
        // Table clicked - show table details and highlight its lineage
        const table = parsedData.tables.get(node.id);
        if (table) {
          setSelectedTable(table);
          // Clear dashboard details when showing table details
          setSelectedDashboardDetails(null);
          
          // Calculate and highlight lineage
          const lineageNodes = new Set<string>();
          lineageNodes.add(node.id); // Include the clicked node
          
          // Add upstream tables
          const upstreamTables = getUpstreamTables(node.id, parsedData);
          upstreamTables.forEach(id => lineageNodes.add(id));
          
          // Add downstream tables
          const downstreamTables = getDownstreamTables(node.id, parsedData);
          downstreamTables.forEach(id => lineageNodes.add(id));
          
          // Add dashboards connected to this table or any tables in its lineage
          parsedData.dashboardTables.forEach(dt => {
            if (lineageNodes.has(dt.tableId)) {
              // Add the dashboard ID to highlighted nodes
              lineageNodes.add(dt.dashboardId);
            }
          });
          
          setHighlightedNodes(lineageNodes);
        }
      }
    }
  };

  const handleFilterToLineage = (node: GraphNode) => {
    if (node.nodeType === 'dashboard') {
      // Filter to show only tables connected to this dashboard
      setFilters(prev => ({
        ...prev,
        focusedDashboardId: prev.focusedDashboardId === node.id ? undefined : node.id,
        focusedTableId: undefined,
        selectedDashboards: []
      }));
    } else {
      // Filter to show only the lineage of this table
      setFilters(prev => ({
        ...prev,
        focusedTableId: prev.focusedTableId === node.id ? undefined : node.id,
        focusedDashboardId: undefined,
        selectedDashboards: []
      }));
    }
  };

  const handleTableSelect = (tableId: string) => {
    const table = parsedData?.tables.get(tableId);
    if (table) {
      setSelectedTable(table);
      // Clear dashboard details when selecting a table
      setSelectedDashboardDetails(null);
      
      // Focus on the selected table's lineage
      setFilters(prev => ({
        ...prev,
        focusedTableId: tableId,
        focusedDashboardId: undefined,
        selectedDashboards: []
      }));
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
      // Delete from database based on node type
      if (tableToDelete.nodeType === 'dashboard') {
        await deleteDashboard(tableToDelete.id, activeProject.id);
      } else {
        await deleteTable(tableToDelete.id, activeProject.id);
      }
      
      // Update local state
      if (parsedData) {
        let updatedData = { ...parsedData };
        
        if (tableToDelete.nodeType === 'dashboard') {
          // Remove dashboard and its table connections
          const newDashboards = new Map(parsedData.dashboards);
          newDashboards.delete(tableToDelete.id);
          
          const newDashboardTables = parsedData.dashboardTables.filter(
            dt => dt.dashboardId !== tableToDelete.id
          );
          
          updatedData = {
            ...updatedData,
            dashboards: newDashboards,
            dashboardTables: newDashboardTables
          };
        } else {
          // Remove table and its relationships
          const newTables = new Map(parsedData.tables);
          newTables.delete(tableToDelete.id);
          
          const newLineages = parsedData.lineages.filter(
            l => l.sourceTableId !== tableToDelete.id && l.targetTableId !== tableToDelete.id
          );
          
          const newDashboardTables = parsedData.dashboardTables.filter(
            dt => dt.tableId !== tableToDelete.id
          );
          
          updatedData = {
            ...updatedData,
            tables: newTables,
            lineages: newLineages,
            dashboardTables: newDashboardTables
          };
        }
        
        setParsedData(updatedData);
      }
      
      // Clear selection if deleted node was selected
      if (selectedTable?.id === tableToDelete.id) {
        setSelectedTable(null);
      }
      if (selectedDashboardDetails?.id === tableToDelete.id) {
        setSelectedDashboardDetails(null);
      }
      
      setDeleteDialogOpen(false);
      setTableToDelete(null);
    } catch (error) {
      console.error(`Failed to delete ${tableToDelete.nodeType}:`, error);
      alert(`Failed to delete ${tableToDelete.nodeType}. Please try again.`);
    }
  };

  const handleCreateTable = async (newTable: Table, autoConnect?: { node: GraphNode; mode: 'upstream' | 'downstream' }) => {
    if (!activeProject) return;
    
    try {
      await createTable(newTable, activeProject.id);
      
      // Update local state
      if (parsedData) {
        const newTables = new Map(parsedData.tables);
        
        // Add canvas position if available
        let tableWithPosition = newTable;
        if (canvasClickPosition) {
          tableWithPosition = {
            ...newTable,
            initialPosition: canvasClickPosition
          } as any; // Type assertion to allow adding position
        }
        
        newTables.set(newTable.id, tableWithPosition);
        
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

        // If connecting to a dashboard
        let updatedDashboardTables = parsedData.dashboardTables;
        if (dashboardConnectionNode && dashboardConnectionNode.nodeType === 'dashboard') {
          const dashboardTable: DashboardTable = {
            dashboardId: dashboardConnectionNode.id,
            tableId: newTable.id,
            dashboardName: dashboardConnectionNode.name,
            tableName: newTable.name
          };
          
          await createDashboardTable(dashboardTable, activeProject.id);
          updatedDashboardTables = [...parsedData.dashboardTables, dashboardTable];
        }
        
        setParsedData({
          ...parsedData,
          tables: newTables,
          lineages: updatedLineages,
          dashboardTables: updatedDashboardTables
        });
      }
      
      setCreateDialogOpen(false);
      setCreateConnectionNode(null);
      setCreateConnectionMode(null);
      setDashboardConnectionNode(null); // Clear dashboard connection
      setCanvasClickPosition(null); // Clear position after use
    } catch (error) {
      console.error('Failed to create table:', error);
      alert('Failed to create table. Please try again.');
    }
  };

  const handleNodeAddUpstream = (node: GraphNode) => {
    console.log('handleNodeAddUpstream called with:', node);
    try {
      setCreateConnectionNode(node);
      setCreateConnectionMode('upstream');
      setCreateDialogOpen(true);
    } catch (error) {
      console.error('Error in handleNodeAddUpstream:', error);
    }
  };

  const handleNodeAddDownstream = (node: GraphNode) => {
    console.log('handleNodeAddDownstream called with:', node);
    try {
      setCreateConnectionNode(node);
      setCreateConnectionMode('downstream');
      setCreateDialogOpen(true);
    } catch (error) {
      console.error('Error in handleNodeAddDownstream:', error);
    }
  };

  const handleDashboardAdd = (node: GraphNode) => {
    console.log('handleDashboardAdd called with:', node);
    try {
      setDashboardConnectionNode(node);
      setCreateDashboardDialogOpen(true);
    } catch (error) {
      console.error('Error in handleDashboardAdd:', error);
    }
  };


  // Connection handlers for existing nodes
  const handleConnectUpstreamTable = async (sourceTableId: string, targetTableId: string) => {
    console.log('handleConnectUpstreamTable:', sourceTableId, '->', targetTableId);
    if (!activeProject || !parsedData) return;
    
    try {
      // Get table names from parsedData
      const sourceTable = parsedData.tables.get(sourceTableId);
      const targetTable = parsedData.tables.get(targetTableId);
      
      if (!sourceTable || !targetTable) {
        console.error('Source or target table not found:', { sourceTableId, targetTableId });
        alert('Unable to find table information. Please try again.');
        return;
      }

      await createLineage({
        sourceTableId,
        targetTableId,
        sourceTableName: sourceTable.name,
        targetTableName: targetTable.name
      }, activeProject.id);
      
      // Reload data to reflect the new connection
      const updatedData = await loadDataFromSupabaseProject(activeProject.id);
      if (updatedData) {
        setParsedData(updatedData);
      }
    } catch (error) {
      console.error('Error connecting upstream table:', error);
      alert('Failed to connect tables. Please try again.');
    }
  };

  const handleConnectDownstreamTable = async (sourceTableId: string, targetTableId: string) => {
    console.log('handleConnectDownstreamTable:', sourceTableId, '->', targetTableId);
    if (!activeProject || !parsedData) return;
    
    try {
      // Get table names from parsedData
      const sourceTable = parsedData.tables.get(sourceTableId);
      const targetTable = parsedData.tables.get(targetTableId);
      
      if (!sourceTable || !targetTable) {
        console.error('Source or target table not found:', { sourceTableId, targetTableId });
        alert('Unable to find table information. Please try again.');
        return;
      }

      await createLineage({
        sourceTableId,
        targetTableId,
        sourceTableName: sourceTable.name,
        targetTableName: targetTable.name
      }, activeProject.id);
      
      // Reload data to reflect the new connection
      const updatedData = await loadDataFromSupabaseProject(activeProject.id);
      if (updatedData) {
        setParsedData(updatedData);
      }
    } catch (error) {
      console.error('Error connecting downstream table:', error);
      alert('Failed to connect tables. Please try again.');
    }
  };

  const handleConnectTableToDashboard = async (tableId: string, dashboardId: string) => {
    console.log('handleConnectTableToDashboard:', tableId, '->', dashboardId);
    if (!activeProject) return;
    
    try {
      // Get table and dashboard names for the relationship
      const table = parsedData?.tables.get(tableId);
      const dashboard = parsedData?.dashboards.get(dashboardId);
      
      await createDashboardTable({
        tableId,
        dashboardId,
        tableName: table?.name || '',
        dashboardName: dashboard?.name || ''
      }, activeProject.id);
      
      // Reload data to reflect the new connection
      const updatedData = await loadDataFromSupabaseProject(activeProject.id);
      if (updatedData) {
        setParsedData(updatedData);
      }
    } catch (error) {
      console.error('Error connecting table to dashboard:', error);
      alert('Failed to connect table to dashboard. Please try again.');
    }
  };

  const handleCanvasCreateTable = (x: number, y: number) => {
    console.log('Canvas create table at:', { x, y });
    setCanvasClickPosition({ x, y });
    setCreateDialogOpen(true);
  };

  const handleTableUpdate = async () => {
    if (!activeProject) return;
    
    try {
      const updatedData = await loadDataFromSupabaseProject(activeProject.id);
      if (updatedData) {
        setParsedData(updatedData);
      }
    } catch (error) {
      console.error('Error reloading data after table update:', error);
    }
  };

  const handleCanvasCreateDashboard = (x: number, y: number) => {
    console.log('Canvas create dashboard at:', { x, y });
    setCanvasClickPosition({ x, y });
    setCreateDashboardDialogOpen(true);
  };

  // Handle disconnecting lineage
  const handleDisconnectUpstream = async (sourceTableId: string, targetTableId: string) => {
    if (!activeProject) return;
    
    try {
      await deleteLineage(sourceTableId, targetTableId, activeProject.id);
      await handleTableUpdate();
    } catch (error) {
      console.error('Error deleting upstream lineage:', error);
    }
  };

  const handleDisconnectDownstream = async (sourceTableId: string, targetTableId: string) => {
    if (!activeProject) return;
    
    try {
      await deleteLineage(sourceTableId, targetTableId, activeProject.id);
      await handleTableUpdate();
    } catch (error) {
      console.error('Error deleting downstream lineage:', error);
    }
  };

  const handleDisconnectDashboard = async (tableId: string, dashboardId: string) => {
    if (!activeProject) return;
    
    try {
      await deleteDashboardTable(tableId, dashboardId, activeProject.id);
      await handleTableUpdate();
    } catch (error) {
      console.error('Error deleting dashboard-table connection:', error);
    }
  };

  const handleCreateDashboard = async (dashboardData: DashboardFormData) => {
    if (!activeProject) return;
    
    try {
      // Generate unique dashboard ID
      const dashboardId = `dashboard_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      
      const newDashboard: Dashboard = {
        id: dashboardId,
        name: dashboardData.name,
        owner: dashboardData.owner || undefined,
        businessArea: dashboardData.businessArea || undefined,
        link: dashboardData.link || undefined
      };
      
      // Create dashboard in database
      await createDashboard(newDashboard, activeProject.id);
      
      // Create dashboard-table connection only if we have a connection node
      let newDashboardTables = parsedData?.dashboardTables || [];
      if (dashboardConnectionNode) {
        const dashboardTable: DashboardTable = {
          dashboardId: dashboardId,
          tableId: dashboardConnectionNode.id,
          dashboardName: newDashboard.name,
          tableName: dashboardConnectionNode.name
        };
        
        await createDashboardTable(dashboardTable, activeProject.id);
        newDashboardTables = [...newDashboardTables, dashboardTable];
      }
      
      // Update local state
      if (parsedData) {
        const newDashboards = new Map(parsedData.dashboards);
        
        // Add canvas position if available
        let dashboardWithPosition = newDashboard;
        if (canvasClickPosition) {
          dashboardWithPosition = {
            ...newDashboard,
            initialPosition: canvasClickPosition
          } as any; // Type assertion to allow adding position
        }
        
        newDashboards.set(dashboardId, dashboardWithPosition);
        
        setParsedData({
          ...parsedData,
          dashboards: newDashboards,
          dashboardTables: newDashboardTables
        });
      }
      
      setCreateDashboardDialogOpen(false);
      setDashboardConnectionNode(null);
      setCanvasClickPosition(null); // Clear position after use
    } catch (error) {
      console.error('Failed to create dashboard:', error);
      alert('Failed to create dashboard. Please try again.');
    }
  };


  // Calculate upstream and downstream counts for delete dialog
  const getConnectionCounts = (nodeId: string) => {
    if (!parsedData) return { upstream: 0, downstream: 0 };
    
    const upstream = parsedData.lineages.filter(l => l.targetTableId === nodeId).length;
    const downstream = parsedData.lineages.filter(l => l.sourceTableId === nodeId).length;
    
    return { upstream, downstream };
  };

  const handleCreateBlankProject = async () => {
    if (!isSupabaseEnabled) {
      alert('Supabase is required for creating blank projects');
      return;
    }

    try {
      setLoading(true);
      
      // Create a new blank project
      const newProject = await createProject({
        name: `Blank Project ${new Date().toISOString().split('T')[0]}`,
        description: 'New empty lineage project - start adding your nodes!',
        portal_name: portalName?.toLowerCase() === 'measurelab' ? undefined : (portalName || undefined)
      });

      // Set up empty data structure
      const emptyData: ParsedData = {
        tables: new Map(),
        lineages: [],
        dashboards: new Map(),
        dashboardTables: []
      };

      // Set the project as active with empty data
      setParsedData(emptyData);
      setActiveProject(newProject);
      setShowUpload(false);
      
    } catch (error) {
      console.error('Failed to create blank project:', error);
      alert('Failed to create blank project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProjects = () => {
    // Navigate back to project selection interface
    setShowUpload(false);
    setActiveProject(null);  // This will trigger the ProjectTabs interface
    setParsedData(null);
    setError(null);
    setLoading(false);
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
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCreateBlankProject}
              >
                Create blank project
              </Button>
              <Button
                variant="outline"
                onClick={handleBackToProjects}
              >
                Back to projects
              </Button>
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

  // Show project selection interface when no active project and Supabase is enabled
  if (!activeProject && !showUpload && isSupabaseEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-medium">BigQuery Lineage Visualizer</h1>
                {isAdmin && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">MEASURELAB ADMIN</span>}
                <p className="text-sm text-muted-foreground mt-1">
                  Select a project to view its lineage data
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Create New Project
              </Button>
            </div>
          </div>
          
          {/* Project Tabs */}
          <div className="border-t">
            <ProjectTabs
              activeProject={activeProject}
              onProjectSelect={handleProjectSelect}
            />
          </div>
        </header>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-medium mb-2">Select a project to get started</h2>
            <p className="text-muted-foreground">Choose a project from the tabs above or create a new one</p>
          </div>
        </div>
      </div>
    );
  }

  // Show "No Data Available" only for non-Supabase environments or when data is missing for an active project
  if (!parsedData && !showUpload && (!isSupabaseEnabled || activeProject)) {
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
        <div className="flex-1 flex flex-col">
          <div className="p-4 bg-card">
            <SearchFilter
              parsedData={parsedData}
              filters={filters}
              onFiltersChange={setFilters}
              onTableHighlight={setHighlightedNodes}
            />
          </div>

          <div className="flex-1 relative bg-muted/5">
            
            {/* Layout Mode Selector and Data Count */}
            <div className="absolute top-4 left-4 z-20 flex gap-3 items-center">
              <div className="flex gap-1 bg-card border rounded-lg p-1 shadow-sm">
                <Button
                  variant={layoutMode === 'force' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayoutMode('force')}
                  className="text-xs h-8 px-3"
                >
                  Force Layout
                </Button>
                <Button
                  variant={layoutMode === 'dag' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayoutMode('dag')}
                  className="text-xs h-8 px-3"
                >
                  DAG Layout
                </Button>
              </div>
              
              {/* Data Count Display */}
              {(() => {
                if (!graphData) return null;
                
                const hasActiveFilters = 
                  filters.datasets.length > 0 ||
                  filters.layers.length > 0 ||
                  filters.tableTypes.length > 0 ||
                  filters.showScheduledOnly ||
                  filters.searchTerm !== '' ||
                  (filters.selectedDashboards && filters.selectedDashboards.length > 0) ||
                  filters.focusedTableId ||
                  filters.focusedDashboardId;
                
                const tableCount = graphData.nodes.filter(n => n.nodeType === 'table').length;
                const dashboardCount = graphData.nodes.filter(n => n.nodeType === 'dashboard').length;
                const connectionCount = graphData.links.length;
                
                return (
                  <div className="bg-card border rounded-lg px-3 py-2 shadow-sm">
                    <div className="text-xs text-muted-foreground font-semibold">
                      {hasActiveFilters ? 'Filtered view: ' : 'Total: '}
                      <span className="text-foreground">{tableCount} tables</span>
                      {dashboardCount > 0 && <>, <span className="text-foreground">{dashboardCount} dashboards</span></>}
                      , <span className="text-foreground">{connectionCount} connections</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            
            {/* Loading overlay when switching projects */}
            {loading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading project data...</p>
                </div>
              </div>
            )}
            
            {/* Conditional Graph Rendering */}
            {layoutMode === 'force' ? (
              <LineageGraph
                data={graphData}
                onNodeClick={handleNodeClick}
                onFilterToLineage={handleFilterToLineage}
                onNodeDelete={isSupabaseEnabled && activeProject ? handleNodeDelete : undefined}
                onNodeAddUpstream={isSupabaseEnabled && activeProject ? handleNodeAddUpstream : undefined}
                onNodeAddDownstream={isSupabaseEnabled && activeProject ? handleNodeAddDownstream : undefined}
                onDashboardAdd={isSupabaseEnabled && activeProject ? handleDashboardAdd : undefined}
                onCanvasCreateTable={isSupabaseEnabled && activeProject ? handleCanvasCreateTable : undefined}
                onCanvasCreateDashboard={isSupabaseEnabled && activeProject ? handleCanvasCreateDashboard : undefined}
                highlightedNodes={highlightedNodes}
                focusedNodeId={filters.focusedTableId || filters.focusedDashboardId}
              />
            ) : (
              <DAGLineageGraph
                data={graphData}
                onNodeClick={handleNodeClick}
                onFilterToLineage={handleFilterToLineage}
                onNodeDelete={isSupabaseEnabled && activeProject ? handleNodeDelete : undefined}
                onNodeAddUpstream={isSupabaseEnabled && activeProject ? handleNodeAddUpstream : undefined}
                onNodeAddDownstream={isSupabaseEnabled && activeProject ? handleNodeAddDownstream : undefined}
                onDashboardAdd={isSupabaseEnabled && activeProject ? handleDashboardAdd : undefined}
                onCanvasCreateTable={isSupabaseEnabled && activeProject ? handleCanvasCreateTable : undefined}
                onCanvasCreateDashboard={isSupabaseEnabled && activeProject ? handleCanvasCreateDashboard : undefined}
                highlightedNodes={highlightedNodes}
                focusedNodeId={filters.focusedTableId || filters.focusedDashboardId}
              />
            )}
            
            {graphData.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {/* Check if this is truly empty or just filtered */}
                  {parsedData && parsedData.tables.size === 0 ? (
                    // Truly empty project
                    <div>
                      <p className="text-muted-foreground text-lg mb-4">Your lineage is empty</p>
                      <p className="text-sm text-muted-foreground mb-6">Start by adding your first table or dashboard node</p>
                      {isSupabaseEnabled && activeProject && (
                        <div className="flex gap-2 justify-center">
                          <Button
                            onClick={() => setCreateDialogOpen(true)}
                            className="shadow-md"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Add first table
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Filtered out
                    <div>
                      <p className="text-muted-foreground text-lg">No tables match the current filters</p>
                      <Button
                        onClick={() => {
                          setFilters({
                            datasets: [],
                            layers: [],
                            tableTypes: [],
                            showScheduledOnly: false,
                            searchTerm: '',
                            selectedDashboards: [],
                            focusedTableId: undefined,
                            focusedDashboardId: undefined
                          });
                          setHighlightedNodes(new Set());
                        }}
                        variant="link"
                        className="mt-2"
                      >
                        Clear filters
                      </Button>
                    </div>
                  )}
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
          onConnectUpstream={isSupabaseEnabled && activeProject ? handleConnectUpstreamTable : undefined}
          onConnectDownstream={isSupabaseEnabled && activeProject ? handleConnectDownstreamTable : undefined}
          onConnectDashboard={isSupabaseEnabled && activeProject ? handleConnectTableToDashboard : undefined}
          onDisconnectUpstream={isSupabaseEnabled && activeProject ? handleDisconnectUpstream : undefined}
          onDisconnectDownstream={isSupabaseEnabled && activeProject ? handleDisconnectDownstream : undefined}
          onDisconnectDashboard={isSupabaseEnabled && activeProject ? handleDisconnectDashboard : undefined}
          onTableUpdate={handleTableUpdate}
          activeProjectId={activeProject?.id}
        />

        <DashboardDetails
          dashboard={selectedDashboardDetails}
          parsedData={parsedData}
          isOpen={!!selectedDashboardDetails}
          onClose={() => setSelectedDashboardDetails(null)}
          onTableSelect={handleTableSelect}
          onConnectTable={isSupabaseEnabled && activeProject ? handleConnectTableToDashboard : undefined}
          onDisconnectTable={isSupabaseEnabled && activeProject ? handleDisconnectDashboard : undefined}
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
          connectionNode={createConnectionNode || dashboardConnectionNode || undefined}
          connectionMode={createConnectionMode || (dashboardConnectionNode ? 'downstream' : undefined)}
        />
        
        {/* Create dashboard dialog */}
        <CreateDashboardDialog
          isOpen={createDashboardDialogOpen}
          onClose={() => {
            setCreateDashboardDialogOpen(false);
            setDashboardConnectionNode(null);
          }}
          onConfirm={handleCreateDashboard}
          sourceNode={dashboardConnectionNode}
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