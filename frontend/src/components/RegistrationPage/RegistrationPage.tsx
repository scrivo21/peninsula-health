import React, { useState, useCallback, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RegistrationFormData, RegistrationFormErrors } from '../../types/auth';
import { Logo } from '../Logo';
import { validateRegistrationForm, hasFormErrors, sanitizeInput, getPasswordStrength } from '../../utils/validation';
import { apiClient, getErrorMessage } from '../../utils/api';
import styles from './RegistrationPage.module.css';

export const RegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<RegistrationFormData>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin', // All users are admin
    eft: undefined,
  });
  
  const [errors, setErrors] = useState<RegistrationFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(formData.password);

  const handleInputChange = useCallback((field: keyof RegistrationFormData) => {
    return (value: string | number) => {
      // Clear field-specific error when user starts typing
      if (errors[field as keyof RegistrationFormErrors]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field as keyof RegistrationFormErrors];
          return newErrors;
        });
      }

      setFormData(prev => ({
        ...prev,
        // For fullName, preserve spaces but still remove dangerous characters
        [field]: typeof value === 'string' 
          ? (field === 'fullName' ? value.replace(/[<>]/g, '') : sanitizeInput(value))
          : value,
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
    const validationErrors = validateRegistrationForm(formData);
    if (hasFormErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.register(formData);
      
      if (response.success && response.user) {
        // Registration successful - show success message and redirect
        console.log('Registration successful:', response.user);
        
        // Show success message
        alert(`Welcome ${response.user.fullName}! Your account has been created successfully. Please sign in to continue.`);
        
        // Navigate to login page
        navigate('/login');
        
      } else {
        setErrors({ general: response.message || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: getErrorMessage(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = (score: number): string => {
    if (score === 0) return '#EF4444'; // Red
    if (score <= 2) return '#F59E0B'; // Orange
    if (score <= 3) return '#10B981'; // Green
    return '#059669'; // Dark green
  };

  return (
    <div className={styles.registrationContainer}>
      <div className={styles.registrationCard}>
        <header className={styles.header}>
          <Logo size="large" showText={true} />
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Join the Shift Happens team</p>
        </header>

        {errors.general && (
          <div className={styles.generalError} role="alert">
            <p className={styles.generalErrorText}>{errors.general}</p>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Full Name field */}
          <div className={styles.inputGroup}>
            <label htmlFor="fullName" className={styles.label}>
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName')(e.target.value)}
              className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
              placeholder="Enter your full name"
              disabled={isLoading}
              aria-invalid={errors.fullName ? 'true' : 'false'}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            />
            {errors.fullName && (
              <div id="fullName-error" className={styles.errorText} role="alert">
                {errors.fullName}
              </div>
            )}
          </div>


          {/* Email */}
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
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
            {errors.email && (
              <div id="email-error" className={styles.errorText} role="alert">
                {errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password')(e.target.value)}
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder="Create a secure password"
                disabled={isLoading}
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            
            {formData.password && (
              <div className={styles.passwordStrength}>
                <div 
                  className={styles.strengthBar}
                  style={{
                    width: `${(passwordStrength.score / 5) * 100}%`,
                    backgroundColor: getPasswordStrengthColor(passwordStrength.score)
                  }}
                />
                <span 
                  className={styles.strengthText}
                  style={{ color: getPasswordStrengthColor(passwordStrength.score) }}
                >
                  {passwordStrength.feedback}
                </span>
              </div>
            )}
            
            {errors.password && (
              <div id="password-error" className={styles.errorText} role="alert">
                {errors.password}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password
            </label>
            <div className={styles.passwordWrapper}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword')(e.target.value)}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                placeholder="Confirm your password"
                disabled={isLoading}
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.confirmPassword && (
              <div id="confirmPassword-error" className={styles.errorText} role="alert">
                {errors.confirmPassword}
              </div>
            )}
          </div>


          <button
            type="submit"
            className={`${styles.submitButton} ${isLoading ? styles.submitButtonLoading : ''}`}
            disabled={isLoading || hasFormErrors(errors)}
          >
            {isLoading ? (
              <>
                <div className={styles.loadingSpinner} />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className={styles.loginLink}>
          <p>Already have an account?</p>
          <Link 
            to="/login" 
            className={styles.loginLinkButton}
            aria-disabled={isLoading}
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};