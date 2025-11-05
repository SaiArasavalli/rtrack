'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient, type Exception, type ExceptionCreate, type ExceptionUpdate } from '@/lib/api';
import { toast } from 'sonner';

interface ExceptionDialogProps {
  open: boolean;
  onClose: () => void;
  exception?: Exception | null;
}

export function ExceptionDialog({ open, onClose, exception }: ExceptionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [exceptionType, setExceptionType] = useState<'format' | 'special'>('format');
  const [formData, setFormData] = useState<{
    period: string;
    number: string;
    name: string;
    specialType: string;
  }>({
    period: 'weekly',
    number: '',
    name: '',
    specialType: 'default',
  });

  useEffect(() => {
    if (exception) {
      // Check if it's a special exception (default or other)
      if (exception.name.toLowerCase() === 'default' || exception.name.toLowerCase() === 'other') {
        setExceptionType('special');
        setFormData({
          period: 'weekly',
          number: '',
          name: exception.name.toLowerCase(),
          specialType: exception.name.toLowerCase(),
        });
      } else {
        // Parse existing exception: {period}_{number}_day
        setExceptionType('format');
        const match = exception.name.match(/^(weekly|monthly|quarterly)_(\d+)_day$/);
        if (match) {
          setFormData({
            period: match[1],
            number: match[2],
            name: exception.name,
            specialType: 'default',
          });
        } else {
          setFormData({
            period: 'weekly',
            number: '',
            name: exception.name,
            specialType: 'default',
          });
        }
      }
    } else {
      setExceptionType('format');
      setFormData({
        period: 'weekly',
        number: '',
        name: '',
        specialType: 'default',
      });
    }
  }, [exception, open]);

  useEffect(() => {
    if (exceptionType === 'special') {
      // Use special exception name
      setFormData(prev => ({
        ...prev,
        name: prev.specialType,
      }));
    } else {
      // Generate name from period and number
      if (formData.period && formData.number && formData.number.trim() !== '') {
        setFormData(prev => ({
          ...prev,
          name: `${prev.period}_${prev.number}_day`,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          name: '',
        }));
      }
    }
  }, [formData.period, formData.number, formData.specialType, exceptionType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on exception type
    if (exceptionType === 'format') {
      // Validate number is provided
      if (!formData.number || formData.number.trim() === '') {
        toast.error('Please enter a number for the exception');
        return;
      }
      
      // Validate number is a positive integer
      const num = parseInt(formData.number);
      if (isNaN(num) || num <= 0) {
        toast.error('Number must be a positive integer');
        return;
      }
    }
    
    setLoading(true);

    try {
      const exceptionData: ExceptionCreate = {
        name: formData.name,
      };
      
      if (exception) {
        const updateData: ExceptionUpdate = {
          name: formData.name,
        };
        await apiClient.updateException(exception.id, updateData);
        toast.success('Exception updated successfully');
      } else {
        await apiClient.createException(exceptionData);
        toast.success('Exception created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save exception');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{exception ? 'Edit Exception' : 'Create Exception'}</DialogTitle>
          <DialogDescription>
            {exception
              ? 'Update exception information'
              : 'Add a new exception to the system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exceptionType">Exception Type *</Label>
            <Select
              value={exceptionType}
              onValueChange={(value) => setExceptionType(value as 'format' | 'special')}
            >
              <SelectTrigger id="exceptionType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="format">Format: {'{period}_{number}_day'}</SelectItem>
                <SelectItem value="special">Special: default or other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {exceptionType === 'special' ? (
            <div className="space-y-2">
              <Label htmlFor="specialType">Special Exception *</Label>
              <Select
                value={formData.specialType}
                onValueChange={(value) => setFormData({ ...formData, specialType: value })}
              >
                <SelectTrigger id="specialType">
                  <SelectValue placeholder="Select special exception" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">default</SelectItem>
                  <SelectItem value="other">other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select "default" or "other" as the exception name
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Period *</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(value) => setFormData({ ...formData, period: value })}
                  >
                    <SelectTrigger id="period">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Number (days) *</Label>
                  <Input
                    id="number"
                    type="number"
                    min="1"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    required
                    placeholder="e.g., 2, 4, 6"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Exception Name (auto-generated)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  placeholder="Format: {period}_{number}_day"
                />
                <p className="text-xs text-muted-foreground">
                  Format: {formData.period}_{formData.number || 'X'}_day
                </p>
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? 'Saving...' : exception ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

