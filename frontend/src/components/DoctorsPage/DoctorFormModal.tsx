import React, { useState, useEffect } from 'react';
import { DoctorProfile, DoctorFormData, SHIFT_PREFERENCES, SPECIALIZATIONS, DOCTOR_AVATARS } from '../../types/doctor';
import styles from './DoctorFormModal.module.css';

interface DoctorFormModalProps {
  title: string;
  doctor?: DoctorProfile;
  onSave: (doctor: DoctorFormData) => void;
  onCancel: () => void;
}

export const DoctorFormModal: React.FC<DoctorFormModalProps> = ({
  title,
  doctor,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<DoctorFormData>({
    name: '',
    eft: 0.8,
    rosebud_preference: 0,
    unavailable_dates: [],
    preferred_shifts: [],
    email: '',
    phone: '',
    specialization: 'Emergency Medicine',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
    avatar: '🦸'
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [newUnavailableDate, setNewUnavailableDate] = useState('');

  // Initialize form data when editing
  useEffect(() => {
    if (doctor) {
      setFormData({
        name: doctor.name,
        eft: doctor.eft,
        rosebud_preference: doctor.rosebud_preference,
        unavailable_dates: [...doctor.unavailable_dates],
        preferred_shifts: [...doctor.preferred_shifts],
        email: doctor.email || '',
        phone: doctor.phone || '',
        specialization: doctor.specialization || 'Emergency Medicine',
        hire_date: doctor.hire_date || new Date().toISOString().split('T')[0],
        status: doctor.status,
        avatar: doctor.avatar || '🦸'
      });
    }
  }, [doctor]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (formData.eft < 0.25 || formData.eft > 1.0) {
      newErrors.eft = 'EFT must be between 0.25 and 1.0';
    }

    if (formData.rosebud_preference < -2 || formData.rosebud_preference > 2) {
      newErrors.rosebud_preference = 'Rosebud preference must be between -2 and 2';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\+]?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleInputChange = (field: keyof DoctorFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleShiftToggle = (shift: string) => {
    const isSelected = formData.preferred_shifts.includes(shift);
    const newShifts = isSelected
      ? formData.preferred_shifts.filter(s => s !== shift)
      : [...formData.preferred_shifts, shift];
    
    handleInputChange('preferred_shifts', newShifts);
  };

  const handleAddUnavailableDate = () => {
    if (newUnavailableDate && !formData.unavailable_dates.includes(newUnavailableDate)) {
      handleInputChange('unavailable_dates', [...formData.unavailable_dates, newUnavailableDate]);
      setNewUnavailableDate('');
    }
  };

  const handleRemoveUnavailableDate = (dateToRemove: string) => {
    handleInputChange('unavailable_dates', formData.unavailable_dates.filter(date => date !== dateToRemove));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Full Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  placeholder="Dr. John Smith"
                />
                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className={styles.select}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                  placeholder="doctor@peninsulahealth.org.au"
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                  placeholder="+61 3 9784 7777"
                />
                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Specialization</label>
                <select
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  className={styles.select}
                >
                  {SPECIALIZATIONS.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Hire Date</label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
          </div>

          {/* Avatar Selection */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Avatar</h3>
            <p className={styles.sectionDescription}>
              Choose a fun avatar to represent this doctor in the system.
            </p>
            
            <div className={styles.avatarGrid}>
              {DOCTOR_AVATARS.map(avatar => (
                <button
                  key={avatar}
                  type="button"
                  className={`${styles.avatarOption} ${formData.avatar === avatar ? styles.avatarSelected : ''}`}
                  onClick={() => handleInputChange('avatar', avatar)}
                >
                  <span className={styles.avatarEmoji}>{avatar}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Work Preferences */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Work Preferences</h3>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  EFT (Equivalent Full Time) <span className={styles.required}>*</span>
                </label>
                <div className={styles.eftInputContainer}>
                  <input
                    type="number"
                    min="0.25"
                    max="1.0"
                    step="0.05"
                    value={formData.eft}
                    onChange={(e) => handleInputChange('eft', parseFloat(e.target.value))}
                    className={`${styles.input} ${errors.eft ? styles.inputError : ''}`}
                  />
                  <span className={styles.eftPercentage}>
                    ({Math.round(formData.eft * 100)}%)
                  </span>
                </div>
                <p className={styles.helpText}>
                  Working {Math.round(formData.eft * 40)} hours per week
                </p>
                {errors.eft && <span className={styles.errorText}>{errors.eft}</span>}
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Rosebud Hospital Preference</label>
                <select
                  value={formData.rosebud_preference}
                  onChange={(e) => handleInputChange('rosebud_preference', parseInt(e.target.value))}
                  className={`${styles.select} ${errors.rosebud_preference ? styles.inputError : ''}`}
                >
                  <option value={-2}>-2 (Strongly Dislike)</option>
                  <option value={-1}>-1 (Dislike)</option>
                  <option value={0}>0 (Neutral)</option>
                  <option value={1}>+1 (Like)</option>
                  <option value={2}>+2 (Prefer)</option>
                </select>
                {errors.rosebud_preference && <span className={styles.errorText}>{errors.rosebud_preference}</span>}
              </div>
            </div>
          </div>

          {/* Preferred Shifts */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Preferred Shifts</h3>
            <p className={styles.sectionDescription}>
              Select the shifts this doctor prefers to work. This helps with scheduling optimization.
            </p>
            
            <div className={styles.shiftsGrid}>
              {SHIFT_PREFERENCES.map(shift => (
                <label key={shift} className={styles.shiftOption}>
                  <input
                    type="checkbox"
                    checked={formData.preferred_shifts.includes(shift)}
                    onChange={() => handleShiftToggle(shift)}
                    className={styles.checkbox}
                  />
                  <span className={styles.shiftLabel}>{shift}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Unavailable Dates */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Unavailable Dates</h3>
            <p className={styles.sectionDescription}>
              Add dates when this doctor is not available for shifts.
            </p>
            
            <div className={styles.dateInputContainer}>
              <input
                type="date"
                value={newUnavailableDate}
                onChange={(e) => setNewUnavailableDate(e.target.value)}
                className={styles.input}
                min={new Date().toISOString().split('T')[0]}
              />
              <button
                type="button"
                onClick={handleAddUnavailableDate}
                className={styles.addDateButton}
                disabled={!newUnavailableDate}
              >
                Add Date
              </button>
            </div>

            {formData.unavailable_dates.length > 0 && (
              <div className={styles.unavailableDatesList}>
                {formData.unavailable_dates.map(date => (
                  <div key={date} className={styles.dateTag}>
                    <span>{formatDate(date)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUnavailableDate(date)}
                      className={styles.removeDateButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onCancel}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
            >
              {doctor ? 'Update Doctor' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};