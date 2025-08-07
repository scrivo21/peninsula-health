import React, { useMemo } from 'react';
import { DoctorProfile, DoctorListFilters, ROSEBUD_PREFERENCE_SCALE } from '../../types/doctor';
import styles from './DoctorList.module.css';

interface DoctorListProps {
  doctors: DoctorProfile[];
  selectedDoctor: DoctorProfile | null;
  filters: DoctorListFilters;
  onDoctorSelect: (doctor: DoctorProfile) => void;
  onFiltersChange: (filters: DoctorListFilters) => void;
  onRemoveDoctor: (doctorId: string) => void;
}

export const DoctorList: React.FC<DoctorListProps> = ({
  doctors,
  selectedDoctor,
  filters,
  onDoctorSelect,
  onFiltersChange,
  onRemoveDoctor
}) => {
  // Filter and search doctors
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doctor => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (!doctor.name.toLowerCase().includes(searchTerm) &&
            !doctor.specialization?.toLowerCase().includes(searchTerm) &&
            !doctor.email?.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && doctor.status !== filters.status) {
        return false;
      }

      // EFT range filter
      if (doctor.eft < filters.eft_range.min || doctor.eft > filters.eft_range.max) {
        return false;
      }

      // Rosebud preference filter
      if (filters.rosebud_preference !== 'all') {
        if (filters.rosebud_preference === 'positive' && doctor.rosebud_preference <= 0) {
          return false;
        }
        if (filters.rosebud_preference === 'neutral' && doctor.rosebud_preference !== 0) {
          return false;
        }
        if (filters.rosebud_preference === 'negative' && doctor.rosebud_preference >= 0) {
          return false;
        }
      }

      return true;
    });
  }, [doctors, filters]);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleStatusChange = (status: DoctorListFilters['status']) => {
    onFiltersChange({ ...filters, status });
  };

  const handleEftRangeChange = (min: number, max: number) => {
    onFiltersChange({ 
      ...filters, 
      eft_range: { min, max } 
    });
  };

  const handleRosebudPreferenceChange = (preference: DoctorListFilters['rosebud_preference']) => {
    onFiltersChange({ ...filters, rosebud_preference: preference });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active': return styles.statusActive;
      case 'inactive': return styles.statusInactive;
      case 'on_leave': return styles.statusOnLeave;
      default: return styles.statusActive;
    }
  };

  const getRosebudPreferenceText = (preference: number) => {
    return ROSEBUD_PREFERENCE_SCALE[preference.toString() as keyof typeof ROSEBUD_PREFERENCE_SCALE] || 'Unknown';
  };

  const getRosebudPreferenceClass = (preference: number) => {
    if (preference > 0) return styles.preferencePositive;
    if (preference < 0) return styles.preferenceNegative;
    return styles.preferenceNeutral;
  };

  return (
    <div className={styles.doctorListContainer}>
      {/* Header */}
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>
          Doctors ({filteredDoctors.length})
        </h2>
      </div>

      {/* Filters */}
      <div className={styles.filtersSection}>
        {/* Search */}
        <div className={styles.filterGroup}>
          <input
            type="text"
            placeholder="Search by name, specialty, email..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {/* Status Filter */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value as DoctorListFilters['status'])}
            className={styles.filterSelect}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        {/* EFT Range */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>EFT Range</label>
          <div className={styles.rangeInputs}>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={filters.eft_range.min}
              onChange={(e) => handleEftRangeChange(parseFloat(e.target.value), filters.eft_range.max)}
              className={styles.rangeInput}
            />
            <span>to</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={filters.eft_range.max}
              onChange={(e) => handleEftRangeChange(filters.eft_range.min, parseFloat(e.target.value))}
              className={styles.rangeInput}
            />
          </div>
        </div>

        {/* Rosebud Preference */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Rosebud Preference</label>
          <select
            value={filters.rosebud_preference}
            onChange={(e) => handleRosebudPreferenceChange(e.target.value as DoctorListFilters['rosebud_preference'])}
            className={styles.filterSelect}
          >
            <option value="all">All Preferences</option>
            <option value="positive">Likes Rosebud</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Dislikes Rosebud</option>
          </select>
        </div>
      </div>

      {/* Doctor List */}
      <div className={styles.doctorsList}>
        {filteredDoctors.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <p>No doctors found matching your filters.</p>
            <button 
              className={styles.clearFiltersButton}
              onClick={() => onFiltersChange({
                search: '',
                status: 'all',
                eft_range: { min: 0, max: 1 },
                rosebud_preference: 'all'
              })}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredDoctors.map((doctor) => (
            <div
              key={doctor.id}
              className={`${styles.doctorCard} ${
                selectedDoctor?.id === doctor.id ? styles.doctorCardSelected : ''
              }`}
              onClick={() => onDoctorSelect(doctor)}
            >
              {/* Header */}
              <div className={styles.doctorCardHeader}>
                <div className={styles.doctorAvatarSmall}>
                  {doctor.avatar ? (
                    <span className={styles.avatarEmojiSmall}>{doctor.avatar}</span>
                  ) : (
                    doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className={styles.doctorInfo}>
                  <h3 className={styles.doctorName}>{doctor.name}</h3>
                  <p className={styles.doctorSpecialty}>{doctor.specialization}</p>
                </div>
                <div className={styles.doctorActions}>
                  <button
                    className={styles.removeButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveDoctor(doctor.id);
                    }}
                    title="Remove doctor"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Status and EFT */}
              <div className={styles.doctorMeta}>
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(doctor.status)}`}>
                  {doctor.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={styles.eftBadge}>
                  EFT: {doctor.eft}
                </span>
              </div>

              {/* Rosebud Preference */}
              <div className={styles.rosebudPreference}>
                <span className={styles.preferenceLabel}>Rosebud:</span>
                <span className={`${styles.preferenceValue} ${getRosebudPreferenceClass(doctor.rosebud_preference)}`}>
                  {getRosebudPreferenceText(doctor.rosebud_preference)}
                </span>
              </div>

              {/* Quick Stats */}
              <div className={styles.quickStats}>
                <span className={styles.statItem}>
                  📅 {doctor.total_shifts_this_month || 0} shifts
                </span>
                <span className={styles.statItem}>
                  ⚠ {doctor.undesirable_shifts_assigned || 0} undesirable
                </span>
              </div>

              {/* Unavailable Dates */}
              {doctor.unavailable_dates.length > 0 && (
                <div className={styles.unavailableDates}>
                  <span className={styles.unavailableLabel}>
                    🚫 {doctor.unavailable_dates.length} unavailable dates
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};