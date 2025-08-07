import { LoginFormData, LoginResponse, RegistrationFormData, RegistrationResponse } from '../types/auth';
import { UserStorageService } from './userStorage';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 10000; // 10 seconds

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private useLocalAuth: boolean;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    // Use local authentication for demo purposes
    this.useLocalAuth = !process.env.REACT_APP_API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code,
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request timeout. Please try again.', 'TIMEOUT');
      }
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        'Network error. Please check your connection and try again.',
        'NETWORK_ERROR'
      );
    }
  }

  async login(credentials: LoginFormData): Promise<LoginResponse> {
    // Use local authentication for demo
    if (this.useLocalAuth) {
      try {
        const result = await UserStorageService.authenticateUser(
          credentials.email,
          credentials.password
        );

        if (result.success && result.user) {
          // Generate a simple token for the session
          const token = btoa(JSON.stringify({
            userId: result.user.id,
            email: result.user.email,
            timestamp: Date.now(),
          }));

          // Store user as current user
          UserStorageService.setCurrentUser(result.user);

          return {
            success: true,
            user: result.user,
            token,
            message: 'Login successful',
          };
        } else {
          return {
            success: false,
            message: result.message || 'Login failed',
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Login failed. Please try again.',
        };
      }
    }

    // Fallback to API call for production
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      }),
    });
  }

  async register(registrationData: RegistrationFormData): Promise<RegistrationResponse> {
    // Use local authentication for demo
    if (this.useLocalAuth) {
      try {
        const result = await UserStorageService.registerUser(registrationData);

        if (result.success && result.user) {
          // Generate a simple token for the session
          const token = btoa(JSON.stringify({
            userId: result.user.id,
            email: result.user.email,
            timestamp: Date.now(),
          }));

          return {
            success: true,
            user: result.user,
            token,
            message: 'Registration successful',
          };
        } else {
          return {
            success: false,
            message: result.message || 'Registration failed',
          };
        }
      } catch (error) {
        return {
          success: false,
          message: 'Registration failed. Please try again.',
        };
      }
    }

    // Fallback to API call for production
    return this.request<RegistrationResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: registrationData.fullName.trim(),
        email: registrationData.email.trim().toLowerCase(),
        password: registrationData.password,
        role: registrationData.role,
        eft: registrationData.eft,
      }),
    });
  }

  async refreshToken(): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/refresh', {
      method: 'POST',
    });
  }

  async logout(): Promise<void> {
    // For local authentication, just clear the current user
    if (this.useLocalAuth) {
      UserStorageService.clearCurrentUser();
      return;
    }

    // Fallback to API call for production
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  // Method to check username availability
  async checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
    if (this.useLocalAuth) {
      const isExists = UserStorageService.isUsernameExists(username);
      return { available: !isExists };
    }

    return this.request<{ available: boolean }>(`/auth/check-username/${encodeURIComponent(username)}`, {
      method: 'GET',
    });
  }

  // Method to check email availability
  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    if (this.useLocalAuth) {
      const isExists = UserStorageService.isEmailExists(email);
      return { available: !isExists };
    }

    return this.request<{ available: boolean }>(`/auth/check-email/${encodeURIComponent(email)}`, {
      method: 'GET',
    });
  }

  // Method to get current user
  getCurrentUser() {
    if (this.useLocalAuth) {
      return UserStorageService.getCurrentUser();
    }

    // In production, this might check a stored token or make an API call
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Method to create demo users
  async createDemoUsers(): Promise<void> {
    if (this.useLocalAuth) {
      await UserStorageService.createDemoUsers();
    }
  }
}

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Utility function for handling API errors
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Create singleton instance
export const apiClient = new ApiClient();