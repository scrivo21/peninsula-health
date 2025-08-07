export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface RegistrationFormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'scheduler' | 'doctor';
  eft?: number; // Optional for medical staff, 0.25-1.0
}

export interface RegistrationFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  eft?: string;
  general?: string;
}

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'scheduler' | 'doctor';
  fullName: string;
  eft?: number; // For medical staff
  createdAt: string;
  lastLogin?: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface RegistrationResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}