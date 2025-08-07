import React, { useState, useEffect } from 'react';
import styles from './ShiftFormModal.module.css';
import { ShiftConfig } from '../../services/configApi';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftData: ShiftConfig) => Promise<void>;
  shift?: ShiftConfig | null;
  shiftType: 'clinical' | 'non-clinical';
}

interface FormData extends ShiftConfig {
  [key: string]: any;
}

const SHIFT_TIMES = [
  { value: 'AM', label: 'Morning (AM)' },
  { value: 'PM', label: 'Evening (PM)' },
  { value: 'Admin', label: 'Administrative' }
];

const LOCATIONS = [
  { value: 'Frankston', label: 'Frankston Hospital' },
  { value: 'Rosebud', label: 'Rosebud Hospital' }
];

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  shift,
  shiftType
}) => {
  const [formData, setFormData] = useState<FormData>({
    location: 'Frankston',
    type: '',
    time: 'AM',
    start_time: '08:00',
    end_time: '18:00',
    duration_hours: 10,
    weighting: 0,
    is_leadership: false,
    requires_experience: false,
    description: '',
    weekdays_only: false
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or shift changes
  useEffect(() => {
    if (isOpen) {
      if (shift) {
        setFormData({ ...shift });
      } else {
        setFormData({
          location: 'Frankston',
          type: '',
          time: shiftType === 'clinical' ? 'AM' : 'Admin',
          start_time: shiftType === 'clinical' ? '08:00' : '08:00',
          end_time: shiftType === 'clinical' ? '18:00' : '16:00',
          duration_hours: shiftType === 'clinical' ? 10 : 8,
          weighting: 0,
          is_leadership: false,
          requires_experience: false,
          description: '',
          weekdays_only: shiftType === 'non-clinical'
        });
      }
      setErrors({});
    }
  }, [isOpen, shift, shiftType]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
    
    // Auto-calculate duration when times change
    if (field === 'start_time' || field === 'end_time') {
      const updatedData = { ...formData, [field]: value };
      if (updatedData.start_time && updatedData.end_time) {
        const duration = calculateDuration(updatedData.start_time, updatedData.end_time);
        setFormData(prev => ({
          ...prev,
          [field]: value,
          duration_hours: duration
        }));
      }
    }
  };

  const calculateDuration = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let start = startHour + startMin / 60;
    let end = endHour + endMin / 60;
    
    // Handle overnight shifts
    if (end < start) {
      end += 24;
    }
    
    return Math.round((end - start) * 100) / 100;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.type.trim()) {
      newErrors.type = 'Shift type is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (formData.duration_hours <= 0) {
      newErrors.duration_hours = 'Duration must be greater than 0';
    }
    
    if (formData.weighting < 0) {
      newErrors.weighting = 'Weighting cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving shift:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            🕐 {shift ? 'Edit' : 'Add'} {shiftType === 'clinical' ? 'Clinical' : 'Non-Clinical'} Shift
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalContent}>
            <div className={styles.formGrid}>
              {/* Basic Information */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Location <span className={styles.required}>*</span>
                  </label>
                  <select
                    className={styles.select}
                    value={formData.location}
                    onChange={e => handleInputChange('location', e.target.value)}
                  >
                    {LOCATIONS.map(location => (
                      <option key={location.value} value={location.value}>
                        {location.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Shift Type <span className={styles.required}>*</span>
                  </label>
                  <input
                    className={styles.input}
                    type="text"
                    value={formData.type}
                    onChange={e => handleInputChange('type', e.target.value)}
                    placeholder={shiftType === 'clinical' ? 'e.g. Blue, Green, Yellow' : 'e.g. Admin-1, Admin-PM-1'}
                  />
                  {errors.type && <div className={styles.errorText}>{errors.type}</div>}
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Time Period</label>
                  <select
                    className={styles.select}
                    value={formData.time}
                    onChange={e => handleInputChange('time', e.target.value)}
                  >
                    {SHIFT_TIMES.map(time => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Weighting (Penalty Score)
                  </label>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weighting}
                    onChange={e => handleInputChange('weighting', parseFloat(e.target.value) || 0)}
                  />
                  <div className={styles.helpText}>
                    Higher values make shifts more undesirable in optimization
                  </div>
                  {errors.weighting && <div className={styles.errorText}>{errors.weighting}</div>}
                </div>
              </div>

              {/* Time Details */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Time</label>
                  <input
                    className={styles.input}
                    type="time"
                    value={formData.start_time}
                    onChange={e => handleInputChange('start_time', e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>End Time</label>
                  <input
                    className={styles.input}
                    type="time"
                    value={formData.end_time}
                    onChange={e => handleInputChange('end_time', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Duration (Hours)</label>
                  <input
                    className={styles.input}
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={formData.duration_hours}
                    onChange={e => handleInputChange('duration_hours', parseFloat(e.target.value) || 0)}
                  />
                  {errors.duration_hours && <div className={styles.errorText}>{errors.duration_hours}</div>}
                </div>
              </div>

              {/* Description */}
              <div className={styles.formRow} style={{ gridColumn: '1 / -1' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Description <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    className={styles.textarea}
                    value={formData.description}
                    onChange={e => handleInputChange('description', e.target.value)}
                    placeholder="Describe the shift responsibilities and requirements"
                  />
                  {errors.description && <div className={styles.errorText}>{errors.description}</div>}
                </div>
              </div>

              {/* Attributes */}
              <div className={styles.formRow} style={{ gridColumn: '1 / -1' }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Shift Attributes</label>
                  <div className={styles.checkboxGroup}>
                    <div className={`${styles.checkboxItem} ${formData.is_leadership ? styles.checked : ''}`}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.is_leadership}
                        onChange={e => handleInputChange('is_leadership', e.target.checked)}
                      />
                      <div>
                        <div className={styles.checkboxLabel}>Leadership Role</div>
                        <div className={styles.checkboxDescription}>
                          This shift involves team leadership responsibilities
                        </div>
                      </div>
                    </div>

                    <div className={`${styles.checkboxItem} ${formData.requires_experience ? styles.checked : ''}`}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={formData.requires_experience}
                        onChange={e => handleInputChange('requires_experience', e.target.checked)}
                      />
                      <div>
                        <div className={styles.checkboxLabel}>Requires Experience</div>
                        <div className={styles.checkboxDescription}>
                          This shift requires experienced staff members
                        </div>
                      </div>
                    </div>

                    {shiftType === 'non-clinical' && (
                      <div className={`${styles.checkboxItem} ${formData.weekdays_only ? styles.checked : ''}`}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={formData.weekdays_only || false}
                          onChange={e => handleInputChange('weekdays_only', e.target.checked)}
                        />
                        <div>
                          <div className={styles.checkboxLabel}>Weekdays Only</div>
                          <div className={styles.checkboxDescription}>
                            This shift is only available on weekdays (Mon-Fri)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.cancel}`}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.save}`}
              disabled={saving}
            >
              {saving && <div className={styles.spinner} />}
              {saving ? 'Saving...' : (shift ? 'Update Shift' : 'Add Shift')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};