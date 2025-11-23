'use client';

import { useState, useRef, useEffect } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/confirmation-dialog';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Calendar, Clock, Users, FileText, Trash2 } from 'lucide-react';

export default function AttendancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    recordsLoaded?: number;
    dateRange?: { start: string; end: string };
  } | null>(null);
  const [lastUploadInfo, setLastUploadInfo] = useState<{
    has_upload: boolean;
    week_start?: string;
    week_end?: string;
    week_number?: number;
    year?: number;
    date_range?: { start: string; end: string };
    records_count?: number;
    employees_count?: number;
    uploaded_at?: string;
    message?: string;
  } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLastUploadInfo();
  }, []);

  const loadLastUploadInfo = async () => {
    try {
      setLoadingInfo(true);
      const info = await apiClient.getLastUploadInfo();
      setLastUploadInfo(info);
    } catch (error) {
      console.error('Failed to load last upload info:', error);
    } finally {
      setLoadingInfo(false);
    }
  };

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
      // Reload last upload info after successful upload
      await loadLastUploadInfo();
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

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      const result = await apiClient.deleteAllAttendance();
      toast.success(result.message);
      // Reload last upload info after deletion
      await loadLastUploadInfo();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete attendance records');
    } finally {
      setDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <Card className="max-w-2xl mx-auto border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-8 w-8 text-blue-600" />
                      <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                        Attendance
                      </CardTitle>
                    </div>
                    <CardDescription className="mt-2 text-base">
                      Upload a weekly attendance Excel file to add attendance records to the database
                    </CardDescription>
                  </div>
                  {lastUploadInfo?.has_upload && (
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="h-10"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!loadingInfo && lastUploadInfo && (
                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3 mb-4">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Last Upload Information
                          </h3>
                          {lastUploadInfo.has_upload ? (
                            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    <span className="font-medium">Week:</span> W{lastUploadInfo.week_number} ({lastUploadInfo.year})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    <span className="font-medium">Date Range:</span>{' '}
                                    {formatDate(lastUploadInfo.date_range!.start)} - {formatDate(lastUploadInfo.date_range!.end)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <span>
                                    <span className="font-medium">Records:</span> {lastUploadInfo.records_count}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span>
                                    <span className="font-medium">Employees:</span> {lastUploadInfo.employees_count}
                                  </span>
                                </div>
                              </div>
                              {lastUploadInfo.uploaded_at && (
                                <div className="text-xs text-blue-600 dark:text-blue-300 mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                                  Uploaded: {new Date(lastUploadInfo.uploaded_at).toLocaleString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {lastUploadInfo.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
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

                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
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
        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Attendance Records"
          description="Are you sure you want to delete all attendance records? This action cannot be undone and will permanently remove all attendance data from the database."
          confirmText="Delete All"
          cancelText="Cancel"
          variant="destructive"
        />
      </AdminRoute>
    </ProtectedRoute>
  );
}

