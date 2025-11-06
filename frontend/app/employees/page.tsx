'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { apiClient, type Employee } from '@/lib/api';
import { toast } from 'sonner';
import { EmployeeDialog } from '@/components/employee-dialog';
import { Upload, Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { getCachedAdminStatus } from '@/lib/admin-cache';

const ITEMS_PER_PAGE = 20;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [verticalFilter, setVerticalFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [exceptionFilter, setExceptionFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Filter options (fetch all employees once to populate dropdowns)
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // Debounce search query (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all employees once to populate filter options
  useEffect(() => {
    // Only fetch if user is confirmed admin (AdminRoute should prevent rendering, but add safeguard)
    const adminStatus = getCachedAdminStatus();
    if (adminStatus !== true) {
      return; // Don't fetch if we know user is not admin or status is not yet determined
    }
    
    const fetchAllEmployees = async () => {
      try {
        // Fetch without any filters to get all unique values
        // Use max page size (200) and fetch all pages
        const response = await apiClient.getEmployees(1, 200, undefined, undefined, undefined, undefined);
        let allEmps = [...response.employees];
        
        // If there are more pages, fetch them too
        if (response.total_pages > 1) {
          for (let page = 2; page <= response.total_pages; page++) {
            const pageResponse = await apiClient.getEmployees(page, 200, undefined, undefined, undefined, undefined);
            allEmps.push(...pageResponse.employees);
          }
        }
        setAllEmployees(allEmps);
      } catch (error) {
        // Silently fail if user is not admin (AdminRoute will redirect)
        const currentAdminStatus = getCachedAdminStatus();
        if (currentAdminStatus !== true) {
          return;
        }
        console.error('Failed to fetch all employees for filter options:', error);
      }
    };
    fetchAllEmployees();
  }, []);

  // Compute filter options from all employees
  const verticalOptions = useMemo(() => {
    const set = new Set<string>();
    allEmployees.forEach((e) => { if (e.vertical) set.add(e.vertical); });
    return ['All', ...Array.from(set).sort()];
  }, [allEmployees]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    allEmployees.forEach((e) => { if (e.status) set.add(e.status); });
    return ['All', ...Array.from(set).sort()];
  }, [allEmployees]);

  const exceptionOptions = useMemo(() => {
    const set = new Set<string>();
    let hasDefault = false;
    allEmployees.forEach((e) => {
      const ex = (e.exception ?? '').trim();
      if (ex === '') {
        hasDefault = true;
      } else {
        set.add(ex);
      }
    });
    const list: string[] = ['All'];
    if (hasDefault) list.push('default');
    return [...list, ...Array.from(set).sort()];
  }, [allEmployees]);

  const fetchEmployees = async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.getEmployees(
        pageNum,
        ITEMS_PER_PAGE,
        debouncedSearchQuery.trim() || undefined,
        verticalFilter !== 'All' ? verticalFilter : undefined,
        statusFilter !== 'All' ? statusFilter : undefined,
        exceptionFilter !== 'All' ? exceptionFilter : undefined
      );
      setEmployees(response.employees);
      setTotalEmployees(response.total);
      setTotalPages(response.total_pages);
      setCurrentPage(pageNum);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is confirmed admin (AdminRoute should prevent rendering, but add safeguard)
    const adminStatus = getCachedAdminStatus();
    if (adminStatus !== true) {
      return; // Don't fetch if we know user is not admin or status is not yet determined
    }
    
    setCurrentPage(1);
    fetchEmployees(1);
  }, [debouncedSearchQuery, verticalFilter, statusFilter, exceptionFilter]);

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await apiClient.deleteEmployee(employeeId);
      toast.success('Employee deleted successfully');
      fetchEmployees(currentPage);
      // Refresh filter options
      const response = await apiClient.getEmployees(1, 200, undefined, undefined, undefined, undefined);
      const allEmps = [...response.employees];
      if (response.total_pages > 1) {
        for (let page = 2; page <= response.total_pages; page++) {
          const pageResponse = await apiClient.getEmployees(page, 200, undefined, undefined, undefined, undefined);
          allEmps.push(...pageResponse.employees);
        }
      }
      setAllEmployees(allEmps);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    fetchEmployees(currentPage);
    // Refresh filter options
    apiClient.getEmployees(1, 200, undefined, undefined, undefined, undefined).then(async response => {
      const allEmps = [...response.employees];
      if (response.total_pages > 1) {
        for (let page = 2; page <= response.total_pages; page++) {
          const pageResponse = await apiClient.getEmployees(page, 200, undefined, undefined, undefined, undefined);
          allEmps.push(...pageResponse.employees);
        }
      }
      setAllEmployees(allEmps);
    }).catch(error => {
      console.error('Failed to refresh filter options:', error);
    });
  };

  return (
    <ProtectedRoute>
      <AdminRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                    Employees
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Manage employee records ({employees.length} of {totalEmployees} total)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.href = '/upload'} className="h-11 border-2">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Excel
                  </Button>
                  <Button onClick={handleCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Employee
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search + Filters */}
              <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="employee-search">Search</Label>
                  <div className="relative h-11">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                    <Input
                      id="employee-search"
                      type="text"
                      placeholder="Employee ID or Name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 w-full text-sm py-2"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Vertical</Label>
                  <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {verticalOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label>Exception</Label>
                <Select value={exceptionFilter} onValueChange={setExceptionFilter}>
                    <SelectTrigger className="h-11 w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                    {exceptionOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    <p className="text-sm text-muted-foreground font-medium">Loading employees...</p>
                  </div>
                </div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="relative mb-4">
                    <Users className="h-16 w-16 text-muted-foreground/40" />
                    <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                  </div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? 'No employees found matching your search' : 'No employees found'}
                  </h4>
                  {!searchQuery && (
                    <Button onClick={handleCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Employee
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Reporting Manager Name</TableHead>
                          <TableHead>Vertical Head Name</TableHead>
                          <TableHead>Vertical</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Exception</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee.employee_id}>
                            <TableCell className="font-medium">{employee.employee_id}</TableCell>
                            <TableCell>{employee.employee_name}</TableCell>
                            <TableCell>{employee.reporting_manager_name || '-'}</TableCell>
                            <TableCell>{employee.vertical_head_name || '-'}</TableCell>
                            <TableCell>{employee.vertical || '-'}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  employee.status === 'Active'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                }`}
                              >
                                {employee.status || '-'}
                              </span>
                            </TableCell>
                            <TableCell>{employee.exception || '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(employee)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(employee.employee_id)}
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
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalEmployees)} of {totalEmployees} employees
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.max(1, currentPage - 1);
                            setCurrentPage(newPage);
                            fetchEmployees(newPage);
                          }}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Page {currentPage} of {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newPage = Math.min(totalPages, currentPage + 1);
                            setCurrentPage(newPage);
                            fetchEmployees(newPage);
                          }}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <EmployeeDialog
          open={isDialogOpen}
          onClose={handleDialogClose}
          employee={editingEmployee}
        />
      </div>
      </AdminRoute>
    </ProtectedRoute>
  );
}

