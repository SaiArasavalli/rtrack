'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Navbar } from '@/components/layout/navbar';
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
import { Upload, Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [verticalFilter, setVerticalFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [exceptionFilter, setExceptionFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getEmployees();
      // Sort by ID descending (newest first)
      const sortedEmployees = [...response.employees].sort((a, b) => {
        const idA = a.id ?? 0;
        const idB = b.id ?? 0;
        return idB - idA;
      });
      setEmployees(sortedEmployees);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // Compute filter options
  const verticalOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => { if (e.vertical) set.add(e.vertical); });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => { if (e.status) set.add(e.status); });
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  const exceptionOptions = useMemo(() => {
    const set = new Set<string>();
    let hasDefault = false;
    employees.forEach((e) => {
      const ex = (e.exception ?? '').trim();
      if (ex === '') {
        hasDefault = true;
      } else {
        set.add(ex);
      }
    });
    const list: string[] = ['All'];
    if (hasDefault) list.push('Default');
    return [...list, ...Array.from(set).sort()];
  }, [employees]);

  // Filter employees based on search and dropdowns
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return employees.filter((emp) => {
      const matchesSearch = !query
        || emp.employee_id?.toLowerCase().includes(query)
        || emp.employee_name?.toLowerCase().includes(query);

      const matchesVertical = verticalFilter === 'All' || (emp.vertical ?? '') === verticalFilter;
      const matchesStatus = statusFilter === 'All' || (emp.status ?? '') === statusFilter;
      const empException = (emp.exception ?? '').trim();
      const matchesException = (
        exceptionFilter === 'All' ||
        (exceptionFilter === 'Default' && empException === '') ||
        empException === exceptionFilter
      );

      return matchesSearch && matchesVertical && matchesStatus && matchesException;
    });
  }, [employees, searchQuery, verticalFilter, statusFilter, exceptionFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search/filters change
  }, [searchQuery, verticalFilter, statusFilter, exceptionFilter]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await apiClient.deleteEmployee(employeeId);
      toast.success('Employee deleted successfully');
      fetchEmployees();
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
    fetchEmployees();
  };

  return (
    <ProtectedRoute>
      <AdminRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold">Employees</CardTitle>
                  <CardDescription className="mt-2">
                    Manage employee records ({filteredEmployees.length} of {employees.length} total)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.href = '/upload'}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Excel
                  </Button>
                  <Button onClick={handleCreate}>
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="employee-search"
                      type="text"
                      placeholder="Employee ID or Name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11 w-full"
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
                  <div className="text-slate-500">Loading employees...</div>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-slate-500 mb-4">
                    {searchQuery ? 'No employees found matching your search' : 'No employees found'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={handleCreate}>
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
                        {paginatedEmployees.map((employee) => (
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
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredEmployees.length)} of {filteredEmployees.length} employees
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
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

