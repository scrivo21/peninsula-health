import React, { useState, useCallback, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LoginFormData, LoginFormErrors } from '../../types/auth';
import { Logo } from '../Logo';
import { validateLoginForm, hasFormErrors, sanitizeInput } from '../../utils/validation';
import { apiClient, getErrorMessage } from '../../utils/api';
import styles from './LoginPage.module.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Check if user is already logged in
  React.useEffect(() => {
    const userData = localStorage.getItem('shift_happens_user');
    if (userData) {
      // User is already logged in, redirect to dashboard
      navigate('/dashboard');
    }
  }, [navigate]);
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = useCallback((field: keyof LoginFormData) => {
    return (value: string | boolean) => {
      // Clear field-specific error when user starts typing
      if (errors[field as keyof LoginFormErrors]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof LoginFormErrors];
          return newErrors;
        });
      }

      setFormData(prev => ({
        ...prev,
        [field]: typeof value === 'string' ? sanitizeInput(value) : value,
      }));
    };
  }, [errors]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Clear any general errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.general;
      return newErrors;
    });

    // Validate form
    const validationErrors = validateLoginForm(formData);
    if (hasFormErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.login(formData);
      
      if (response.success && response.user && response.token) {
        // Store token and user data
        if (formData.rememberMe && response.token) {
          localStorage.setItem('shift_happens_token', response.token);
          localStorage.setItem('shift_happens_user', JSON.stringify(response.user));
        } else {
          sessionStorage.setItem('shift_happens_token', response.token);
          localStorage.setItem('shift_happens_user', JSON.stringify(response.user));
        }
        
        console.log('Login successful:', response.user);
        
        // Navigate to dashboard
        navigate('/dashboard');
        
      } else {
        setErrors({ general: response.message || 'Login failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // In a real app, this would navigate to forgot password page
    alert('Forgot password functionality would be implemented here.');
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <header className={styles.header}>
          <Logo size="large" showText={true} customSize={200} />
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>Sign in to your account</p>
        </header>

        {errors.general && (
          <div className={styles.generalError} role="alert">
            <p className={styles.generalErrorText}>{errors.general}</p>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email')(e.target.value)}
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="Enter your email address"
                disabled={isLoading}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            {errors.email && (
              <div id="email-error" className={styles.errorText} role="alert">
                {errors.email}
              </div>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password')(e.target.value)}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="Enter your password"
                disabled={isLoading}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
            </div>
            {errors.password && (
              <div id="password-error" className={styles.errorText} role="alert">
                {errors.password}
              </div>
            )}
          </div>

          <div className={styles.checkboxGroup}>
            <div
              className={`${styles.checkbox} ${formData.rememberMe ? styles.checkboxChecked : ''}`}
              onClick={() => handleInputChange('rememberMe')(!formData.rememberMe)}
              role="checkbox"
              aria-checked={formData.rememberMe}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleInputChange('rememberMe')(!formData.rememberMe);
                }
              }}
            >
              {formData.rememberMe && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <label 
              className={styles.checkboxLabel}
              onClick={() => handleInputChange('rememberMe')(!formData.rememberMe)}
            >
              Remember me
            </label>
          </div>

          <button
            type="submit"
            className={`${styles.submitButton} ${isLoading ? styles.submitButtonLoading : ''}`}
            disabled={isLoading || hasFormErrors(errors)}
          >
            {isLoading ? (
              <>
                <div className={styles.loadingSpinner} />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className={styles.authLinks}>
          <button
            type="button"
            className={styles.forgotPasswordLink}
            onClick={handleForgotPassword}
            disabled={isLoading}
          >
            Forgot your password?
          </button>
        </div>

        <div className={styles.registerLink}>
          <p>Don't have an account?</p>
          <Link 
            to="/register" 
            className={styles.registerLinkButton}
            aria-disabled={isLoading}
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};