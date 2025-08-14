import React, { useState } from 'react';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseTablesCSV, parseLineageCSV, parseDashboardsCSV, parseDashboardTablesCSV } from '../utils/dataParser';
import { importParsedData } from '../services/lineageData';
import { ParsedData } from '../types';

interface DataUploadProps {
  onUploadComplete: () => void;
  isSupabaseEnabled: boolean;
}

interface FileUploadState {
  file: File | null;
  content: string | null;
  isValid: boolean;
  error: string | null;
  rowCount: number;
}

const DataUpload: React.FC<DataUploadProps> = ({ onUploadComplete, isSupabaseEnabled }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [tablesFile, setTablesFile] = useState<FileUploadState>({ 
    file: null, content: null, isValid: false, error: null, rowCount: 0 
  });
  const [lineageFile, setLineageFile] = useState<FileUploadState>({ 
    file: null, content: null, isValid: false, error: null, rowCount: 0 
  });
  const [dashboardsFile, setDashboardsFile] = useState<FileUploadState>({ 
    file: null, content: null, isValid: false, error: null, rowCount: 0 
  });
  const [mappingsFile, setMappingsFile] = useState<FileUploadState>({ 
    file: null, content: null, isValid: false, error: null, rowCount: 0 
  });

  const handleFileUpload = async (
    file: File, 
    type: 'tables' | 'lineage' | 'dashboards' | 'mappings'
  ) => {
    const content = await file.text();
    
    let state: FileUploadState = {
      file,
      content,
      isValid: false,
      error: null,
      rowCount: 0
    };

    try {
      // Validate by attempting to parse
      switch (type) {
        case 'tables': {
          const tables = parseTablesCSV(content);
          state.isValid = tables.size > 0;
          state.rowCount = tables.size;
          if (!state.isValid) state.error = 'No valid tables found';
          setTablesFile(state);
          break;
        }
        case 'lineage': {
          const lineages = parseLineageCSV(content);
          state.isValid = lineages.length > 0;
          state.rowCount = lineages.length;
          if (!state.isValid) state.error = 'No valid lineage relationships found';
          setLineageFile(state);
          break;
        }
        case 'dashboards': {
          const dashboards = parseDashboardsCSV(content);
          state.isValid = dashboards.size > 0;
          state.rowCount = dashboards.size;
          if (!state.isValid) state.error = 'No valid dashboards found';
          setDashboardsFile(state);
          break;
        }
        case 'mappings': {
          const mappings = parseDashboardTablesCSV(content);
          state.isValid = mappings.length > 0;
          state.rowCount = mappings.length;
          if (!state.isValid) state.error = 'No valid dashboard-table mappings found';
          setMappingsFile(state);
          break;
        }
      }
    } catch (error) {
      state.error = `Failed to parse CSV: ${error}`;
      state.isValid = false;
      
      switch (type) {
        case 'tables': setTablesFile(state); break;
        case 'lineage': setLineageFile(state); break;
        case 'dashboards': setDashboardsFile(state); break;
        case 'mappings': setMappingsFile(state); break;
      }
    }
  };

  const handleGenerateVisualization = async () => {
    if (!tablesFile.content || !lineageFile.content || 
        !dashboardsFile.content || !mappingsFile.content) {
      setUploadError('Please upload all 4 CSV files');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const parsedData: ParsedData = {
        tables: parseTablesCSV(tablesFile.content),
        lineages: parseLineageCSV(lineageFile.content),
        dashboards: parseDashboardsCSV(dashboardsFile.content),
        dashboardTables: parseDashboardTablesCSV(mappingsFile.content)
      };

      await importParsedData(parsedData);
      onUploadComplete();
    } catch (error) {
      setUploadError(`Failed to import data: ${error}`);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const downloadExampleCSV = (type: 'tables' | 'lineage' | 'dashboards' | 'mappings') => {
    let content = '';
    let filename = '';

    switch (type) {
      case 'tables':
        filename = 'example_tables.csv';
        content = `Table_ID,Table_Name,Dataset/CustomQuery,Layer,Table_Type,Scheduled Query,Link,Description
TBL001,users,analytics,Raw,Table,No,https://example.com/tables/users,User data table
TBL002,orders,analytics,Raw,Table,Yes,https://example.com/tables/orders,Order transactions
TBL003,user_orders,analytics,Inter,View,No,,Join of users and orders
TBL004,revenue_dashboard,analytics,Target,Query,No,,Revenue metrics for dashboard`;
        break;
      case 'lineage':
        filename = 'example_lineage.csv';
        content = `datasets,Source_Table_ID,Target_Table_Name,Source_Table_Name
TBL003,TBL001,user_orders,users
TBL003,TBL002,user_orders,orders
TBL004,TBL003,revenue_dashboard,user_orders`;
        break;
      case 'dashboards':
        filename = 'example_dashboards.csv';
        content = `Dashboard_ID,Dashboard_Name,Link,Owner,Business_Area
DASH001,Revenue Analytics,https://example.com/dashboards/revenue,John Doe,Finance
DASH002,User Metrics,https://example.com/dashboards/users,Jane Smith,Product`;
        break;
      case 'mappings':
        filename = 'example_dashboard_tables.csv';
        content = `Dashboard ID,Table ID,Dashboard_Name,Table_Name
DASH001,TBL004,Revenue Analytics,revenue_dashboard
DASH002,TBL003,User Metrics,user_orders`;
        break;
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allFilesValid = tablesFile.isValid && lineageFile.isValid && 
                        dashboardsFile.isValid && mappingsFile.isValid;

  if (!isSupabaseEnabled) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Supabase is not configured. Using static CSV files from the public folder.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Upload Lineage Data</h1>
        <p className="text-muted-foreground">
          Upload your 4 CSV files to generate the lineage visualization. 
          Download example files to see the required format.
        </p>
      </div>

      {uploadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Tables Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tables CSV</span>
              {tablesFile.isValid && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Upload your tables metadata (ID, name, dataset, layer, type)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'tables')}
                  className="hidden"
                  id="tables-upload"
                />
                <label htmlFor="tables-upload" className="cursor-pointer">
                  {tablesFile.file ? (
                    <div>
                      <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">{tablesFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tablesFile.rowCount} tables found
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>Click to upload Tables CSV</p>
                    </div>
                  )}
                </label>
              </div>
              {tablesFile.error && (
                <Alert variant="destructive">
                  <AlertDescription>{tablesFile.error}</AlertDescription>
                </Alert>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExampleCSV('tables')}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Example
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lineage Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lineage CSV</span>
              {lineageFile.isValid && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Upload table relationships (source → target connections)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'lineage')}
                  className="hidden"
                  id="lineage-upload"
                />
                <label htmlFor="lineage-upload" className="cursor-pointer">
                  {lineageFile.file ? (
                    <div>
                      <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">{lineageFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lineageFile.rowCount} relationships found
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>Click to upload Lineage CSV</p>
                    </div>
                  )}
                </label>
              </div>
              {lineageFile.error && (
                <Alert variant="destructive">
                  <AlertDescription>{lineageFile.error}</AlertDescription>
                </Alert>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExampleCSV('lineage')}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Example
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dashboards Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dashboards CSV</span>
              {dashboardsFile.isValid && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Upload dashboard metadata (ID, name, owner, business area)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'dashboards')}
                  className="hidden"
                  id="dashboards-upload"
                />
                <label htmlFor="dashboards-upload" className="cursor-pointer">
                  {dashboardsFile.file ? (
                    <div>
                      <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">{dashboardsFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {dashboardsFile.rowCount} dashboards found
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>Click to upload Dashboards CSV</p>
                    </div>
                  )}
                </label>
              </div>
              {dashboardsFile.error && (
                <Alert variant="destructive">
                  <AlertDescription>{dashboardsFile.error}</AlertDescription>
                </Alert>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExampleCSV('dashboards')}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Example
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard-Table Mappings Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dashboard Mappings CSV</span>
              {mappingsFile.isValid && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </CardTitle>
            <CardDescription>
              Upload dashboard-to-table mappings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'mappings')}
                  className="hidden"
                  id="mappings-upload"
                />
                <label htmlFor="mappings-upload" className="cursor-pointer">
                  {mappingsFile.file ? (
                    <div>
                      <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">{mappingsFile.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {mappingsFile.rowCount} mappings found
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>Click to upload Mappings CSV</p>
                    </div>
                  )}
                </label>
              </div>
              {mappingsFile.error && (
                <Alert variant="destructive">
                  <AlertDescription>{mappingsFile.error}</AlertDescription>
                </Alert>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExampleCSV('mappings')}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Example
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGenerateVisualization}
          disabled={!allFilesValid || uploading}
          className="min-w-[200px]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing Data...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Generate Visualization
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DataUpload;