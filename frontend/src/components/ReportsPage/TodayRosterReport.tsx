import React, { useState, useEffect } from 'react';
import { DoctorProfile } from '../../types/doctor';
import { getAllDoctors } from '../../services/doctorApi';
import { RosterAnalyticsService } from '../../services/rosterAnalyticsApi';
import styles from './TodayRosterReport.module.css';

interface TodayAssignment {
  doctor_name: string;
  doctor_avatar: string;
  shift_type: string;
  hospital: 'Frankston' | 'Rosebud';
  start_time: string;
  end_time: string;
  is_leadership: boolean;
}

export const TodayRosterReport: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<TodayAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<string>('');

  // Helper function to normalize names for better matching
  const normalizeName = (name: string): string => {
    return name.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
  };

  // Find doctor profile with fuzzy name matching
  const findDoctorProfile = (doctorName: string): DoctorProfile | undefined => {
    if (!doctorName || doctors.length === 0) return undefined;
    
    // First try exact match
    let profile = doctors.find(d => d.name === doctorName);
    if (profile) return profile;
    
    // Try normalized name match (remove "Dr." prefix, case insensitive)
    const normalizedSearchName = normalizeName(doctorName);
    profile = doctors.find(d => normalizeName(d.name) === normalizedSearchName);
    if (profile) return profile;
    
    // Try partial match (useful for different formats)
    profile = doctors.find(d => {
      const profileNormalized = normalizeName(d.name);
      return profileNormalized.includes(normalizedSearchName) || 
             normalizedSearchName.includes(profileNormalized);
    });
    
    return profile;
  };

  const parseShiftInfo = (shiftType: string) => {
    // Determine hospital from shift name
    const hospital: 'Frankston' | 'Rosebud' = shiftType.includes('Rosebud') ? 'Rosebud' : 'Frankston';
    
    // Determine if it's a leadership role
    const is_leadership = shiftType.includes('Blue') || shiftType.includes('Green') || shiftType.toLowerCase().includes('leadership');
    
    // Extract times based on shift type
    let start_time = '08:00';
    let end_time = '18:00';
    
    if (shiftType.includes('PM') || shiftType.includes('Evening')) {
      start_time = '18:00';
      end_time = '02:00';
    } else if (shiftType.includes('Red PM')) {
      start_time = '14:00';
      end_time = '00:00';
    }
    
    return { hospital, is_leadership, start_time, end_time };
  };

  const loadTodayRoster = async () => {
    setIsLoading(true);
    
    try {
      // Set current date
      const today = new Date().toISOString().split('T')[0];
      setCurrentDate(today);
      
      if (!RosterAnalyticsService.isRosterDataAvailable()) {
        setTodayAssignments([]);
        setIsLoading(false);
        return;
      }

      // Load doctor profiles for avatars
      const response = await getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      }

      // Get roster data and find today's assignments
      const rosterData = localStorage.getItem('peninsula_health_generated_roster');
      if (!rosterData) {
        setTodayAssignments([]);
        setIsLoading(false);
        return;
      }

      const parsedRoster = JSON.parse(rosterData);
      const calendarCsv = parsedRoster.outputs.calendar_view;
      
      // Parse calendar view to find today's assignments
      const lines = calendarCsv.trim().split('\n');
      if (lines.length < 2) {
        setTodayAssignments([]);
        setIsLoading(false);
        return;
      }
      
      const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
      const shifts = headers.slice(1); // Remove 'Date' column
      
      let todayRow = null;
      
      // Find today's row
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((cell: string) => cell.trim().replace(/"/g, ''));
        const date = row[0];
        if (date === today) {
          todayRow = row;
          break;
        }
      }
      
      if (!todayRow) {
        setTodayAssignments([]);
        setIsLoading(false);
        return;
      }
      
      // Extract today's assignments
      const assignments: TodayAssignment[] = [];
      
      for (let j = 1; j < todayRow.length && j - 1 < shifts.length; j++) {
        const doctorName = todayRow[j];
        const shiftType = shifts[j - 1];
        
        if (doctorName && doctorName !== 'VACANT' && doctorName !== '') {
          const doctorProfile = findDoctorProfile(doctorName);
          const shiftInfo = parseShiftInfo(shiftType);
          
          assignments.push({
            doctor_name: doctorName,
            doctor_avatar: doctorProfile?.avatar || '👨‍⚕️',
            shift_type: shiftType,
            hospital: shiftInfo.hospital,
            start_time: shiftInfo.start_time,
            end_time: shiftInfo.end_time,
            is_leadership: shiftInfo.is_leadership
          });
        }
      }
      
      // Sort assignments by hospital and then by start time
      assignments.sort((a, b) => {
        if (a.hospital !== b.hospital) {
          return a.hospital === 'Frankston' ? -1 : 1;
        }
        return a.start_time.localeCompare(b.start_time);
      });
      
      setTodayAssignments(assignments);
      
    } catch (error) {
      console.error('Failed to load today\'s roster:', error);
      setTodayAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodayRoster();
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading today's roster...</p>
      </div>
    );
  }

  // Check if no roster data is available
  const hasRosterData = RosterAnalyticsService.isRosterDataAvailable();

  if (!hasRosterData) {
    return (
      <div className={styles.reportContainer}>
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>📅</div>
          <h3>No Roster Data Available</h3>
          <p>Generate a roster in the Schedule page to view today's assignments.</p>
          <button 
            className={styles.generateButton}
            onClick={() => window.location.href = '/schedule'}
          >
            Go to Schedule Page
          </button>
        </div>
      </div>
    );
  }

  // Separate assignments by hospital
  const frankstonAssignments = todayAssignments.filter(a => a.hospital === 'Frankston');
  const rosebudAssignments = todayAssignments.filter(a => a.hospital === 'Rosebud');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-AU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className={styles.reportContainer}>
      {/* Header */}
      <div className={styles.reportHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.reportTitle}>📅 Today's Roster</h2>
          <p className={styles.reportDate}>
            {currentDate ? formatDate(currentDate) : 'Today'}
          </p>
        </div>
        
        <div className={styles.headerStats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{frankstonAssignments.length}</span>
            <span className={styles.statLabel}>Frankston</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{rosebudAssignments.length}</span>
            <span className={styles.statLabel}>Rosebud</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>{todayAssignments.length}</span>
            <span className={styles.statLabel}>Total Staff</span>
          </div>
        </div>
      </div>

      {todayAssignments.length === 0 ? (
        <div className={styles.noAssignments}>
          <div className={styles.noAssignmentsIcon}>😴</div>
          <h3>No Assignments for Today</h3>
          <p>There are no scheduled shifts for {currentDate ? formatDate(currentDate) : 'today'}.</p>
        </div>
      ) : (
        <div className={styles.hospitalsLayout}>
          {/* Frankston Hospital */}
          <div className={styles.hospitalSection}>
            <div className={styles.hospitalHeader}>
              <h3 className={styles.hospitalTitle}>
                🏥 Frankston Hospital
              </h3>
              <div className={styles.hospitalStats}>
                {frankstonAssignments.length} staff members
              </div>
            </div>
            
            <div className={styles.shiftsGrid}>
              {frankstonAssignments.length === 0 ? (
                <div className={styles.noShifts}>
                  <span className={styles.noShiftsIcon}>😴</span>
                  <span>No assignments today</span>
                </div>
              ) : (
                frankstonAssignments.map((assignment, index) => (
                  <div key={index} className={styles.shiftCard}>
                    <div className={styles.shiftHeader}>
                      <div className={styles.doctorInfo}>
                        <span className={styles.doctorAvatar}>{assignment.doctor_avatar}</span>
                        <span className={styles.doctorName}>{assignment.doctor_name}</span>
                        {assignment.is_leadership && (
                          <span className={styles.leadershipBadge}>👑 Lead</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.shiftDetails}>
                      <div className={styles.shiftType}>
                        {assignment.shift_type}
                      </div>
                      <div className={styles.shiftTime}>
                        🕐 {assignment.start_time} - {assignment.end_time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Rosebud Hospital */}
          <div className={styles.hospitalSection}>
            <div className={styles.hospitalHeader}>
              <h3 className={styles.hospitalTitle}>
                🌹 Rosebud Hospital
              </h3>
              <div className={styles.hospitalStats}>
                {rosebudAssignments.length} staff members
              </div>
            </div>
            
            <div className={styles.shiftsGrid}>
              {rosebudAssignments.length === 0 ? (
                <div className={styles.noShifts}>
                  <span className={styles.noShiftsIcon}>😴</span>
                  <span>No assignments today</span>
                </div>
              ) : (
                rosebudAssignments.map((assignment, index) => (
                  <div key={index} className={styles.shiftCard}>
                    <div className={styles.shiftHeader}>
                      <div className={styles.doctorInfo}>
                        <span className={styles.doctorAvatar}>{assignment.doctor_avatar}</span>
                        <span className={styles.doctorName}>{assignment.doctor_name}</span>
                        {assignment.is_leadership && (
                          <span className={styles.leadershipBadge}>👑 Lead</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.shiftDetails}>
                      <div className={styles.shiftType}>
                        {assignment.shift_type}
                      </div>
                      <div className={styles.shiftTime}>
                        🕐 {assignment.start_time} - {assignment.end_time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayRosterReport;