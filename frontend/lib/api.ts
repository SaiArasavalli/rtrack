/**
 * API Client for rTrack backend
 */

import { getToken, setToken, removeToken } from './auth';
import { clearAdminStatusCache } from './admin-cache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
export interface Employee {
  id?: number;
  employee_id: string;
  employee_name: string;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  vertical_head_id?: string | null;
  vertical_head_name?: string | null;
  vertical?: string | null;
  status?: string | null;
  exception?: string | null;
}

export interface EmployeeCreate {
  employee_id: string;
  employee_name: string;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  vertical_head_id?: string | null;
  vertical_head_name?: string | null;
  vertical?: string | null;
  status?: string | null;
  exception?: string | null;
}

export interface EmployeeUpdate {
  employee_name?: string | null;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  vertical_head_id?: string | null;
  vertical_head_name?: string | null;
  vertical?: string | null;
  status?: string | null;
  exception?: string | null;
}

export interface Attendance {
  id: number;
  employee_id: string;
  employee_name: string;
  swipe_in: string | null;
  swipe_out: string | null;
  work_hours: string | null;
  hours_worked: number | null;
  is_present: number;
  date: string;
  week_start: string;
  week_end: string;
  week_number: number;
  month_number: number;
  quarter_number: number;
  year: number;
}

export interface ComplianceWeek {
  label: string;
  week_number: number;
  week_start: string;
  week_end: string;
  key_str: string;
}

export interface ComplianceWeekData {
  compliance_status: string;
  total_days_present: number;
  total_hours_worked: number;
  weekly_days: number;
  weekly_hours: number;
}

export interface ComplianceEmployee {
  employee_id: string;
  employee_name: string;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  vertical_head_id?: string | null;
  vertical_head_name?: string | null;
  vertical?: string | null;
  status?: string | null;
  exception?: string | null;
  weeks: Record<string, ComplianceWeekData>;
}

export interface ComplianceResponse {
  total: number;
  weeks: ComplianceWeek[];
  employees: ComplianceEmployee[];
  current_employee?: ComplianceEmployee;
  reportees?: ComplianceEmployee[];
}

export interface MonthlyComplianceMonth {
  label: string;
  month: number;
  year: number;
  month_start: string;
  month_end: string;
  key: string;
}

export interface MonthlyComplianceMonthData {
  compliance_status: string;
  total_days_present: number;
  total_hours_worked: number;
  monthly_days: number;
  monthly_hours: number;
}

export interface MonthlyComplianceEmployee {
  employee_id: string;
  employee_name: string;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  vertical_head_id?: string | null;
  vertical_head_name?: string | null;
  vertical?: string | null;
  status?: string | null;
  exception?: string | null;
  months: Record<string, MonthlyComplianceMonthData>;
}

export interface MonthlyComplianceResponse {
  total: number;
  months: MonthlyComplianceMonth[];
  employees: MonthlyComplianceEmployee[];
  current_employee?: MonthlyComplianceEmployee;
  reportees?: MonthlyComplianceEmployee[];
}

export interface QuarterlyComplianceQuarter {
  label: string;
  quarter: number;
  year: number;
  quarter_start: string;
  quarter_end: string;
  key: string;
}

export interface QuarterlyComplianceQuarterData {
  compliance_status: string;
  total_days_present: number;
  total_hours_worked: number;
  quarterly_days: number;
  quarterly_hours: number;
}

export interface QuarterlyComplianceEmployee {
  employee_id: string;
  employee_name: string;
  reporting_manager_id?: string | null;
  reporting_manager_name?: string | null;
  vertical_head_id?: string | null;
  vertical_head_name?: string | null;
  vertical?: string | null;
  status?: string | null;
  exception?: string | null;
  quarters: Record<string, QuarterlyComplianceQuarterData>;
}

export interface QuarterlyComplianceResponse {
  total: number;
  quarters: QuarterlyComplianceQuarter[];
  employees: QuarterlyComplianceEmployee[];
  current_employee?: QuarterlyComplianceEmployee;
  reportees?: QuarterlyComplianceEmployee[];
}

export interface UserInfo {
  employee_id: string;
  employee_name: string;
  is_admin: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UploadResponse {
  message: string;
  records_loaded: number;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface CalculateResponse {
  message: string;
  records_calculated: number;
}

export interface Exception {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExceptionCreate {
  name: string;
}

export interface ExceptionUpdate {
  name?: string | null;
}

export interface PopulateExceptionsResponse {
  message: string;
  created: number;
  skipped: number;
  total_found: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear token and admin cache
        this.logout();
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
      }
      
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Authentication
  async login(credentials: { username: string; password: string }): Promise<void> {
    const data = await this.request<LoginResponse>('/auth/token', {
      method: 'POST',
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });
    setToken(data.access_token);
  }

  async logout(): Promise<void> {
    removeToken();
    clearAdminStatusCache();
  }

  async getCurrentUser(): Promise<UserInfo> {
    return this.request<UserInfo>('/auth/me');
  }

  async getEmployees(
    page: number = 1,
    pageSize: number = 50,
    search?: string,
    vertical?: string,
    status?: string,
    exception?: string
  ): Promise<{ employees: Employee[]; total: number; page: number; page_size: number; total_pages: number }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());
    if (search) params.append('search', search);
    if (vertical && vertical !== 'All') params.append('vertical', vertical);
    if (status && status !== 'All') params.append('status', status);
    if (exception && exception !== 'All') params.append('exception', exception);
    
    return this.request<{ employees: Employee[]; total: number; page: number; page_size: number; total_pages: number }>(
      `/employees?${params.toString()}`
    );
  }

