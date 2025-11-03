'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { AdminRoute } from '@/components/admin-route';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { toast } from 'sonner';
import { Calculator, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const quarters = [
  { value: 1, label: 'Q1 (Jan - Mar)' },
  { value: 2, label: 'Q2 (Apr - Jun)' },
  { value: 3, label: 'Q3 (Jul - Sep)' },
  { value: 4, label: 'Q4 (Oct - Dec)' },
];

export default function QuarterlyComplianceCalculatePage() {
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<number | undefined>(1);
  const [calculating, setCalculating] = useState(false);
  const router = useRouter();

  const handleCalculate = async () => {
    if (!year || !quarter) {
      toast.error('Please select both year and quarter');
      return;
    }

    setCalculating(true);
    try {
      const result = await apiClient.calculateQuarterlyCompliance(year, quarter);
      toast.success(
        `Quarterly compliance calculated for Q${quarter} ${year}. ` +
        `${result.compliant_count}/${result.records_calculated} employees are compliant.`
      );
      // Redirect to quarterly compliance view page
      router.push('/compliance-quarterly');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to calculate quarterly compliance';
      toast.error(errorMessage);
    } finally {
      setCalculating(false);
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
              <CardTitle className="text-3xl font-bold flex items-center gap-2">
                <Calculator className="h-8 w-8" />
                Calculate Quarterly Compliance
              </CardTitle>
              <CardDescription className="mt-2">
                Calculate quarterly compliance for a specific year and quarter
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
                  <label className="text-sm font-medium mb-2 block">Quarter</label>
                  <Select
                    value={quarter?.toString() || ''}
                    onValueChange={(value) => setQuarter(value ? parseInt(value) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      {quarters.map((q) => (
                        <SelectItem key={q.value} value={q.value.toString()}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={calculating || !year || !quarter}
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
                    Calculate Quarterly Compliance
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

