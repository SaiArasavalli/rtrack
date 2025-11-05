'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Navbar } from '@/components/layout/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient, type Exception } from '@/lib/api';
import { toast } from 'sonner';
import { ExceptionDialog } from '@/components/exception-dialog';
import { Plus, Edit, Trash2, AlertCircle, RefreshCw } from 'lucide-react';

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingException, setEditingException] = useState<Exception | null>(null);

  useEffect(() => {
    fetchExceptions();
  }, []);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getExceptions();
      setExceptions(response.exceptions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch exceptions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (exceptionId: number) => {
    if (!confirm('Are you sure you want to delete this exception?')) return;

    try {
      await apiClient.deleteException(exceptionId);
      toast.success('Exception deleted successfully');
      fetchExceptions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete exception');
    }
  };

  const handleEdit = (exception: Exception) => {
    setEditingException(exception);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingException(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingException(null);
    fetchExceptions();
  };

  const handlePopulate = async () => {
    if (!confirm('This will populate exceptions from existing employee records. Continue?')) return;

    try {
      const result = await apiClient.populateExceptions();
      toast.success(
        `Populated ${result.created} exception(s). ${result.skipped} skipped (already exist or invalid format).`
      );
      fetchExceptions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to populate exceptions');
    }
  };

  return (
    <ProtectedRoute>
      <AdminRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
          <Navbar />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                      Exceptions
                    </CardTitle>
                    <CardDescription className="mt-2 text-base">
                      Manage employee exceptions ({exceptions.length} total). Format: {'{period}_{number}_day'} or special: default, other
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handlePopulate}
                      variant="outline"
                      className="border-2 h-11"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Populate from Employees
                    </Button>
                    <Button 
                      onClick={handleCreate}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Exception
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      <p className="text-sm text-muted-foreground font-medium">Loading exceptions...</p>
                    </div>
                  </div>
                ) : exceptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-4">
                      <AlertCircle className="h-16 w-16 text-muted-foreground/40" />
                      <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">No exceptions found</h4>
                    <p className="text-sm text-muted-foreground mb-6">
                      Create your first exception to get started
                    </p>
                    <Button 
                      onClick={handleCreate}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Exception
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Exception Name</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exceptions.map((exception) => (
                          <TableRow key={exception.id}>
                            <TableCell className="font-medium font-mono">{exception.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(exception)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(exception.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <ExceptionDialog
              open={isDialogOpen}
              onClose={handleDialogClose}
              exception={editingException}
            />
          </div>
        </div>
      </AdminRoute>
    </ProtectedRoute>
  );
}