  async createEmployee(employee: EmployeeCreate): Promise<Employee> {
    return this.request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    });
  }

  async updateEmployee(
    employeeId: string,
    employee: EmployeeUpdate
  ): Promise<Employee> {
    return this.request<Employee>(`/employees/${employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(employee),
    });
  }

  async deleteEmployee(employeeId: string): Promise<void> {
    await this.request<void>(`/employees/${employeeId}`, {
      method: 'DELETE',
    });
  }

  async uploadExcel(file: File): Promise<UploadResponse> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/employees/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        this.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
      }
      
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getAttendance(page: number = 1, pageSize: number = 100): Promise<{ attendances: Attendance[]; total: number; page: number; page_size: number; total_pages: number }> {
    return this.request<{ attendances: Attendance[]; total: number; page: number; page_size: number; total_pages: number }>(`/attendance?page=${page}&page_size=${pageSize}`);
  }

  async getLastUploadInfo(): Promise<{
    has_upload: boolean;
    week_start?: string;
    week_end?: string;
    week_number?: number;
    year?: number;
    date_range?: { start: string; end: string };
    records_count?: number;
    employees_count?: number;
    uploaded_at?: string;
    message?: string;
  }> {
    return this.request('/attendance/last-upload');
  }

  async uploadAttendance(file: File): Promise<UploadResponse> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/attendance/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        this.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please login again.');
      }
      
      const error = await response.json().catch(() => ({
        detail: response.statusText,
      }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Compliance
  async getCompliance(
    year?: number,
    month?: number,
    status?: string,
    search?: string,
    exception?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<ComplianceResponse & { page: number; page_size: number; total_pages: number }> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (exception && exception !== 'All') params.append('exception', exception);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    return this.request<ComplianceResponse & { page: number; page_size: number; total_pages: number }>(
      `/compliance?${params.toString()}`
    );
  }

  async getMonthlyCompliance(
    year?: number,
    status?: string,
    search?: string,
    exception?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<MonthlyComplianceResponse & { page: number; page_size: number; total_pages: number }> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (exception && exception !== 'All') params.append('exception', exception);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    return this.request<MonthlyComplianceResponse & { page: number; page_size: number; total_pages: number }>(
      `/compliance/monthly?${params.toString()}`
    );
  }

  async getQuarterlyCompliance(
    year?: number,
    status?: string,
    search?: string,
    exception?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<QuarterlyComplianceResponse & { page: number; page_size: number; total_pages: number }> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    if (exception && exception !== 'All') params.append('exception', exception);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    return this.request<QuarterlyComplianceResponse & { page: number; page_size: number; total_pages: number }>(
      `/compliance/quarterly?${params.toString()}`
    );
  }

  async calculateMonthlyCompliance(
    year: number,
    month: number
  ): Promise<CalculateResponse> {
    const params = new URLSearchParams();
    params.append('year', year.toString());
    params.append('month', month.toString());
    return this.request<CalculateResponse>(
      `/compliance/monthly/calculate?${params.toString()}`,
      {
        method: 'POST',
      }
    );
  }

  async calculateQuarterlyCompliance(
    year: number,
    quarter: number
  ): Promise<CalculateResponse> {
    const params = new URLSearchParams();
    params.append('year', year.toString());
    params.append('quarter', quarter.toString());
    return this.request<CalculateResponse>(
      `/compliance/quarterly/calculate?${params.toString()}`,
      {
        method: 'POST',
      }
    );
  }

  async getExceptions(page: number = 1, pageSize: number = 50): Promise<{ exceptions: Exception[]; total: number; page: number; page_size: number; total_pages: number }> {
    return this.request<{ exceptions: Exception[]; total: number; page: number; page_size: number; total_pages: number }>(`/exceptions?page=${page}&page_size=${pageSize}`);
  }

  async createException(exception: ExceptionCreate): Promise<Exception> {
    return this.request<Exception>('/exceptions', {
      method: 'POST',
      body: JSON.stringify(exception),
    });
  }

  async getException(exceptionId: number): Promise<Exception> {
    return this.request<Exception>(`/exceptions/${exceptionId}`);
  }

  async updateException(
    exceptionId: number,
    exception: ExceptionUpdate
  ): Promise<Exception> {
    return this.request<Exception>(`/exceptions/${exceptionId}`, {
      method: 'PUT',
      body: JSON.stringify(exception),
    });
  }

  async deleteException(exceptionId: number): Promise<void> {
    await this.request<void>(`/exceptions/${exceptionId}`, {
      method: 'DELETE',
    });
  }

  async populateExceptions(): Promise<PopulateExceptionsResponse> {
    return this.request<PopulateExceptionsResponse>('/exceptions/populate', {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();

