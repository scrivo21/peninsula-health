import { ShiftTypesResponse, ShiftAnalytics } from '../types/shifts';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ShiftsApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const text = await response.text();
      let data: ApiResponse<T>;
      
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse response:', text);
        throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get all available shift types (clinical and non-clinical)
   */
  async getShiftTypes(): Promise<ApiResponse<ShiftTypesResponse>> {
    return this.request<ShiftTypesResponse>('/roster/shift-types');
  }

  /**
   * Get analytics for a specific shift type
   */
  async getShiftAnalytics(shiftType: string): Promise<ApiResponse<ShiftAnalytics>> {
    return this.request<ShiftAnalytics>(`/roster/shift-types/${encodeURIComponent(shiftType)}/analytics`);
  }

  /**
   * Get all shift analytics
   */
  async getAllShiftAnalytics(): Promise<ApiResponse<ShiftAnalytics[]>> {
    return this.request<ShiftAnalytics[]>('/roster/shift-types/analytics');
  }

  /**
   * Export shift type report
   */
  async exportShiftReport(format: 'csv' | 'pdf'): Promise<ApiResponse<{ download_url: string; filename: string }>> {
    return this.request<{ download_url: string; filename: string }>(`/roster/shift-types/export/${format}`);
  }
}

// Create singleton instance
const shiftsApiService = new ShiftsApiService();

// Export individual methods for easier testing and usage
export const getShiftTypes = () =>
  shiftsApiService.getShiftTypes();

export const getShiftAnalytics = (shiftType: string) =>
  shiftsApiService.getShiftAnalytics(shiftType);

export const getAllShiftAnalytics = () =>
  shiftsApiService.getAllShiftAnalytics();

export const exportShiftReport = (format: 'csv' | 'pdf') =>
  shiftsApiService.exportShiftReport(format);

export default shiftsApiService;