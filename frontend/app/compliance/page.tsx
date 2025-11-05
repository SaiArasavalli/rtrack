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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient, type ComplianceResponse, type ComplianceEmployee, type ComplianceWeek, type MonthlyComplianceResponse, type MonthlyComplianceEmployee, type MonthlyComplianceMonth, type QuarterlyComplianceResponse, type QuarterlyComplianceEmployee, type QuarterlyComplianceQuarter } from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Loader2, Search } from 'lucide-react';
import { CalculateDialog } from '@/components/calculate-dialog';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type ComplianceType = 'weekly' | 'monthly' | 'quarterly';

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<ComplianceType>('weekly');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // Weekly compliance state
  const [weeklyCompliance, setWeeklyCompliance] = useState<ComplianceResponse | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyYear, setWeeklyYear] = useState<number | undefined>(new Date().getFullYear());
  const [weeklyMonth, setWeeklyMonth] = useState<number | undefined>(new Date().getMonth() + 1);
  const [weeklyStatus, setWeeklyStatus] = useState<string>('All');
  const [weeklySearchQuery, setWeeklySearchQuery] = useState<string>('');

  // Monthly compliance state
  const [monthlyCompliance, setMonthlyCompliance] = useState<MonthlyComplianceResponse | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyYear, setMonthlyYear] = useState<number | undefined>(new Date().getFullYear());
  const [monthlyStatus, setMonthlyStatus] = useState<string>('All');
  const [monthlySearchQuery, setMonthlySearchQuery] = useState<string>('');

  // Quarterly compliance state
  const [quarterlyCompliance, setQuarterlyCompliance] = useState<QuarterlyComplianceResponse | null>(null);
  const [quarterlyLoading, setQuarterlyLoading] = useState(true);
  const [quarterlyYear, setQuarterlyYear] = useState<number | undefined>(new Date().getFullYear());
  const [quarterlyStatus, setQuarterlyStatus] = useState<string>('All');
  const [quarterlySearchQuery, setQuarterlySearchQuery] = useState<string>('');

  // Calculate dialog state
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [calculateDialogType, setCalculateDialogType] = useState<'monthly' | 'quarterly'>('monthly');

  // Load data based on active tab
  useEffect(() => {
    // fetch current user to decide admin-only actions visibility
    (async () => {
      try {
        const me = await apiClient.getCurrentUser();
        setIsAdmin(!!me.is_admin);
      } catch {
        setIsAdmin(false);
      }
    })();

    if (activeTab === 'weekly') {
      loadWeeklyCompliance();
    } else if (activeTab === 'monthly') {
      loadMonthlyCompliance();
    } else if (activeTab === 'quarterly') {
      loadQuarterlyCompliance();
    }
  }, [activeTab, weeklyYear, weeklyMonth, weeklyStatus, monthlyYear, monthlyStatus, quarterlyYear, quarterlyStatus]);

  const loadWeeklyCompliance = async () => {
    try {
      setWeeklyLoading(true);
      const data = await apiClient.getCompliance(weeklyYear, weeklyMonth, weeklyStatus === 'All' ? undefined : weeklyStatus);
      setWeeklyCompliance(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load weekly compliance records';
      toast.error(errorMessage);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const loadMonthlyCompliance = async () => {
    try {
      setMonthlyLoading(true);
      const data = await apiClient.getMonthlyCompliance(monthlyYear, monthlyStatus === 'All' ? undefined : monthlyStatus);
      setMonthlyCompliance(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load monthly compliance records';
      toast.error(errorMessage);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const loadQuarterlyCompliance = async () => {
    try {
      setQuarterlyLoading(true);
      const data = await apiClient.getQuarterlyCompliance(quarterlyYear, quarterlyStatus === 'All' ? undefined : quarterlyStatus);
      setQuarterlyCompliance(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load quarterly compliance records';
      toast.error(errorMessage);
    } finally {
      setQuarterlyLoading(false);
    }
  };

  const handleCalculateMonthly = () => {
    setCalculateDialogType('monthly');
    setCalculateDialogOpen(true);
  };

  const handleCalculateQuarterly = () => {
    setCalculateDialogType('quarterly');
    setCalculateDialogOpen(true);
  };

  const handleCalculate = async (year: number, value: number) => {
    try {
      if (calculateDialogType === 'monthly') {
        const res = await apiClient.calculateMonthlyCompliance(year, value);
        toast.success(`${res.message}. Calculated: ${res.records_calculated}`);
        setActiveTab('monthly');
        await loadMonthlyCompliance();
      } else {
        const res = await apiClient.calculateQuarterlyCompliance(year, value);
        toast.success(`${res.message}. Calculated: ${res.records_calculated}`);
        setActiveTab('quarterly');
        await loadQuarterlyCompliance();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : `Failed to calculate ${calculateDialogType} compliance`;
      toast.error(msg);
      throw e;
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
      case 'No Data':
        return (
          <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <AlertCircle className="h-3 w-3" />
            No Data
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getWeekKey = (week: ComplianceWeek): string => {
    if ('key_str' in week && typeof (week as any).key_str === 'string') {
      return (week as any).key_str;
    }
    return `${week.week_start}_${week.week_end}_${week.week_number}`;
  };

  const statuses = ['All', 'Active', 'Inactive'];

  // Filter functions
  const filterWeeklyEmployees = (employees: ComplianceEmployee[]) => {
    if (!weeklySearchQuery.trim()) return employees;
    const query = weeklySearchQuery.toLowerCase();
    return employees.filter((employee) => (
      employee.employee_id.toLowerCase().includes(query) ||
      employee.employee_name.toLowerCase().includes(query) ||
      (employee.reporting_manager_name && employee.reporting_manager_name.toLowerCase().includes(query)) ||
      (employee.vertical_head_name && employee.vertical_head_name.toLowerCase().includes(query)) ||
      (employee.vertical && employee.vertical.toLowerCase().includes(query))
    ));
  };

  const filterMonthlyEmployees = (employees: MonthlyComplianceEmployee[]) => {
    if (!monthlySearchQuery.trim()) return employees;
    const query = monthlySearchQuery.toLowerCase();
    return employees.filter((employee) => (
      employee.employee_id.toLowerCase().includes(query) ||
      employee.employee_name.toLowerCase().includes(query) ||
      (employee.reporting_manager_name && employee.reporting_manager_name.toLowerCase().includes(query)) ||
      (employee.vertical_head_name && employee.vertical_head_name.toLowerCase().includes(query)) ||
      (employee.vertical && employee.vertical.toLowerCase().includes(query))
    ));
  };

  const filterQuarterlyEmployees = (employees: QuarterlyComplianceEmployee[]) => {
    if (!quarterlySearchQuery.trim()) return employees;
    const query = quarterlySearchQuery.toLowerCase();
    return employees.filter((employee) => (
      employee.employee_id.toLowerCase().includes(query) ||
      employee.employee_name.toLowerCase().includes(query) ||
      (employee.reporting_manager_name && employee.reporting_manager_name.toLowerCase().includes(query)) ||
      (employee.vertical_head_name && employee.vertical_head_name.toLowerCase().includes(query)) ||
      (employee.vertical && employee.vertical.toLowerCase().includes(query))
    ));
  };

  const renderEmployeeTooltip = (employee: ComplianceEmployee | MonthlyComplianceEmployee | QuarterlyComplianceEmployee) => (
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
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
        <Navbar />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
                    Compliance
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Employee compliance tracking by week, month, and quarter
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ComplianceType)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                </TabsList>

                {/* Weekly Compliance Tab */}
                <TabsContent value="weekly" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Total: {weeklyCompliance?.total || 0} employees
                      {weeklySearchQuery && filterWeeklyEmployees(weeklyCompliance?.employees || []).length !== weeklyCompliance?.employees.length && (
                        <span className="ml-2">(showing {filterWeeklyEmployees(weeklyCompliance?.employees || []).length} filtered)</span>
                      )}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search employees by ID, name, reporting manager, vertical head, or vertical..."
                      value={weeklySearchQuery}
                      onChange={(e) => setWeeklySearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Year</label>
                      <Select
                        value={weeklyYear?.toString() || ''}
                        onValueChange={(value) => setWeeklyYear(value ? parseInt(value) : undefined)}
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
                      <label className="text-sm font-medium mb-2 block">Month</label>
                      <Select
                        value={weeklyMonth?.toString() || ''}
                        onValueChange={(value) => setWeeklyMonth(value ? parseInt(value) : undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthNames.map((name, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={weeklyStatus} onValueChange={setWeeklyStatus}>
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
                    <Button onClick={loadWeeklyCompliance} variant="outline" className="h-11 border-2">
                      Refresh
                    </Button>
                  </div>

                  {weeklyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground font-medium">Loading compliance data...</p>
                      </div>
                    </div>
                  ) : !weeklyCompliance || weeklyCompliance.employees.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <CheckCircle2 className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No weekly compliance records found</h4>
                    </div>
                  ) : filterWeeklyEmployees(weeklyCompliance.employees).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <Search className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No employees match your search criteria</h4>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {weeklyCompliance.current_employee && (
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
                                  {weeklyCompliance.weeks.map((week) => (
                                    <TableHead key={getWeekKey(week)} className="text-left min-w-[150px]">
                                      {week.label}
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
                                            {weeklyCompliance.current_employee.employee_id}
                                          </span>
                                        </TooltipTrigger>
                                        {renderEmployeeTooltip(weeklyCompliance.current_employee)}
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                  <TableCell>{weeklyCompliance.current_employee.employee_name}</TableCell>
                                  {weeklyCompliance.weeks.map((week) => {
                                    const weekKey = getWeekKey(week);
                                    const weekData = weeklyCompliance.current_employee!.weeks[weekKey];
                                    
                                    return (
                                      <TableCell key={getWeekKey(week)} className="text-left">
                                        {weekData ? (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div>
                                                  {getComplianceBadge(weekData.compliance_status)}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent className="max-w-xs">
                                                <div className="space-y-1 text-sm">
                                                  <p className="font-semibold">{weekData.compliance_status}</p>
                                                  <div className="border-t pt-1 space-y-0.5">
                                                    <p>Days Present: {weekData.total_days_present.toFixed(1)} / {weekData.weekly_days}</p>
                                                    <p>Hours Worked: {weekData.total_hours_worked.toFixed(2)} / {weekData.weekly_hours}</p>
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

                      {((weeklyCompliance.reportees && weeklyCompliance.reportees.length > 0) || (!weeklyCompliance.current_employee && filterWeeklyEmployees(weeklyCompliance.employees).length > 0)) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            {weeklyCompliance.current_employee ? 'Reportees Compliance' : 'All Employees'}
                          </h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Employee ID</TableHead>
                                  <TableHead>Employee Name</TableHead>
                                  {weeklyCompliance.weeks.map((week) => (
                                    <TableHead key={getWeekKey(week)} className="text-left min-w-[150px]">
                                      {week.label}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(weeklyCompliance.reportees || filterWeeklyEmployees(weeklyCompliance.employees)).map((employee) => (
                                  <TableRow key={employee.employee_id}>
                                    <TableCell className="font-mono text-sm">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="underline decoration-dotted">
                                              {employee.employee_id}
                                            </span>
                                          </TooltipTrigger>
                                          {renderEmployeeTooltip(employee)}
                                        </Tooltip>
                                      </TooltipProvider>
                                    </TableCell>
                                    <TableCell>{employee.employee_name}</TableCell>
                                    {weeklyCompliance.weeks.map((week) => {
                                      const weekKey = getWeekKey(week);
                                      const weekData = employee.weeks[weekKey];
                                      
                                      return (
                                        <TableCell key={getWeekKey(week)} className="text-left">
                                          {weekData ? (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div>
                                                    {getComplianceBadge(weekData.compliance_status)}
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                  <div className="space-y-1 text-sm">
                                                    <p className="font-semibold">{weekData.compliance_status}</p>
                                                    <div className="border-t pt-1 space-y-0.5">
                                                      <p>Days Present: {weekData.total_days_present.toFixed(1)} / {weekData.weekly_days}</p>
                                                      <p>Hours Worked: {weekData.total_hours_worked.toFixed(2)} / {weekData.weekly_hours}</p>
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
                </TabsContent>

                {/* Monthly Compliance Tab */}
                <TabsContent value="monthly" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Total: {monthlyCompliance?.total || 0} employees
                      {monthlySearchQuery && filterMonthlyEmployees(monthlyCompliance?.employees || []).length !== monthlyCompliance?.employees.length && (
                        <span className="ml-2">(showing {filterMonthlyEmployees(monthlyCompliance?.employees || []).length} filtered)</span>
                      )}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search employees by ID, name, reporting manager, vertical head, or vertical..."
                      value={monthlySearchQuery}
                      onChange={(e) => setMonthlySearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Year</label>
                      <Select
                        value={monthlyYear?.toString() || ''}
                        onValueChange={(value) => setMonthlyYear(value ? parseInt(value) : undefined)}
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
                      <Select value={monthlyStatus} onValueChange={setMonthlyStatus}>
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
                    <Button onClick={loadMonthlyCompliance} variant="outline" className="h-11 border-2">
                      Refresh
                    </Button>
                    {isAdmin && (
                      <Button 
                        onClick={handleCalculateMonthly}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
                      >
                        Calculate New
                      </Button>
                    )}
                  </div>

                  {monthlyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground font-medium">Loading compliance data...</p>
                      </div>
                    </div>
                  ) : !monthlyCompliance || monthlyCompliance.employees.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <CheckCircle2 className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No monthly compliance records found</h4>
                    </div>
                  ) : filterMonthlyEmployees(monthlyCompliance.employees).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <Search className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No employees match your search criteria</h4>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {monthlyCompliance.current_employee && (
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
                                  {monthlyCompliance.months.map((month) => (
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
                                            {monthlyCompliance.current_employee.employee_id}
                                          </span>
                                        </TooltipTrigger>
                                        {renderEmployeeTooltip(monthlyCompliance.current_employee)}
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                  <TableCell>{monthlyCompliance.current_employee.employee_name}</TableCell>
                                  {monthlyCompliance.months.map((month) => {
                                    const monthKey = month.key;
                                    const monthData = monthlyCompliance.current_employee!.months[monthKey];
                                    
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

                      {((monthlyCompliance.reportees && monthlyCompliance.reportees.length > 0) || (!monthlyCompliance.current_employee && filterMonthlyEmployees(monthlyCompliance.employees).length > 0)) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            {monthlyCompliance.current_employee ? 'Reportees Compliance' : 'All Employees'}
                          </h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Employee ID</TableHead>
                                  <TableHead>Employee Name</TableHead>
                                  {monthlyCompliance.months.map((month) => (
                                    <TableHead key={month.key} className="text-left min-w-[150px]">
                                      {month.label}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(monthlyCompliance.reportees || filterMonthlyEmployees(monthlyCompliance.employees)).map((employee) => (
                                  <TableRow key={employee.employee_id}>
                                    <TableCell className="font-mono text-sm">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="underline decoration-dotted">
                                              {employee.employee_id}
                                            </span>
                                          </TooltipTrigger>
                                          {renderEmployeeTooltip(employee)}
                                        </Tooltip>
                                      </TooltipProvider>
                                    </TableCell>
                                    <TableCell>{employee.employee_name}</TableCell>
                                    {monthlyCompliance.months.map((month) => {
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
                </TabsContent>

                {/* Quarterly Compliance Tab */}
                <TabsContent value="quarterly" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Total: {quarterlyCompliance?.total || 0} employees
                      {quarterlySearchQuery && filterQuarterlyEmployees(quarterlyCompliance?.employees || []).length !== quarterlyCompliance?.employees.length && (
                        <span className="ml-2">(showing {filterQuarterlyEmployees(quarterlyCompliance?.employees || []).length} filtered)</span>
                      )}
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search employees by ID, name, reporting manager, vertical head, or vertical..."
                      value={quarterlySearchQuery}
                      onChange={(e) => setQuarterlySearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Year</label>
                      <Select
                        value={quarterlyYear?.toString() || ''}
                        onValueChange={(value) => setQuarterlyYear(value ? parseInt(value) : undefined)}
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
                      <Select value={quarterlyStatus} onValueChange={setQuarterlyStatus}>
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
                    <Button onClick={loadQuarterlyCompliance} variant="outline" className="h-11 border-2">
                      Refresh
                    </Button>
                    {isAdmin && (
                      <Button 
                        onClick={handleCalculateQuarterly}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
                      >
                        Calculate New
                      </Button>
                    )}
                  </div>

                  {quarterlyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground font-medium">Loading compliance data...</p>
                      </div>
                    </div>
                  ) : !quarterlyCompliance || quarterlyCompliance.employees.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <CheckCircle2 className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No quarterly compliance records found</h4>
                    </div>
                  ) : filterQuarterlyEmployees(quarterlyCompliance.employees).length === 0 ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <Search className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No employees match your search criteria</h4>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {quarterlyCompliance.current_employee && (
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
                                  {quarterlyCompliance.quarters.map((quarter) => (
                                    <TableHead key={quarter.key} className="text-left min-w-[150px]">
                                      {quarter.label}
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
                                            {quarterlyCompliance.current_employee.employee_id}
                                          </span>
                                        </TooltipTrigger>
                                        {renderEmployeeTooltip(quarterlyCompliance.current_employee)}
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                  <TableCell>{quarterlyCompliance.current_employee.employee_name}</TableCell>
                                  {quarterlyCompliance.quarters.map((quarter) => {
                                    const quarterKey = quarter.key;
                                    const quarterData = quarterlyCompliance.current_employee!.quarters[quarterKey];
                                    
                                    return (
                                      <TableCell key={quarter.key} className="text-left">
                                        {quarterData ? (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <div>
                                                  {getComplianceBadge(quarterData.compliance_status)}
                                                </div>
                                              </TooltipTrigger>
                                              <TooltipContent className="max-w-xs">
                                                <div className="space-y-1 text-sm">
                                                  <p className="font-semibold">{quarterData.compliance_status}</p>
                                                  <div className="border-t pt-1 space-y-0.5">
                                                    <p>Days Present: {quarterData.total_days_present.toFixed(1)} / {quarterData.quarterly_days}</p>
                                                    <p>Hours Worked: {quarterData.total_hours_worked.toFixed(2)} / {quarterData.quarterly_hours}</p>
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

                      {((quarterlyCompliance.reportees && quarterlyCompliance.reportees.length > 0) || (!quarterlyCompliance.current_employee && filterQuarterlyEmployees(quarterlyCompliance.employees).length > 0)) && (
                        <div>
                          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            {quarterlyCompliance.current_employee ? 'Reportees Compliance' : 'All Employees'}
                          </h3>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Employee ID</TableHead>
                                  <TableHead>Employee Name</TableHead>
                                  {quarterlyCompliance.quarters.map((quarter) => (
                                    <TableHead key={quarter.key} className="text-left min-w-[150px]">
                                      {quarter.label}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(quarterlyCompliance.reportees || filterQuarterlyEmployees(quarterlyCompliance.employees)).map((employee) => (
                                  <TableRow key={employee.employee_id}>
                                    <TableCell className="font-mono text-sm">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span className="underline decoration-dotted">
                                              {employee.employee_id}
                                            </span>
                                          </TooltipTrigger>
                                          {renderEmployeeTooltip(employee)}
                                        </Tooltip>
                                      </TooltipProvider>
                                    </TableCell>
                                    <TableCell>{employee.employee_name}</TableCell>
                                    {quarterlyCompliance.quarters.map((quarter) => {
                                      const quarterKey = quarter.key;
                                      const quarterData = employee.quarters[quarterKey];
                                      
                                      return (
                                        <TableCell key={quarter.key} className="text-left">
                                          {quarterData ? (
                                            <TooltipProvider>
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <div>
                                                    {getComplianceBadge(quarterData.compliance_status)}
                                                  </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs">
                                                  <div className="space-y-1 text-sm">
                                                    <p className="font-semibold">{quarterData.compliance_status}</p>
                                                    <div className="border-t pt-1 space-y-0.5">
                                                      <p>Days Present: {quarterData.total_days_present.toFixed(1)} / {quarterData.quarterly_days}</p>
                                                      <p>Hours Worked: {quarterData.total_hours_worked.toFixed(2)} / {quarterData.quarterly_hours}</p>
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <CalculateDialog
            open={calculateDialogOpen}
            onOpenChange={setCalculateDialogOpen}
            type={calculateDialogType}
            year={calculateDialogType === 'monthly' ? (monthlyYear ?? new Date().getFullYear()) : (quarterlyYear ?? new Date().getFullYear())}
            onCalculate={handleCalculate}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
