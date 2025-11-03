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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient, type Employee, type EmployeeCreate, type EmployeeUpdate } from '@/lib/api';
import { toast } from 'sonner';

interface EmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  employee?: Employee | null;
}

export function EmployeeDialog({ open, onClose, employee }: EmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EmployeeCreate>({
    employee_id: '',
    employee_name: '',
    reporting_manager_id: '',
    reporting_manager_name: '',
    vertical_head_id: '',
    vertical_head_name: '',
    vertical: '',
    status: '',
    exception: '',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        employee_id: employee.employee_id,
        employee_name: employee.employee_name || '',
        reporting_manager_id: employee.reporting_manager_id || '',
        reporting_manager_name: employee.reporting_manager_name || '',
        vertical_head_id: employee.vertical_head_id || '',
        vertical_head_name: employee.vertical_head_name || '',
        vertical: employee.vertical || '',
        status: employee.status || '',
        exception: employee.exception || '',
      });
    } else {
      setFormData({
        employee_id: '',
        employee_name: '',
        reporting_manager_id: '',
        reporting_manager_name: '',
        vertical_head_id: '',
        vertical_head_name: '',
        vertical: '',
        status: '',
        exception: '',
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (employee) {
        const updateData: EmployeeUpdate = {
          employee_name: formData.employee_name,
          reporting_manager_id: formData.reporting_manager_id || null,
          reporting_manager_name: formData.reporting_manager_name || null,
          vertical_head_id: formData.vertical_head_id || null,
          vertical_head_name: formData.vertical_head_name || null,
          vertical: formData.vertical || null,
          status: formData.status || null,
          exception: formData.exception || null,
        };
        await apiClient.updateEmployee(employee.employee_id, updateData);
        toast.success('Employee updated successfully');
      } else {
        await apiClient.createEmployee(formData);
        toast.success('Employee created successfully');
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Create Employee'}</DialogTitle>
          <DialogDescription>
            {employee
              ? 'Update employee information'
              : 'Add a new employee to the system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                required
                disabled={!!employee}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_name">Employee Name *</Label>
              <Input
                id="employee_name"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reporting_manager_id">Reporting Manager ID</Label>
              <Input
                id="reporting_manager_id"
                value={formData.reporting_manager_id}
                onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reporting_manager_name">Reporting Manager Name</Label>
              <Input
                id="reporting_manager_name"
                value={formData.reporting_manager_name}
                onChange={(e) => setFormData({ ...formData, reporting_manager_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vertical_head_id">Vertical Head ID</Label>
              <Input
                id="vertical_head_id"
                value={formData.vertical_head_id}
                onChange={(e) => setFormData({ ...formData, vertical_head_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vertical_head_name">Vertical Head Name</Label>
              <Input
                id="vertical_head_name"
                value={formData.vertical_head_name}
                onChange={(e) => setFormData({ ...formData, vertical_head_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vertical">Vertical</Label>
              <Input
                id="vertical"
                value={formData.vertical}
                onChange={(e) => setFormData({ ...formData, vertical: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || ''}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="exception">Exception</Label>
            <Input
              id="exception"
              value={formData.exception}
              onChange={(e) => setFormData({ ...formData, exception: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : employee ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

