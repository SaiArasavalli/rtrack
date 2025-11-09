'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
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
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient, type ComplianceResponse, type ComplianceEmployee, type ComplianceWeek, type MonthlyComplianceResponse, type MonthlyComplianceEmployee, type MonthlyComplianceMonth, type QuarterlyComplianceResponse, type QuarterlyComplianceEmployee, type QuarterlyComplianceQuarter } from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, XCircle, AlertCircle, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { CalculateDialog } from '@/components/calculate-dialog';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type ComplianceType = 'weekly' | 'monthly' | 'quarterly';

const ITEMS_PER_PAGE = 20;

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<ComplianceType>('weekly');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // Weekly compliance state
  const [weeklyCompliance, setWeeklyCompliance] = useState<ComplianceResponse | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyYear, setWeeklyYear] = useState<number | undefined>(new Date().getFullYear());
  const [weeklyMonth, setWeeklyMonth] = useState<number | undefined>(new Date().getMonth() + 1);
  const [weeklyStatus, setWeeklyStatus] = useState<string>('All');
  const [weeklyException, setWeeklyException] = useState<string>('All');
  const [weeklySearchQuery, setWeeklySearchQuery] = useState<string>('');
  const [weeklyPage, setWeeklyPage] = useState(1);
  const [weeklyTotalPages, setWeeklyTotalPages] = useState(0);

  // Monthly compliance state
  const [monthlyCompliance, setMonthlyCompliance] = useState<MonthlyComplianceResponse | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [monthlyYear, setMonthlyYear] = useState<number | undefined>(new Date().getFullYear());
  const [monthlyStatus, setMonthlyStatus] = useState<string>('All');
  const [monthlyException, setMonthlyException] = useState<string>('All');
  const [monthlySearchQuery, setMonthlySearchQuery] = useState<string>('');
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [monthlyTotalPages, setMonthlyTotalPages] = useState(0);

  // Quarterly compliance state
  const [quarterlyCompliance, setQuarterlyCompliance] = useState<QuarterlyComplianceResponse | null>(null);
  const [quarterlyLoading, setQuarterlyLoading] = useState(true);
  const [quarterlyYear, setQuarterlyYear] = useState<number | undefined>(new Date().getFullYear());
  const [quarterlyStatus, setQuarterlyStatus] = useState<string>('All');
  const [quarterlyException, setQuarterlyException] = useState<string>('All');
  const [quarterlySearchQuery, setQuarterlySearchQuery] = useState<string>('');
  const [quarterlyPage, setQuarterlyPage] = useState(1);
  const [quarterlyTotalPages, setQuarterlyTotalPages] = useState(0);
  
  // Exception filter options (fetch from exceptions endpoint)
  const [exceptionOptions, setExceptionOptions] = useState<string[]>(['All']);

  // Calculate dialog state
  const [calculateDialogOpen, setCalculateDialogOpen] = useState(false);
  const [calculateDialogType, setCalculateDialogType] = useState<'monthly' | 'quarterly'>('monthly');

  useEffect(() => {
    (async () => {
      try {
        const me = await apiClient.getCurrentUser();
        setIsAdmin(!!me.is_admin);
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  // Debounced search queries - initialize with empty strings
  const [debouncedWeeklySearch, setDebouncedWeeklySearch] = useState('');
  const [debouncedMonthlySearch, setDebouncedMonthlySearch] = useState('');
  const [debouncedQuarterlySearch, setDebouncedQuarterlySearch] = useState('');

  // Debounce search queries (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedWeeklySearch(weeklySearchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [weeklySearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMonthlySearch(monthlySearchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [monthlySearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuarterlySearch(quarterlySearchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [quarterlySearchQuery]);

  // Fetch exception options from exceptions endpoint
  useEffect(() => {
    const fetchExceptionOptions = async () => {
      try {
        const response = await apiClient.getExceptions(1, 200);
        let allExceptions = [...response.exceptions];
        
        // If there are more pages, fetch them too
        if (response.total_pages > 1) {
          for (let page = 2; page <= response.total_pages; page++) {
            const pageResponse = await apiClient.getExceptions(page, 200);
            allExceptions.push(...pageResponse.exceptions);
          }
        }
        
        const exceptionNames = allExceptions.map(ex => ex.name).sort();
        setExceptionOptions(['All', 'default', ...exceptionNames]);
      } catch (error) {
        console.error('Failed to fetch exception options:', error);
        setExceptionOptions(['All', 'default']);
      }
    };
    fetchExceptionOptions();
  }, []);

  useEffect(() => {
    if (activeTab === 'weekly') {
      setWeeklyPage(1);
      loadWeeklyCompliance(1);
    }
  }, [activeTab, weeklyYear, weeklyMonth, weeklyStatus, weeklyException, debouncedWeeklySearch]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      setMonthlyPage(1);
      loadMonthlyCompliance(1);
    }
  }, [activeTab, monthlyYear, monthlyStatus, monthlyException, debouncedMonthlySearch]);

  useEffect(() => {
    if (activeTab === 'quarterly') {
      setQuarterlyPage(1);
      loadQuarterlyCompliance(1);
    }
  }, [activeTab, quarterlyYear, quarterlyStatus, quarterlyException, debouncedQuarterlySearch]);

  const loadWeeklyCompliance = async (page: number = 1) => {
    try {
      setWeeklyLoading(true);
      const data = await apiClient.getCompliance(
        weeklyYear,
        weeklyMonth,
        weeklyStatus === 'All' ? undefined : weeklyStatus,
        debouncedWeeklySearch.trim() || undefined,
        weeklyException !== 'All' ? weeklyException : undefined,
        page,
        ITEMS_PER_PAGE
      );
      setWeeklyCompliance(data);
      setWeeklyTotalPages(data.total_pages);
      setWeeklyPage(page);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load weekly compliance records';
      toast.error(errorMessage);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const loadMonthlyCompliance = async (page: number = 1) => {
    try {
      setMonthlyLoading(true);
      const data = await apiClient.getMonthlyCompliance(
        monthlyYear,
        monthlyStatus === 'All' ? undefined : monthlyStatus,
        debouncedMonthlySearch.trim() || undefined,
        monthlyException !== 'All' ? monthlyException : undefined,
        page,
        ITEMS_PER_PAGE
      );
      setMonthlyCompliance(data);
      setMonthlyTotalPages(data.total_pages);
      setMonthlyPage(page);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load monthly compliance records';
      toast.error(errorMessage);
    } finally {
      setMonthlyLoading(false);
    }
  };

  const loadQuarterlyCompliance = async (page: number = 1) => {
    try {
      setQuarterlyLoading(true);
      const data = await apiClient.getQuarterlyCompliance(
        quarterlyYear,
        quarterlyStatus === 'All' ? undefined : quarterlyStatus,
        debouncedQuarterlySearch.trim() || undefined,
        quarterlyException !== 'All' ? quarterlyException : undefined,
        page,
        ITEMS_PER_PAGE
      );
      setQuarterlyCompliance(data);
      setQuarterlyTotalPages(data.total_pages);
      setQuarterlyPage(page);
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
                      {weeklySearchQuery && weeklyLoading && (
                        <span className="ml-2 text-blue-600">(searching...)</span>
                      )}
                      {weeklySearchQuery && !weeklyLoading && weeklyCompliance && (
                        <span className="ml-2 text-slate-500">(filtered)</span>
                      )}
                    </span>
                  </div>

                  {/* Search + Filters */}
                  {(() => {
                    const hasReportees = !weeklyCompliance?.current_employee || weeklyCompliance?.total > 0 || (weeklyCompliance?.reportees && weeklyCompliance.reportees.length > 0);
                    const hasActiveFilters = debouncedWeeklySearch.trim() || weeklyStatus !== 'All' || weeklyException !== 'All';
                    const showStatusException = hasReportees || hasActiveFilters;
                    return (
                      <div className={`mb-4 grid grid-cols-1 gap-4 ${weeklyCompliance?.current_employee && !showStatusException ? 'md:grid-cols-3' : 'md:grid-cols-5'}`}>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="weekly-search">Search</Label>
                          <div className="relative h-11">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
                            <Input
                              id="weekly-search"
                              type="text"
                              placeholder="Employee ID or Name"
                              value={weeklySearchQuery}
                              onChange={(e) => setWeeklySearchQuery(e.target.value)}
                              className="pl-10 h-11 w-full text-sm py-2"
                              disabled={weeklyCompliance?.current_employee && !showStatusException}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Year</Label>
                          <Select
                            value={weeklyYear?.toString() || ''}
                            onValueChange={(value) => setWeeklyYear(value ? parseInt(value) : undefined)}
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Month</Label>
                          <Select
                            value={weeklyMonth?.toString() || ''}
                            onValueChange={(value) => setWeeklyMonth(value ? parseInt(value) : undefined)}
                          >
                            <SelectTrigger className="h-11 w-full">
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

                        {showStatusException && (
                      <>
                        <div className="flex flex-col gap-1">
                          <Label>Status</Label>
                          <Select value={weeklyStatus} onValueChange={setWeeklyStatus}>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Exception</Label>
                          <Select value={weeklyException} onValueChange={setWeeklyException}>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              {exceptionOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                      </div>
                    );
                  })()}

                  {weeklyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground font-medium">Loading compliance data...</p>
                      </div>
                    </div>
                  ) : !weeklyCompliance || (!weeklyCompliance.current_employee && weeklyCompliance.employees.length === 0) ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <CheckCircle2 className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No weekly compliance records found</h4>
                    </div>
                  ) : weeklyCompliance.current_employee && weeklyCompliance.employees.length === 0 && (!weeklyCompliance.reportees || weeklyCompliance.reportees.length === 0) && (debouncedWeeklySearch.trim() || weeklyStatus !== 'All' || weeklyException !== 'All') ? (
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

                      {((weeklyCompliance.reportees && weeklyCompliance.reportees.length > 0) || (!weeklyCompliance.current_employee && weeklyCompliance.employees.length > 0)) && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            {weeklyCompliance.current_employee ? 'Reportees Compliance' : 'All Employees'}
                            {weeklyCompliance.current_employee && (
                              <span className="text-sm font-normal text-slate-500 ml-2">
                                (Search & filters apply to reportees only)
                              </span>
                            )}
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
                                {(weeklyCompliance.reportees || weeklyCompliance.employees).map((employee) => (
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
                  
                  {weeklyTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Page {weeklyPage} of {weeklyTotalPages} ({weeklyCompliance?.total || 0} total {weeklyCompliance?.current_employee ? 'reportees' : 'employees'})
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadWeeklyCompliance(Math.max(1, weeklyPage - 1))}
                          disabled={weeklyPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadWeeklyCompliance(Math.min(weeklyTotalPages, weeklyPage + 1))}
                          disabled={weeklyPage === weeklyTotalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Monthly Compliance Tab */}
                <TabsContent value="monthly" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Total: {monthlyCompliance?.total || 0} employees
                      {monthlySearchQuery && monthlyLoading && (
                        <span className="ml-2 text-blue-600">(searching...)</span>
                      )}
                      {monthlySearchQuery && !monthlyLoading && monthlyCompliance && (
                        <span className="ml-2 text-slate-500">(filtered)</span>
                      )}
                    </span>
                  </div>

                  {/* Search + Filters */}
                  {(() => {
                    const hasReportees = !monthlyCompliance?.current_employee || monthlyCompliance?.total > 0 || (monthlyCompliance?.reportees && monthlyCompliance.reportees.length > 0);
                    const hasActiveFilters = debouncedMonthlySearch.trim() || monthlyStatus !== 'All' || monthlyException !== 'All';
                    const showStatusException = hasReportees || hasActiveFilters;
                    return (
                      <div className={`mb-4 grid grid-cols-1 gap-4 ${monthlyCompliance?.current_employee && !showStatusException ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="monthly-search">Search</Label>
                          <div className="relative h-11">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
                            <Input
                              id="monthly-search"
                              type="text"
                              placeholder="Employee ID or Name"
                              value={monthlySearchQuery}
                              onChange={(e) => setMonthlySearchQuery(e.target.value)}
                              className="pl-10 h-11 w-full text-sm py-2"
                              disabled={monthlyCompliance?.current_employee && !showStatusException}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Year</Label>
                          <Select
                            value={monthlyYear?.toString() || ''}
                            onValueChange={(value) => setMonthlyYear(value ? parseInt(value) : undefined)}
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {showStatusException && (
                      <>
                        <div className="flex flex-col gap-1">
                          <Label>Status</Label>
                          <Select value={monthlyStatus} onValueChange={setMonthlyStatus}>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Exception</Label>
                          <Select value={monthlyException} onValueChange={setMonthlyException}>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              {exceptionOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                      </div>
                    );
                  })()}

                  {isAdmin && (
                    <div className="mb-4 flex justify-end">
                      <Button 
                        onClick={handleCalculateMonthly}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
                      >
                        Calculate New
                      </Button>
                    </div>
                  )}

                  {monthlyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground font-medium">Loading compliance data...</p>
                      </div>
                    </div>
                  ) : !monthlyCompliance || (!monthlyCompliance.current_employee && monthlyCompliance.employees.length === 0) ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <CheckCircle2 className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No monthly compliance records found</h4>
                    </div>
                  ) : monthlyCompliance.current_employee && monthlyCompliance.employees.length === 0 && (!monthlyCompliance.reportees || monthlyCompliance.reportees.length === 0) && (debouncedMonthlySearch.trim() || monthlyStatus !== 'All' || monthlyException !== 'All') ? (
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

                      {((monthlyCompliance.reportees && monthlyCompliance.reportees.length > 0) || (!monthlyCompliance.current_employee && monthlyCompliance.employees.length > 0)) && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            {monthlyCompliance.current_employee ? 'Reportees Compliance' : 'All Employees'}
                            {monthlyCompliance.current_employee && (
                              <span className="text-sm font-normal text-slate-500 ml-2">
                                (Search & filters apply to reportees only)
                              </span>
                            )}
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
                                {(monthlyCompliance.reportees || monthlyCompliance.employees).map((employee) => (
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
                  
                  {monthlyTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Page {monthlyPage} of {monthlyTotalPages} ({monthlyCompliance?.total || 0} total {monthlyCompliance?.current_employee ? 'reportees' : 'employees'})
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadMonthlyCompliance(Math.max(1, monthlyPage - 1))}
                          disabled={monthlyPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadMonthlyCompliance(Math.min(monthlyTotalPages, monthlyPage + 1))}
                          disabled={monthlyPage === monthlyTotalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Quarterly Compliance Tab */}
                <TabsContent value="quarterly" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Total: {quarterlyCompliance?.total || 0} employees
                      {quarterlySearchQuery && quarterlyLoading && (
                        <span className="ml-2 text-blue-600">(searching...)</span>
                      )}
                      {quarterlySearchQuery && !quarterlyLoading && quarterlyCompliance && (
                        <span className="ml-2 text-slate-500">(filtered)</span>
                      )}
                    </span>
                  </div>

                  {/* Search + Filters */}
                  {(() => {
                    const hasReportees = !quarterlyCompliance?.current_employee || quarterlyCompliance?.total > 0 || (quarterlyCompliance?.reportees && quarterlyCompliance.reportees.length > 0);
                    const hasActiveFilters = debouncedQuarterlySearch.trim() || quarterlyStatus !== 'All' || quarterlyException !== 'All';
                    const showStatusException = hasReportees || hasActiveFilters;
                    return (
                      <div className={`mb-4 grid grid-cols-1 gap-4 ${quarterlyCompliance?.current_employee && !showStatusException ? 'md:grid-cols-2' : 'md:grid-cols-4'}`}>
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="quarterly-search">Search</Label>
                          <div className="relative h-11">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
                            <Input
                              id="quarterly-search"
                              type="text"
                              placeholder="Employee ID or Name"
                              value={quarterlySearchQuery}
                              onChange={(e) => setQuarterlySearchQuery(e.target.value)}
                              className="pl-10 h-11 w-full text-sm py-2"
                              disabled={quarterlyCompliance?.current_employee && !showStatusException}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Year</Label>
                          <Select
                            value={quarterlyYear?.toString() || ''}
                            onValueChange={(value) => setQuarterlyYear(value ? parseInt(value) : undefined)}
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {showStatusException && (
                      <>
                        <div className="flex flex-col gap-1">
                          <Label>Status</Label>
                          <Select value={quarterlyStatus} onValueChange={setQuarterlyStatus}>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Label>Exception</Label>
                          <Select value={quarterlyException} onValueChange={setQuarterlyException}>
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue placeholder="All" />
                            </SelectTrigger>
                            <SelectContent>
                              {exceptionOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                      </div>
                    );
                  })()}

                  {isAdmin && (
                    <div className="mb-4 flex justify-end">
                      <Button 
                        onClick={handleCalculateQuarterly}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-11"
                      >
                        Calculate New
                      </Button>
                    </div>
                  )}

                  {quarterlyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="text-sm text-muted-foreground font-medium">Loading compliance data...</p>
                      </div>
                    </div>
                  ) : !quarterlyCompliance || (!quarterlyCompliance.current_employee && quarterlyCompliance.employees.length === 0) ? (
                    <div className="text-center py-16">
                      <div className="relative mb-4 inline-block">
                        <CheckCircle2 className="h-16 w-16 text-muted-foreground/40" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"></div>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No quarterly compliance records found</h4>
                    </div>
                  ) : quarterlyCompliance.current_employee && quarterlyCompliance.employees.length === 0 && (!quarterlyCompliance.reportees || quarterlyCompliance.reportees.length === 0) && (debouncedQuarterlySearch.trim() || quarterlyStatus !== 'All' || quarterlyException !== 'All') ? (
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

                      {((quarterlyCompliance.reportees && quarterlyCompliance.reportees.length > 0) || (!quarterlyCompliance.current_employee && quarterlyCompliance.employees.length > 0)) && (
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100">
                            {quarterlyCompliance.current_employee ? 'Reportees Compliance' : 'All Employees'}
                            {quarterlyCompliance.current_employee && (
                              <span className="text-sm font-normal text-slate-500 ml-2">
                                (Search & filters apply to reportees only)
                              </span>
                            )}
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
                                {(quarterlyCompliance.reportees || quarterlyCompliance.employees).map((employee) => (
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
                  
                  {quarterlyTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Page {quarterlyPage} of {quarterlyTotalPages} ({quarterlyCompliance?.total || 0} total {quarterlyCompliance?.current_employee ? 'reportees' : 'employees'})
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadQuarterlyCompliance(Math.max(1, quarterlyPage - 1))}
                          disabled={quarterlyPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadQuarterlyCompliance(Math.min(quarterlyTotalPages, quarterlyPage + 1))}
                          disabled={quarterlyPage === quarterlyTotalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
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
