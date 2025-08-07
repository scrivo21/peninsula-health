import {
  RosterGenerationRequest,
  BackendRosterRequest,
  RosterGenerationResponse,
  RosterStatusResponse,
  ShiftModificationRequest,
  ExportFormat,
  ExportResponse
} from '../types/schedule';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class RosterApiService {
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
   * Check for roster overlap before generation
   */
  async checkRosterOverlap(request: BackendRosterRequest): Promise<ApiResponse<{
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
      body: JSON.stringify(request),
    });
  }

  /**
   * Generate a new roster
   */
  async generateRoster(request: BackendRosterRequest): Promise<ApiResponse<RosterGenerationResponse>> {
    return this.request<RosterGenerationResponse>('/roster/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Check the status of a roster generation job
   */
  async getRosterStatus(jobId: string): Promise<ApiResponse<RosterStatusResponse>> {
    return this.request<RosterStatusResponse>(`/roster/${jobId}/status`);
  }

  /**
   * Add shifts to an existing roster
   */
  async addShiftsToRoster(
    jobId: string,
    modifications: ShiftModificationRequest
  ): Promise<ApiResponse<{ message: string; updated_shifts: number }>> {
    return this.request<{ message: string; updated_shifts: number }>(
      `/roster/${jobId}/shifts`,
      {
        method: 'POST',
        body: JSON.stringify(modifications),
      }
    );
  }

  /**
   * Remove shifts from an existing roster
   */
  async removeShiftsFromRoster(
    jobId: string,
    modifications: ShiftModificationRequest
  ): Promise<ApiResponse<{ message: string; updated_shifts: number }>> {
    return this.request<{ message: string; updated_shifts: number }>(
      `/roster/${jobId}/shifts`,
      {
        method: 'DELETE',
        body: JSON.stringify(modifications),
      }
    );
  }

  /**
   * Reassign a shift to a different doctor (tracks as modified)
   */
  async reassignShift(
    jobId: string,
    date: string,
    shiftName: string,
    currentDoctor: string,
    newDoctor: string
  ): Promise<ApiResponse<{ message: string; data: any }>> {
    return this.request<{ message: string; data: any }>(
      `/roster/${jobId}/shifts/reassign`,
      {
        method: 'PUT',
        body: JSON.stringify({
          date,
          shiftName,
          currentDoctor,
          newDoctor
        }),
      }
    );
  }

  /**
   * Export roster as CSV
   */
  async exportRosterCSV(
    jobId: string,
    format: 'all' | 'distribution' | 'management'
  ): Promise<ApiResponse<ExportResponse>> {
    return this.request<ExportResponse>(`/roster/${jobId}/export/csv/${format}`);
  }

  /**
   * Export roster as PDF
   */
  async exportRosterPDF(
    jobId: string,
    format: 'all' | 'distribution' | 'management'
  ): Promise<ApiResponse<ExportResponse>> {
    return this.request<ExportResponse>(`/roster/${jobId}/export/pdf/${format}`);
  }

  /**
   * Download a file from URL (for exports)
   */
  async downloadFile(downloadUrl: string, filename: string): Promise<void> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a roster generation job
   */
  async cancelRosterGeneration(jobId: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`/roster/${jobId}/cancel`, {
      method: 'POST',
    });
  }

  /**
   * Poll roster status until completion or failure
   */
  async pollRosterStatus(
    jobId: string,
    onProgress?: (status: RosterStatusResponse) => void,
    maxAttempts: number = 120, // 2 minutes with 1-second intervals
    interval: number = 1000
  ): Promise<RosterStatusResponse> {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await this.getRosterStatus(jobId);
          
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to get roster status');
          }

          const status = response.data;
          
          if (onProgress) {
            onProgress(status);
          }

          if (status.status === 'completed') {
            resolve(status);
            return;
          }

          if (status.status === 'failed' || status.status === 'cancelled') {
            reject(new Error(status.error || `Roster generation ${status.status}`));
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Roster generation timed out'));
            return;
          }

          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Finalize a roster (mark as ready for distribution)
   */
  async finalizeRoster(jobId: string, user?: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/roster/${jobId}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ user }),
    });
  }

  /**
   * Unfinalize a roster (allow edits again)
   */
  async unfinalizeRoster(jobId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/roster/${jobId}/unfinalize`, {
      method: 'POST',
    });
  }

  /**
   * Distribute roster via email to all doctors
   */
  async distributeRoster(
    jobId: string, 
    options: { test_mode?: boolean; test_email?: string } = {}
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/roster/${jobId}/distribute`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Get distribution status for a roster
   */
  async getDistributionStatus(jobId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/roster/${jobId}/distribution-status`);
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration(recipientEmail: string): Promise<ApiResponse<any>> {
    return this.request<any>('/email/test', {
      method: 'POST',
      body: JSON.stringify({ recipient_email: recipientEmail }),
    });
  }

  /**
   * Get email configuration status
   */
  async getEmailStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/email/status');
  }
}

// Create singleton instance
const rosterApiService = new RosterApiService();

// Export individual methods for easier testing and usage
export const checkRosterOverlap = (request: BackendRosterRequest) =>
  rosterApiService.checkRosterOverlap(request);

export const generateRoster = (request: BackendRosterRequest) =>
  rosterApiService.generateRoster(request);

export const getRosterStatus = (jobId: string) =>
  rosterApiService.getRosterStatus(jobId);

export const addShiftsToRoster = (jobId: string, modifications: ShiftModificationRequest) =>
  rosterApiService.addShiftsToRoster(jobId, modifications);

export const removeShiftsFromRoster = (jobId: string, modifications: ShiftModificationRequest) =>
  rosterApiService.removeShiftsFromRoster(jobId, modifications);

export const reassignShift = (
  jobId: string,
  date: string,
  shiftName: string,
  currentDoctor: string,
  newDoctor: string
) => rosterApiService.reassignShift(jobId, date, shiftName, currentDoctor, newDoctor);

export const exportRosterCSV = (jobId: string, format: 'all' | 'distribution' | 'management') =>
  rosterApiService.exportRosterCSV(jobId, format);

export const exportRosterPDF = (jobId: string, format: 'all' | 'distribution' | 'management') =>
  rosterApiService.exportRosterPDF(jobId, format);

export const downloadFile = (downloadUrl: string, filename: string) =>
  rosterApiService.downloadFile(downloadUrl, filename);

export const cancelRosterGeneration = (jobId: string) =>
  rosterApiService.cancelRosterGeneration(jobId);

export const pollRosterStatus = (
  jobId: string,
  onProgress?: (status: RosterStatusResponse) => void,
  maxAttempts?: number,
  interval?: number
) => rosterApiService.pollRosterStatus(jobId, onProgress, maxAttempts, interval);

export const finalizeRoster = (jobId: string, user?: string) =>
  rosterApiService.finalizeRoster(jobId, user);

export const unfinalizeRoster = (jobId: string) =>
  rosterApiService.unfinalizeRoster(jobId);

export const distributeRoster = (jobId: string, options?: { test_mode?: boolean; test_email?: string }) =>
  rosterApiService.distributeRoster(jobId, options);

export const getDistributionStatus = (jobId: string) =>
  rosterApiService.getDistributionStatus(jobId);

export const testEmailConfiguration = (recipientEmail: string) =>
  rosterApiService.testEmailConfiguration(recipientEmail);

export const getEmailStatus = () =>
  rosterApiService.getEmailStatus();

export default rosterApiService;