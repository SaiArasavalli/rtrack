'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface CalculateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'monthly' | 'quarterly';
  year: number;
  onCalculate: (year: number, value: number) => Promise<void>;
}

export function CalculateDialog({
  open,
  onOpenChange,
  type,
  year,
  onCalculate,
}: CalculateDialogProps) {
  const [value, setValue] = useState<string>(
    type === 'monthly' ? String(new Date().getMonth() + 1) : '1'
  );
  const [loading, setLoading] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseInt(value);
    
    if (type === 'monthly') {
      if (Number.isNaN(numValue) || numValue < 1 || numValue > 12) {
        return;
      }
    } else {
      if (Number.isNaN(numValue) || numValue < 1 || numValue > 4) {
        return;
      }
    }

    setLoading(true);
    try {
      await onCalculate(year, numValue);
      onOpenChange(false);
      setValue(type === 'monthly' ? String(new Date().getMonth() + 1) : '1');
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Calculate {type === 'monthly' ? 'Monthly' : 'Quarterly'} Compliance
          </DialogTitle>
          <DialogDescription>
            Select the {type === 'monthly' ? 'month' : 'quarter'} to calculate compliance for year {year}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {type === 'monthly' ? (
              <div className="grid gap-2">
                <Label htmlFor="month">Month</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index + 1} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="quarter">Quarter</Label>
                <Select value={value} onValueChange={setValue}>
                  <SelectTrigger id="quarter">
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1 (January - March)</SelectItem>
                    <SelectItem value="2">Q2 (April - June)</SelectItem>
                    <SelectItem value="3">Q3 (July - September)</SelectItem>
                    <SelectItem value="4">Q4 (October - December)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? 'Calculating...' : 'Calculate'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

