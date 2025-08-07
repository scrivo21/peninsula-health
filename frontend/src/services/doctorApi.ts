import { DoctorProfile, DoctorFormData } from '../types/doctor';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

class DoctorApiService {
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
   * Get all doctors from the backend
   */
  async getAllDoctors(): Promise<ApiResponse<DoctorProfile[]>> {
    return this.request<DoctorProfile[]>('/doctors');
  }

  /**
   * Get a single doctor by ID
   */
  async getDoctorById(id: string): Promise<ApiResponse<DoctorProfile>> {
    return this.request<DoctorProfile>(`/doctors/${encodeURIComponent(id)}`);
  }

  /**
   * Add a new doctor
   */
  async addDoctor(doctorData: DoctorFormData): Promise<ApiResponse<DoctorProfile>> {
    return this.request<DoctorProfile>('/doctors', {
      method: 'POST',
      body: JSON.stringify(doctorData),
    });
  }

  /**
   * Update an existing doctor
   */
  async updateDoctor(
    id: string,
    doctorData: Partial<DoctorFormData>
  ): Promise<ApiResponse<DoctorProfile>> {
    return this.request<DoctorProfile>(`/doctors/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(doctorData),
    });
  }

  /**
   * Remove a doctor
   */
  async removeDoctor(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/doctors/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get medical quotes
   */
  async getQuotes(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/quotes');
  }

  /**
   * Get a random medical quote
   */
  async getRandomQuote(): Promise<ApiResponse<string>> {
    return this.request<string>('/quotes/random');
  }

  /**
   * Check API health
   */
  async healthCheck(): Promise<ApiResponse<any>> {
    return this.request<any>('/health');
  }

  /**
   * Check for roster overlap before generation
   */
  async checkRosterOverlap(weeks: number, startDate: string): Promise<ApiResponse<{
    hasOverlap: boolean;
    overlappingRosters: Array<{
      jobId: string;
      startDate: string;
      weeks: number;
      endDate: string;
      createdAt: string;
      finalized: boolean;
    }>;
    requestedPeriod: {
      startDate: string;
      endDate: string;
      weeks: number;
    };
  }>> {
    return this.request<{
      hasOverlap: boolean;
      overlappingRosters: Array<{
        jobId: string;
        startDate: string;
        weeks: number;
        endDate: string;
        createdAt: string;
        finalized: boolean;
      }>;
      requestedPeriod: {
        startDate: string;
        endDate: string;
        weeks: number;
      };
    }>('/roster/check-overlap', {
      method: 'POST',
      body: JSON.stringify({
        weeks,
        start_date: startDate
      }),
    });
  }

  /**
   * Generate roster
   */
  async generateRoster(weeks: number, startDate?: string): Promise<ApiResponse<any>> {
    const body: any = { weeks };
    if (startDate) {
      body.start_date = startDate;
    }
    
    
    return this.request<any>('/roster/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Get roster job status
   */
  async getRosterStatus(jobId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/roster/${encodeURIComponent(jobId)}/status`);
  }

  /**
   * Download roster output
   */
  async downloadRosterOutput(jobId: string, outputType: string): Promise<string> {
    const url = `${API_BASE_URL}/roster/${encodeURIComponent(jobId)}/download/${encodeURIComponent(outputType)}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`Failed to download roster output:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const doctorApiService = new DoctorApiService();

// Export individual functions for convenience - with proper binding
export const getAllDoctors = () => doctorApiService.getAllDoctors();
export const getDoctorById = (id: string) => doctorApiService.getDoctorById(id);
export const addDoctor = (doctorData: DoctorFormData) => doctorApiService.addDoctor(doctorData);
export const updateDoctor = (id: string, doctorData: Partial<DoctorFormData>) => doctorApiService.updateDoctor(id, doctorData);
export const removeDoctor = (id: string) => doctorApiService.removeDoctor(id);
export const getQuotes = () => doctorApiService.getQuotes();
export const getRandomQuote = () => doctorApiService.getRandomQuote();
export const healthCheck = () => doctorApiService.healthCheck();
export const checkRosterOverlap = (weeks: number, startDate: string) => doctorApiService.checkRosterOverlap(weeks, startDate);
export const generateRoster = (weeks: number, startDate?: string) => doctorApiService.generateRoster(weeks, startDate);
export const getRosterStatus = (jobId: string) => doctorApiService.getRosterStatus(jobId);
export const downloadRosterOutput = (jobId: string, outputType: string) => doctorApiService.downloadRosterOutput(jobId, outputType);