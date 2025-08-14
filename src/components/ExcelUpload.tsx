import React, { useState } from 'react';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseExcelFile, generateExampleExcel, ExcelParseResult } from '../utils/excelParser';
import { importParsedData } from '../services/lineageData';

interface ExcelUploadProps {
  onUploadComplete: () => void;
  isSupabaseEnabled: boolean;
}

const ExcelUpload: React.FC<ExcelUploadProps> = ({ onUploadComplete, isSupabaseEnabled }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setUploadError(null);
    setParseResult(null);
    
    // Parse the Excel file
    const result = await parseExcelFile(uploadedFile);
    setParseResult(result);
    
    if (!result.success) {
      setUploadError(result.errors.join(', '));
    }
  };

  const handleGenerateVisualization = async () => {
    if (!parseResult?.data) {
      setUploadError('Please upload a valid Excel file');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await importParsedData(parseResult.data);
      onUploadComplete();
    } catch (error) {
      setUploadError(`Failed to import data: ${error}`);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    generateExampleExcel();
  };

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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Upload Lineage Data</h1>
        <p className="text-muted-foreground">
          Upload a single Excel file containing all your lineage data across 4 sheets
        </p>
      </div>

      {uploadError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Excel File Upload</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx) with the following sheets: Tables, Lineage, Dashboards, Dashboard_Mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* File Upload Zone */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload" className="cursor-pointer">
                {file ? (
                  <div>
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-primary" />
                    <p className="font-medium text-lg">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-lg font-medium mb-1">Click to upload Excel file</p>
                    <p className="text-sm text-muted-foreground">or drag and drop</p>
                  </div>
                )}
              </label>
            </div>

            {/* Download Template Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Excel Template
              </Button>
            </div>

            {/* Sheet Status */}
            {parseResult && (
              <div className="space-y-3">
                <h3 className="font-medium">Sheet Status:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <SheetStatus 
                    name="Tables" 
                    info={parseResult.sheetInfo.tables}
                  />
                  <SheetStatus 
                    name="Lineage" 
                    info={parseResult.sheetInfo.lineage}
                  />
                  <SheetStatus 
                    name="Dashboards" 
                    info={parseResult.sheetInfo.dashboards}
                  />
                  <SheetStatus 
                    name="Dashboard Mappings" 
                    info={parseResult.sheetInfo.mappings}
                  />
                </div>
              </div>
            )}

            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Required Excel Structure:</strong>
                <ul className="mt-2 ml-4 list-disc text-sm">
                  <li><strong>Sheet 1 - Tables:</strong> Table metadata (ID, name, dataset, layer, type)</li>
                  <li><strong>Sheet 2 - Lineage:</strong> Table relationships (source → target)</li>
                  <li><strong>Sheet 3 - Dashboards:</strong> Dashboard information</li>
                  <li><strong>Sheet 4 - Dashboard_Mappings:</strong> Dashboard to table connections</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleGenerateVisualization}
          disabled={!parseResult?.success || uploading}
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

// Sheet status component
const SheetStatus: React.FC<{ 
  name: string; 
  info: { found: boolean; rowCount: number } 
}> = ({ name, info }) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      info.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div>
        <p className="font-medium text-sm">{name}</p>
        {info.found && (
          <p className="text-xs text-muted-foreground">{info.rowCount} rows</p>
        )}
      </div>
      {info.found ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <AlertCircle className="h-5 w-5 text-red-600" />
      )}
    </div>
  );
};

export default ExcelUpload;