'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    recordsLoaded?: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = selectedFile.name
        .substring(selectedFile.name.lastIndexOf('.'))
        .toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      const result = await apiClient.uploadExcel(file);
      setUploadResult({
        success: true,
        message: result.message,
        recordsLoaded: result.records_loaded,
      });
      toast.success(`Successfully uploaded ${result.records_loaded} records`);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const validExtensions = ['.xlsx', '.xls'];
      const fileExtension = droppedFile.name
        .substring(droppedFile.name.lastIndexOf('.'))
        .toLowerCase();

      if (!validExtensions.includes(fileExtension)) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }

      setFile(droppedFile);
      setUploadResult(null);
    }
  };

  return (
    <ProtectedRoute>
      <AdminRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
          <Card className="max-w-2xl mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                Upload Employee Data
              </CardTitle>
              <CardDescription className="mt-2 text-base">
                Upload an Excel file to replace all existing employee records in the database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  file
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                {file ? (
                  <div className="space-y-4">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                    <div>
                      <p className="text-lg font-medium text-green-700 dark:text-green-300">
                        {file.name}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                    >
                      Remove File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FileSpreadsheet className="mx-auto h-12 w-12 text-slate-400" />
                    <div>
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                      >
                        <span className="font-medium">Click to upload</span> or drag and drop
                      </label>
                      <p className="text-sm text-slate-500 mt-2">
                        Excel files only (.xlsx, .xls)
                      </p>
                    </div>
                  </div>
                )}
                <label htmlFor="file-upload" className="hidden">
                  Upload file
                </label>
              </div>

              {uploadResult && (
                <Alert
                  variant={uploadResult.success ? 'default' : 'destructive'}
                  className={uploadResult.success ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : ''}
                >
                  {uploadResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription className={uploadResult.success ? 'text-green-800 dark:text-green-200' : ''}>
                    {uploadResult.message}
                    {uploadResult.success && uploadResult.recordsLoaded !== undefined && (
                      <span className="block mt-1 font-medium">
                        {uploadResult.recordsLoaded} records loaded successfully
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
                >
                  {uploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Excel File
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/employees')}
                  className="h-11 border-2"
                >
                  View Employees
                </Button>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Important Notice</p>
                    <p>
                      Uploading a new Excel file will <strong>delete all existing employee records</strong> and replace them with the data from the uploaded file.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </AdminRoute>
    </ProtectedRoute>
  );
}

