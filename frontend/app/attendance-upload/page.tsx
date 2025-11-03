'use client';

import { useState, useRef } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AttendanceUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    recordsLoaded?: number;
    dateRange?: { start: string; end: string };
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
      const result = await apiClient.uploadAttendance(file);
      setUploadResult({
        success: true,
        message: result.message,
        recordsLoaded: result.records_loaded,
        dateRange: result.date_range,
      });
      toast.success(`Successfully uploaded ${result.records_loaded} attendance records`);
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <ProtectedRoute>
      <AdminRoute>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Upload Attendance Data</CardTitle>
              <CardDescription className="mt-2">
                Upload a weekly attendance Excel file to add attendance records to the database
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
                        Attendance Excel files only (.xlsx, .xls)
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
                    {uploadResult.success && uploadResult.dateRange && (
                      <span className="block mt-1 text-sm">
                        Date range: {formatDate(uploadResult.dateRange.start)} to {formatDate(uploadResult.dateRange.end)}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-pulse" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Attendance File
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/attendance'}
                >
                  View Attendance
                </Button>
              </div>

              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Upload Instructions</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Upload a weekly attendance Excel file (Monday to Friday)</li>
                      <li>The file should contain swipe in/out times and work hours</li>
                      <li>Records will be added to the database (not replaced)</li>
                      <li>Make sure employee IDs match existing employees in the system</li>
                    </ul>
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

