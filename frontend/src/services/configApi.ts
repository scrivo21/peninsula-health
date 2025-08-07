import { ApiResponse } from './doctorApi';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Config data types
export interface ShiftConfig {
  location: string;
  type: string;
  time: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  weighting: number;
  is_leadership: boolean;
  requires_experience: boolean;
  description: string;
  weekdays_only?: boolean;
}

export interface ShiftPenalties {
  undesirable_shift_base: number;
  leadership_role: number;
  friday_pm: number;
  rosebud_general: number;
  blue_role: number;
  green_role: number;
  brown_role: number;
  [key: string]: number; // Allow additional penalty types
}

export interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  from_name: string;
  from_email?: string;
}

export interface ConfigData {
  shifts?: {
    clinical_shifts?: ShiftConfig[];
    non_clinical_shifts?: ShiftConfig[];
  };
  shift_penalties?: ShiftPenalties;
  medical_quotes_and_facts?: {
    quotes?: string[];
  };
  email_settings?: EmailSettings;
}

class ConfigApiService {
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
      console.error(`Config API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<ApiResponse<ConfigData>> {
    return this.request<ConfigData>('/config');
  }

  /**
   * Update configuration
   */
  async updateConfig(configData: ConfigData): Promise<ApiResponse<void>> {
    return this.request<void>('/config', {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  }

  /**
   * Get defaults for a specific section
   */
  async getDefaults(section: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/config/defaults/${encodeURIComponent(section)}`);
  }

  /**
   * Force reload config cache
   */
  async reloadConfig(): Promise<ApiResponse<any>> {
    return this.request<any>('/debug/reload-config', {
      method: 'POST',
    });
  }

  /**
   * Get file watcher status
   */
  async getWatcherStatus(): Promise<ApiResponse<any>> {
    return this.request<any>('/debug/watcher-status');
  }
}

// Create and export singleton instance
export const configApiService = new ConfigApiService();

// Export convenience functions
export const getConfig = () => configApiService.getConfig();
export const updateConfig = (configData: ConfigData) => configApiService.updateConfig(configData);
export const getDefaults = (section: string) => configApiService.getDefaults(section);
export const reloadConfig = () => configApiService.reloadConfig();
export const getWatcherStatus = () => configApiService.getWatcherStatus();