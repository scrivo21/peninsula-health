import React, { useState, useEffect } from 'react';
import { DoctorProfile } from '../../types/doctor';
import { RosterGenerationRequest } from '../../types/schedule';
import '../../styles/components.css';
import styles from './RosterGenerationModal.module.css';

interface RosterGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (request: RosterGenerationRequest) => void;
  doctors: DoctorProfile[];
  isLoading?: boolean;
}

export const RosterGenerationModal: React.FC<RosterGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  doctors,
  isLoading = false
}) => {
  const [startDate, setStartDate] = useState('');
  const [weekCount, setWeekCount] = useState(4);
  const [hospitals, setHospitals] = useState<string[]>(['Frankston', 'Rosebud']);
  const [excludeDoctors, setExcludeDoctors] = useState<string[]>([]);

  // Set default start date to next week
  useEffect(() => {
    if (isOpen && !startDate) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setStartDate(nextWeek.toISOString().split('T')[0]);
    }
  }, [isOpen, startDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate) {
      alert('Please select a start date');
      return;
    }

    // Calculate end date based on week count
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (weekCount * 7) - 1); // -1 because we want inclusive end date

    const request: RosterGenerationRequest = {
      start_date: startDate,
      end_date: end.toISOString().split('T')[0],
      hospitals: hospitals as any[],
      shift_types: [],
      exclude_doctors: excludeDoctors
    };

    onGenerate(request);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleHospitalToggle = (hospital: string) => {
    setHospitals(prev => 
      prev.includes(hospital)
        ? prev.filter(h => h !== hospital)
        : [...prev, hospital]
    );
  };

  const handleDoctorToggle = (doctorId: string) => {
    setExcludeDoctors(prev =>
      prev.includes(doctorId)
        ? prev.filter(id => id !== doctorId)
        : [...prev, doctorId]
    );
  };

  const getEndDate = () => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (weekCount * 7) - 1);
    return end.toLocaleDateString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate week options (1-26)
  const weekOptions = Array.from({ length: 26 }, (_, i) => i + 1);

  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={handleOverlayClick}>
      <div className={`modalContent ${styles.generationModal}`}>
        <div className="modalHeader">
          <h2 className="modalTitle">Generate New Roster</h2>
          <button
            className="modalCloseButton"
            onClick={onClose}
            aria-label="Close generation modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.generationForm}>
          <div className={styles.formSection}>
            {/* Start Date Selection */}
            <div className={styles.dateSection}>
              <div className="formGroup">
                <label htmlFor="start_date" className="formLabel">Start Date</label>
                <input
                  type="date"
                  id="start_date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="formInput"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="formGroup">
                <label htmlFor="week_count" className="formLabel">Duration</label>
                <select
                  id="week_count"
                  value={weekCount}
                  onChange={(e) => setWeekCount(parseInt(e.target.value))}
                  className="formInput"
                >
                  {weekOptions.map(weeks => (
                    <option key={weeks} value={weeks}>
                      {weeks} week{weeks !== 1 ? 's' : ''}
                      {weeks === 4 && ' (1 month)'}
                      {weeks === 13 && ' (3 months)'}
                      {weeks === 26 && ' (6 months)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Preview */}
            {startDate && (
              <div className={styles.datePreview}>
                <span className={styles.previewLabel}>Roster Period:</span>
                <span className={styles.previewRange}>
                  {new Date(startDate).toLocaleDateString('en-AU', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })} 
                  {' → '} 
                  {getEndDate()}
                </span>
                <span className={styles.previewDuration}>({weekCount * 7} days)</span>
              </div>
            )}

            {/* Hospital Selection */}
            <div className="formGroup">
              <label className="formLabel">Hospitals</label>
              <div className={styles.hospitalSelection}>
                {['Frankston', 'Rosebud'].map((hospital) => (
                  <label key={hospital} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={hospitals.includes(hospital)}
                      onChange={() => handleHospitalToggle(hospital)}
                    />
                    <span className={styles.checkboxText}>{hospital}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Doctor Exclusions */}
            <div className="formGroup">
              <label className="formLabel">
                Exclude Doctors ({excludeDoctors.length} selected)
              </label>
              <div className={styles.doctorList}>
                {doctors.map((doctor) => (
                  <label key={doctor.id} className={styles.doctorCheckbox}>
                    <input
                      type="checkbox"
                      checked={excludeDoctors.includes(doctor.id)}
                      onChange={() => handleDoctorToggle(doctor.id)}
                    />
                    <span className={styles.doctorName}>{doctor.name}</span>
                    <span className={styles.doctorEft}>({doctor.eft} EFT)</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              className="btnSecondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btnPrimary"
              disabled={isLoading || !startDate || hospitals.length === 0}
            >
              {isLoading ? (
                <>
                  <span className={styles.loadingSpinner}></span>
                  Generating...
                </>
              ) : (
                <>
                  🚀 Generate Roster
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};