import React, { useState, useEffect } from 'react';
import { DoctorProfile, ROSEBUD_PREFERENCE_SCALE } from '../../types/doctor';
import { UnavailabilitySection } from './UnavailabilitySection';
import styles from './DoctorProfileView.module.css';

interface GeneratedShift {
  date: string;
  shift_name: string;
  site: string;
  role: string;
  shift_type: string;
  hours: number;
  is_undesirable?: boolean;
  is_leadership?: boolean;
}

interface DoctorProfileViewProps {
  doctor: DoctorProfile;
  onEdit: () => void;
  onRemove: () => void;
}

export const DoctorProfileView: React.FC<DoctorProfileViewProps> = ({
  doctor,
  onEdit,
  onRemove
}) => {
  const [isShiftsExpanded, setIsShiftsExpanded] = useState(false);
  const [isGeneratedShiftsExpanded, setIsGeneratedShiftsExpanded] = useState(false);
  const [generatedShifts, setGeneratedShifts] = useState<GeneratedShift[]>([]);

  // Load generated shifts from localStorage if available
  useEffect(() => {
    const loadGeneratedShifts = () => {
      try {
        const storedRoster = localStorage.getItem('peninsula_health_generated_roster');
        if (storedRoster) {
          const rosterData = JSON.parse(storedRoster);
          const doctorShifts = extractDoctorShifts(rosterData, doctor.name);
          setGeneratedShifts(doctorShifts);
        }
      } catch (error) {
        console.warn('Failed to load generated shifts:', error);
      }
    };

    loadGeneratedShifts();
  }, [doctor.name]);

  const extractDoctorShifts = (rosterData: any, doctorName: string): GeneratedShift[] => {
    if (!rosterData?.outputs?.doctor_view) return [];

    const shifts: GeneratedShift[] = [];
    const lines = rosterData.outputs.doctor_view.trim().split('\n');
    
    if (lines.length < 2) return shifts;

    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
    const doctorIndex = headers.findIndex((h: string) => h.toLowerCase().includes(doctorName.toLowerCase()));
    
    if (doctorIndex === -1) return shifts;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((cell: string) => cell.trim().replace(/"/g, ''));
      const date = row[0];
      const shiftAssignment = row[doctorIndex];
      
      if (shiftAssignment && shiftAssignment !== 'OFF' && shiftAssignment !== '') {
        const shift: GeneratedShift = {
          date,
          shift_name: shiftAssignment,
          site: shiftAssignment.includes('Rosebud') ? 'Rosebud' : 'Frankston',
          role: extractRole(shiftAssignment),
          shift_type: extractShiftType(shiftAssignment),
          hours: extractHours(shiftAssignment),
          is_undesirable: isUndesirableShift(shiftAssignment),
          is_leadership: isLeadershipShift(shiftAssignment)
        };
        shifts.push(shift);
      }
    }

    return shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const extractRole = (shiftName: string): string => {
    const parts = shiftName.split(' ');
    return parts[1] || '';
  };

  const extractShiftType = (shiftName: string): string => {
    return shiftName.includes('PM') ? 'PM' : 'AM';
  };

  const extractHours = (shiftName: string): number => {
    if (shiftName.includes('Admin')) return 8;
    return 10; // Default clinical shift hours
  };

  const isUndesirableShift = (shiftName: string): boolean => {
    return shiftName.includes('Blue') || 
           shiftName.includes('Green') || 
           (shiftName.includes('Rosebud') && shiftName.includes('PM'));
  };

  const isLeadershipShift = (shiftName: string): boolean => {
    return shiftName.includes('Blue') || shiftName.includes('Green');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.profileContainer}>
      {/* Header */}
      <div className={styles.profileHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.doctorAvatar}>
            {doctor.avatar ? (
              <span className={styles.avatarEmoji}>{doctor.avatar}</span>
            ) : (
              doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.doctorName}>{doctor.name}</h1>
            <p className={styles.doctorSpecialty}>{doctor.specialization}</p>
            <div className={styles.statusContainer}>
              <span className={`${styles.statusBadge} ${getStatusBadgeClass(doctor.status)}`}>
                {doctor.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={styles.eftBadge}>
                EFT: {doctor.eft} ({Math.round(doctor.eft * 100)}%)
              </span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.editButton} onClick={onEdit}>
            ✏️ Edit
          </button>
          <button className={styles.removeButton} onClick={onRemove}>
            🗑️ Remove
          </button>
        </div>
      </div>

      {/* Contact Information */}
      <div className={styles.profileSection}>
        <h2 className={styles.sectionTitle}>Contact Information</h2>
        <div className={styles.contactGrid}>
          <div className={styles.contactItem}>
            <span className={styles.contactLabel}>Email:</span>
            <span className={styles.contactValue}>
              <a href={`mailto:${doctor.email}`} className={styles.emailLink}>
                {doctor.email}
              </a>
            </span>
          </div>
          <div className={styles.contactItem}>
            <span className={styles.contactLabel}>Phone:</span>
            <span className={styles.contactValue}>
              <a href={`tel:${doctor.phone}`} className={styles.phoneLink}>
                {doctor.phone}
              </a>
            </span>
          </div>
          <div className={styles.contactItem}>
            <span className={styles.contactLabel}>Hire Date:</span>
            <span className={styles.contactValue}>
              {formatDate(doctor.hire_date || '2020-01-01')}
            </span>
          </div>
        </div>
      </div>

      {/* Work Preferences */}
      <div className={styles.profileSection}>
        <h2 className={styles.sectionTitle}>Work Preferences</h2>
        
        {/* EFT Details */}
        <div className={styles.preferenceItem}>
          <div className={styles.preferenceHeader}>
            <span className={styles.preferenceLabel}>Equivalent Full Time (EFT)</span>
            <span className={styles.eftValue}>{doctor.eft}</span>
          </div>
          <div className={styles.eftBar}>
            <div 
              className={styles.eftProgress}
              style={{ width: `${doctor.eft * 100}%` }}
            />
          </div>
          <p className={styles.preferenceDescription}>
            Working {Math.round(doctor.eft * 100)}% of full-time hours 
            ({Math.round(doctor.eft * 40)} hours per week)
          </p>
        </div>

        {/* Rosebud Preference */}
        <div className={styles.preferenceItem}>
          <div className={styles.preferenceHeader}>
            <span className={styles.preferenceLabel}>Rosebud Hospital Preference</span>
            <span className={`${styles.preferenceValue} ${getRosebudPreferenceClass(doctor.rosebud_preference)}`}>
              {doctor.rosebud_preference} - {getRosebudPreferenceText(doctor.rosebud_preference)}
            </span>
          </div>
          <div className={styles.preferenceScale}>
            <div className={styles.scaleItem}>
              <span className={styles.scaleValue}>-2</span>
              <span className={styles.scaleLabel}>Strongly Dislike</span>
            </div>
            <div className={styles.scaleItem}>
              <span className={styles.scaleValue}>-1</span>
              <span className={styles.scaleLabel}>Dislike</span>
            </div>
            <div className={`${styles.scaleItem} ${doctor.rosebud_preference === 0 ? styles.scaleActive : ''}`}>
              <span className={styles.scaleValue}>0</span>
              <span className={styles.scaleLabel}>Neutral</span>
            </div>
            <div className={`${styles.scaleItem} ${doctor.rosebud_preference === 1 ? styles.scaleActive : ''}`}>
              <span className={styles.scaleValue}>+1</span>
              <span className={styles.scaleLabel}>Like</span>
            </div>
            <div className={`${styles.scaleItem} ${doctor.rosebud_preference === 2 ? styles.scaleActive : ''}`}>
              <span className={styles.scaleValue}>+2</span>
              <span className={styles.scaleLabel}>Prefer</span>
            </div>
          </div>
        </div>

        {/* Preferred Shifts */}
        <div className={styles.preferenceItem}>
          <div className={styles.preferenceHeader}>
            <span className={styles.preferenceLabel}>Preferred Shifts</span>
            <span className={styles.preferenceCount}>
              {doctor.preferred_shifts?.length || 0} selected
            </span>
          </div>
          {doctor.preferred_shifts && doctor.preferred_shifts.length > 0 ? (
            <div className={styles.shiftsList}>
              {doctor.preferred_shifts.map((shift, index) => (
                <span key={index} className={styles.shiftTag}>
                  {shift}
                </span>
              ))}
            </div>
          ) : (
            <p className={styles.emptyPreferences}>No preferred shifts specified</p>
          )}
        </div>
      </div>

      {/* Availability */}
      <UnavailabilitySection 
        doctor={doctor}
        formatDate={formatDate}
        styles={styles}
      />

      {/* Current Shifts */}
      <div className={styles.profileSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Current Month Shifts</h2>
          <button
            className={styles.expandButton}
            onClick={() => setIsShiftsExpanded(!isShiftsExpanded)}
          >
            {isShiftsExpanded ? '▼' : '▶'} {doctor.current_shifts?.length || 0} shifts
          </button>
        </div>
        
        {isShiftsExpanded && (
          <div className={styles.shiftsExpanded}>
            {doctor.current_shifts && doctor.current_shifts.length > 0 ? (
              <div className={styles.shiftsList}>
                {doctor.current_shifts.map((shift, index) => (
                  <div key={index} className={styles.shiftCard}>
                    <div className={styles.shiftHeader}>
                      <span className={styles.shiftDate}>
                        {new Date(shift.date).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className={`${styles.hospitalBadge} ${
                        shift.hospital === 'Frankston' ? styles.frankston : styles.rosebud
                      }`}>
                        {shift.hospital}
                      </span>
                    </div>
                    <div className={styles.shiftDetails}>
                      <span className={`${styles.shiftType} ${shift.is_leadership ? styles.leadership : ''}`}>
                        {shift.shift_type}
                        {shift.is_leadership && ' 👑'}
                      </span>
                      <span className={styles.shiftTime}>
                        {shift.start_time} - {shift.end_time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyShifts}>
                <p>No shifts scheduled for this month.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generated Roster Shifts */}
      {generatedShifts.length > 0 && (
        <div className={styles.profileSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.generatedIcon}>🤖</span>
              Generated Roster Shifts
            </h2>
            <button
              className={styles.expandButton}
              onClick={() => setIsGeneratedShiftsExpanded(!isGeneratedShiftsExpanded)}
            >
              {isGeneratedShiftsExpanded ? '▼' : '▶'} {generatedShifts.length} shifts
            </button>
          </div>
          
          {isGeneratedShiftsExpanded && (
            <div className={styles.shiftsExpanded}>
              <div className={styles.generatedRosterInfo}>
                <p className={styles.rosterDescription}>
                  These shifts were assigned by the Peninsula Health roster optimization algorithm.
                </p>
                <div className={styles.rosterStats}>
                  <span className={styles.rosterStat}>
                    Total Hours: {generatedShifts.reduce((sum, shift) => sum + shift.hours, 0)}
                  </span>
                  <span className={styles.rosterStat}>
                    Undesirable: {generatedShifts.filter(s => s.is_undesirable).length}
                  </span>
                  <span className={styles.rosterStat}>
                    Leadership: {generatedShifts.filter(s => s.is_leadership).length}
                  </span>
                </div>
              </div>
              
              <div className={styles.shiftsList}>
                {generatedShifts.map((shift, index) => (
                  <div key={index} className={`${styles.shiftCard} ${shift.is_undesirable ? styles.undesirable : ''}`}>
                    <div className={styles.shiftHeader}>
                      <span className={styles.shiftDate}>
                        {new Date(shift.date).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className={`${styles.hospitalBadge} ${
                        shift.site === 'Frankston' ? styles.frankston : styles.rosebud
                      }`}>
                        {shift.site}
                      </span>
                      {shift.is_undesirable && (
                        <span className={styles.undesirableBadge}>⚠️</span>
                      )}
                    </div>
                    <div className={styles.shiftDetails}>
                      <span className={`${styles.shiftType} ${shift.is_leadership ? styles.leadership : ''}`}>
                        {shift.role} {shift.shift_type}
                        {shift.is_leadership && ' 👑'}
                      </span>
                      <span className={styles.shiftHours}>
                        {shift.hours}h
                      </span>
                    </div>
                    <div className={styles.shiftName}>
                      {shift.shift_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className={styles.profileSection}>
        <h2 className={styles.sectionTitle}>Monthly Statistics</h2>
        
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{doctor.total_shifts_this_month || 0}</div>
            <div className={styles.statLabel}>Total Shifts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{doctor.undesirable_shifts_assigned || 0}</div>
            <div className={styles.statLabel}>Undesirable Shifts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>
              {doctor.total_shifts_this_month ? 
                Math.round(((doctor.undesirable_shifts_assigned || 0) / doctor.total_shifts_this_month) * 100) 
                : 0}%
            </div>
            <div className={styles.statLabel}>Undesirable Rate</div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className={styles.profileSection}>
        <h2 className={styles.sectionTitle}>System Information</h2>
        
        <div className={styles.systemInfo}>
          <div className={styles.systemItem}>
            <span className={styles.systemLabel}>Doctor ID:</span>
            <span className={styles.systemValue}>{doctor.id}</span>
          </div>
          <div className={styles.systemItem}>
            <span className={styles.systemLabel}>Last Modified:</span>
            <span className={styles.systemValue}>
              {formatDateTime(doctor.last_modified || new Date().toISOString())}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};