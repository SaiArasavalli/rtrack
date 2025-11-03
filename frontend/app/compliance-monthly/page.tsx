'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { Navbar } from '@/components/layout/navbar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiClient, type MonthlyComplianceResponse, type MonthlyComplianceEmployee, type MonthlyComplianceMonth } from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, XCircle, Loader2, Search } from 'lucide-react';

export default function MonthlyCompliancePage() {
  const [compliance, setCompliance] = useState<MonthlyComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
  const [status, setStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadCompliance();
  }, [year, status]);

  const loadCompliance = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMonthlyCompliance(year, status === 'All' ? undefined : status);
      setCompliance(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load monthly compliance records';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case 'Compliant':
        return (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Compliant
          </span>
        );
      case 'Not Compliant':
        return (
          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Not Compliant
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Status filter options
  const statuses = ['All', 'Active', 'Inactive'];

  // Filter employees based on search query
  const filteredEmployees = compliance?.employees.filter((employee) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      employee.employee_id.toLowerCase().includes(query) ||
      employee.employee_name.toLowerCase().includes(query) ||
      (employee.reporting_manager_name && employee.reporting_manager_name.toLowerCase().includes(query)) ||
      (employee.vertical_head_name && employee.vertical_head_name.toLowerCase().includes(query)) ||
      (employee.vertical && employee.vertical.toLowerCase().includes(query))
    );
  }) || [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl font-bold">Monthly Compliance</CardTitle>
                  <CardDescription className="mt-2">
                    Employee compliance tracking by month
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Total: {compliance?.total || 0} employees
                    {searchQuery && filteredEmployees.length !== compliance?.employees.length && (
                      <span className="ml-2">(showing {filteredEmployees.length} filtered)</span>
                    )}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Field */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search employees by ID, name, reporting manager, vertical head, or vertical..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select
                    value={year?.toString() || ''}
                    onValueChange={(value) => setYear(value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={loadCompliance} variant="outline">
                  Refresh
                </Button>
                <Button 
                  onClick={() => window.location.href = '/compliance-monthly-calculate'}
                  variant="default"
                >
                  Calculate New
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : !compliance || compliance.employees.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">No monthly compliance records found.</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">No employees match your search criteria.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Current Employee Section (for non-admin users) */}
                  {compliance.current_employee && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                        My Compliance
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Employee Name</TableHead>
                              {compliance.months.map((month) => (
                                <TableHead key={month.key} className="text-left min-w-[150px]">
                                  {month.label}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-mono text-sm">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="underline decoration-dotted">
                                        {compliance.current_employee.employee_id}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-md">
                                      <div className="space-y-1 text-sm">
                                        <p className="font-semibold text-base mb-2">Employee Details</p>
                                        <div className="border-t pt-1 space-y-1">
                                          <p><span className="font-medium">Employee ID:</span> {compliance.current_employee.employee_id}</p>
                                          <p><span className="font-medium">Employee Name:</span> {compliance.current_employee.employee_name}</p>
                                          {compliance.current_employee.reporting_manager_id && (
                                            <p><span className="font-medium">Reporting Manager ID:</span> {compliance.current_employee.reporting_manager_id}</p>
                                          )}
                                          {compliance.current_employee.reporting_manager_name && (
                                            <p><span className="font-medium">Reporting Manager Name:</span> {compliance.current_employee.reporting_manager_name}</p>
                                          )}
                                          {compliance.current_employee.vertical_head_id && (
                                            <p><span className="font-medium">Vertical Head ID:</span> {compliance.current_employee.vertical_head_id}</p>
                                          )}
                                          {compliance.current_employee.vertical_head_name && (
                                            <p><span className="font-medium">Vertical Head Name:</span> {compliance.current_employee.vertical_head_name}</p>
                                          )}
                                          {compliance.current_employee.vertical && (
                                            <p><span className="font-medium">Vertical:</span> {compliance.current_employee.vertical}</p>
                                          )}
                                          {compliance.current_employee.status && (
                                            <p><span className="font-medium">Status:</span> {compliance.current_employee.status}</p>
                                          )}
                                          {compliance.current_employee.exception && (
                                            <p><span className="font-medium">Exception:</span> {compliance.current_employee.exception}</p>
                                          )}
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell>{compliance.current_employee.employee_name}</TableCell>
                              {compliance.months.map((month) => {
                                const monthKey = month.key;
                                const monthData = compliance.current_employee!.months[monthKey];
                                
                                return (
                                  <TableCell key={month.key} className="text-left">
                                    {monthData ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div>
                                              {getComplianceBadge(monthData.compliance_status)}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <div className="space-y-1 text-sm">
                                              <p className="font-semibold">{monthData.compliance_status}</p>
                                              <div className="border-t pt-1 space-y-0.5">
                                                <p>Days Present: {monthData.total_days_present.toFixed(1)} / {monthData.monthly_days}</p>
                                                <p>Hours Worked: {monthData.total_hours_worked.toFixed(2)} / {monthData.monthly_hours}</p>
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Reportees Section (for non-admin users) or All Employees (for admin) */}
                  {((compliance.reportees && compliance.reportees.length > 0) || (!compliance.current_employee && filteredEmployees.length > 0)) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                        {compliance.current_employee ? 'Reportees Compliance' : 'All Employees'}
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee ID</TableHead>
                              <TableHead>Employee Name</TableHead>
                              {compliance.months.map((month) => (
                                <TableHead key={month.key} className="text-left min-w-[150px]">
                                  {month.label}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(compliance.reportees || filteredEmployees).map((employee) => (
                              <TableRow key={employee.employee_id}>
                                <TableCell className="font-mono text-sm">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="underline decoration-dotted">
                                          {employee.employee_id}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-md">
                                        <div className="space-y-1 text-sm">
                                          <p className="font-semibold text-base mb-2">Employee Details</p>
                                          <div className="border-t pt-1 space-y-1">
                                            <p><span className="font-medium">Employee ID:</span> {employee.employee_id}</p>
                                            <p><span className="font-medium">Employee Name:</span> {employee.employee_name}</p>
                                            {employee.reporting_manager_id && (
                                              <p><span className="font-medium">Reporting Manager ID:</span> {employee.reporting_manager_id}</p>
                                            )}
                                            {employee.reporting_manager_name && (
                                              <p><span className="font-medium">Reporting Manager Name:</span> {employee.reporting_manager_name}</p>
                                            )}
                                            {employee.vertical_head_id && (
                                              <p><span className="font-medium">Vertical Head ID:</span> {employee.vertical_head_id}</p>
                                            )}
                                            {employee.vertical_head_name && (
                                              <p><span className="font-medium">Vertical Head Name:</span> {employee.vertical_head_name}</p>
                                            )}
                                            {employee.vertical && (
                                              <p><span className="font-medium">Vertical:</span> {employee.vertical}</p>
                                            )}
                                            {employee.status && (
                                              <p><span className="font-medium">Status:</span> {employee.status}</p>
                                            )}
                                            {employee.exception && (
                                              <p><span className="font-medium">Exception:</span> {employee.exception}</p>
                                            )}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </TableCell>
                                <TableCell>{employee.employee_name}</TableCell>
                                {compliance.months.map((month) => {
                                  const monthKey = month.key;
                                  const monthData = employee.months[monthKey];
                                  
                                  return (
                                    <TableCell key={month.key} className="text-left">
                                      {monthData ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div>
                                                {getComplianceBadge(monthData.compliance_status)}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <div className="space-y-1 text-sm">
                                                <p className="font-semibold">{monthData.compliance_status}</p>
                                                <div className="border-t pt-1 space-y-0.5">
                                                  <p>Days Present: {monthData.total_days_present.toFixed(1)} / {monthData.monthly_days}</p>
                                                  <p>Hours Worked: {monthData.total_hours_worked.toFixed(2)} / {monthData.monthly_hours}</p>
                                                </div>
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

