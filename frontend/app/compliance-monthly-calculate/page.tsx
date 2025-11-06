'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Calculator, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyComplianceCalculatePage() {
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(new Date().getMonth() + 1);
  const [calculating, setCalculating] = useState(false);
  const router = useRouter();

  const handleCalculate = async () => {
    if (!year || !month) {
      toast.error('Please select both year and month');
      return;
    }

    setCalculating(true);
    try {
      const result = await apiClient.calculateMonthlyCompliance(year, month);
      toast.success(
        `Monthly compliance calculated for ${monthNames[month - 1]} ${year}. ` +
        `${result.compliant_count}/${result.records_calculated} employees are compliant.`
      );
      // Redirect to monthly compliance view page
      router.push('/compliance-monthly');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate monthly compliance';
      toast.error(errorMessage);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <ProtectedRoute>
      <AdminRoute>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                <Calculator className="h-8 w-8" />
                Calculate Monthly Compliance
              </CardTitle>
              <CardDescription className="mt-2">
                Calculate monthly compliance for a specific year and month
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
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
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Month</label>
                  <Select
                    value={month?.toString() || ''}
                    onValueChange={(value) => setMonth(value ? parseInt(value) : undefined)}
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
              </div>

              <Button
                onClick={handleCalculate}
                disabled={calculating || !year || !month}
                className="w-full"
                size="lg"
              >
                {calculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Monthly Compliance
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </AdminRoute>
    </ProtectedRoute>
  );
}

