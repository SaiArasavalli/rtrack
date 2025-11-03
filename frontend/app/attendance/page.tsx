'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
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
import { Button } from '@/components/ui/button';
import { apiClient, type Attendance } from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, Clock, CheckCircle2, XCircle, Loader2, Upload as UploadIcon } from 'lucide-react';

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendances();
  }, []);

  const loadAttendances = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAttendance();
      setAttendances(data.attendances);
      setTotalCount(data.total);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load attendance records';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const displayedAttendances = attendances.slice(0, 20);

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

  const formatTime = (timeString: string | null | undefined) => {
    if (!timeString) return '-';
    try {
      // If it's already in HH:MM format, return it
      if (timeString.includes(':') && timeString.split(':').length === 2) {
        const [hours, minutes] = timeString.split(':');
        // Ensure it's in HH:MM format
        if (hours.length <= 2 && minutes.length <= 2) {
          return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
        return timeString;
      }
      
      // Try parsing as timestamp/datetime
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        // Check if it's a valid date
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      
      // If it's a time string like "9:30" or "09:30", normalize it
      if (/^\d{1,2}:\d{1,2}$/.test(timeString)) {
        const [h, m] = timeString.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
      }
      
      return timeString;
    } catch {
      return timeString;
    }
  };

  const formatMonth = (monthNumber: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNumber - 1] || monthNumber.toString();
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
                  <CardTitle className="text-3xl font-bold">Attendance Records</CardTitle>
                  <CardDescription className="mt-2">
                    All attendance records in the database - For auditing purposes
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span>Total: {totalCount} records (showing {displayedAttendances.length} of {attendances.length})</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-end">
                <Button variant="outline" onClick={() => (window.location.href = '/attendance-upload')}>
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Upload Attendance
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : attendances.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">No attendance records found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Employee Name</TableHead>
                        <TableHead>Swipe In</TableHead>
                        <TableHead>Swipe Out</TableHead>
                        <TableHead>Work Hours</TableHead>
                        <TableHead>Hours Worked</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Week</TableHead>
                        <TableHead>Week Range</TableHead>
                        <TableHead>Quarter</TableHead>
                        <TableHead>Year</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedAttendances.map((attendance) => (
                        <TableRow key={attendance.id}>
                          <TableCell className="font-medium">
                            {formatDate(attendance.date)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {attendance.employee_id}
                          </TableCell>
                          <TableCell>{attendance.employee_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {formatTime(attendance.swipe_in)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {formatTime(attendance.swipe_out)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {attendance.work_hours ? (
                              <span className="font-mono text-sm">{attendance.work_hours}</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {attendance.hours_worked !== null && attendance.hours_worked !== undefined ? (
                              <span className="font-mono text-sm">{attendance.hours_worked.toFixed(2)}</span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {attendance.is_present === 1 ? (
                              <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Present
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                <XCircle className="h-3 w-3" />
                                Absent
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">W{attendance.week_number}</span>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDate(attendance.week_start)} - {formatDate(attendance.week_end)}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">Q{attendance.quarter_number}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{attendance.year}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </AdminRoute>
    </ProtectedRoute>
  );
}

