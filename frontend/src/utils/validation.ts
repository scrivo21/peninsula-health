import { LoginFormData, LoginFormErrors, RegistrationFormData, RegistrationFormErrors } from '../types/auth';

export const validateLoginForm = (formData: LoginFormData): LoginFormErrors => {
  const errors: LoginFormErrors = {};

  // Email validation
  if (!formData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    errors.email = 'Please enter a valid email address';
  }

  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  } else if (formData.password.length > 128) {
    errors.password = 'Password must be less than 128 characters';
  }

  return errors;
};

export const validateRegistrationForm = (formData: RegistrationFormData): RegistrationFormErrors => {
  const errors: RegistrationFormErrors = {};

  // Full name validation
  if (!formData.fullName.trim()) {
    errors.fullName = 'Full name is required';
  } else if (formData.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters';
  } else if (formData.fullName.trim().length > 100) {
    errors.fullName = 'Full name must be less than 100 characters';
  } else if (!/^[a-zA-Z\s'-]+$/.test(formData.fullName.trim())) {
    errors.fullName = 'Full name can only contain letters, spaces, hyphens, and apostrophes';
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email.trim()) {
    errors.email = 'Email is required';
  } else if (!emailRegex.test(formData.email.trim())) {
    errors.email = 'Please enter a valid email address';
  } else if (formData.email.trim().length > 254) {
    errors.email = 'Email address is too long';
  }

  // Password validation with complexity requirements
  if (!formData.password) {
    errors.password = 'Password is required';
  } else if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (formData.password.length > 128) {
    errors.password = 'Password must be less than 128 characters';
  } else {
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      errors.password = 'Password must include uppercase, lowercase, number, and special character';
    }
  }

  // Confirm password validation
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Role validation
  if (!formData.role) {
    errors.role = 'Please select a role';
  } else if (!['admin', 'scheduler', 'doctor'].includes(formData.role)) {
    errors.role = 'Please select a valid role';
  }

  // EFT validation for doctors
  if (formData.role === 'doctor') {
    if (formData.eft === undefined || formData.eft === null) {
      errors.eft = 'EFT is required for medical staff';
    } else if (formData.eft < 0.25) {
      errors.eft = 'EFT must be at least 0.25 (25%)';
    } else if (formData.eft > 1.0) {
      errors.eft = 'EFT cannot exceed 1.0 (100%)';
    } else if (!/^\d*\.?\d{0,2}$/.test(formData.eft.toString())) {
      errors.eft = 'EFT must be a valid decimal (e.g., 0.8)';
    }
  }

  return errors;
};

export const hasFormErrors = (errors: LoginFormErrors | RegistrationFormErrors): boolean => {
  return Object.keys(errors).length > 0;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const getPasswordStrength = (password: string): { score: number; feedback: string } => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1;
  else feedback.push('at least 8 characters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('uppercase letter');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('lowercase letter');

  if (/\d/.test(password)) score += 1;
  else feedback.push('number');

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  else feedback.push('special character');

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthLabel = strengthLabels[Math.min(score, 4)];

  return {
    score,
    feedback: feedback.length > 0 ? `Add: ${feedback.join(', ')}` : strengthLabel,
  };
};