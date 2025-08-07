import React, { useState, useMemo, useEffect } from 'react';
import { getAllDoctors } from '../../services/doctorApi';
import { DoctorProfile } from '../../types/doctor';
import styles from './RosterDisplay.module.css';

interface RosterDisplayProps {
  rosterData: {
    jobId: string;
    startDate: string;
    weeks: number;
    statistics: any;
    outputs: {
      calendar_view: string;
      doctor_view: string;
      doctor_summary: string;
    };
    generatedAt: string;
  };
}

type ViewMode = 'calendar' | 'doctors' | 'summary';

interface ParsedCalendarData {
  clinicalShifts: string[];
  nonClinicalShifts: string[];
  dates: string[];
  assignments: { [date: string]: { [shift: string]: string } };
}

interface ParsedDoctorData {
  doctors: string[];
  dates: string[];
  assignments: { [doctor: string]: { [date: string]: string } };
}

interface ParsedSummaryData {
  headers: string[];
  rows: { [key: string]: any }[];
}

export const RosterDisplay: React.FC<RosterDisplayProps> = ({ rosterData }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarPage, setCalendarPage] = useState(0);
  const [doctorPage, setDoctorPage] = useState(0);
  const [weeksToShow, setWeeksToShow] = useState<1 | 2 | 3 | 4>(1);
  const [doctorProfiles, setDoctorProfiles] = useState<DoctorProfile[]>([]);
  
  const DOCTORS_PER_PAGE = 10; // Show 10 doctors at a time
  
  // Save roster data to localStorage for doctor profiles to access
  React.useEffect(() => {
    try {
      localStorage.setItem('peninsula_health_generated_roster', JSON.stringify(rosterData));
      console.log('Roster data saved to localStorage');
    } catch (error) {
      console.warn('Failed to save roster data to localStorage:', error);
    }
  }, [rosterData]);

  // Load doctor profiles for EFT and EFT utilisation data
  useEffect(() => {
    const loadDoctorProfiles = async () => {
      try {
        const response = await getAllDoctors();
        if (response.success && response.data) {
          setDoctorProfiles(response.data);
        }
      } catch (error) {
        console.error('Failed to load doctor profiles:', error);
      }
    };

    loadDoctorProfiles();
  }, []);
  
  // Parse calendar view CSV
  const calendarData = useMemo((): ParsedCalendarData => {
    const lines = rosterData.outputs.calendar_view.trim().split('\n');
    if (lines.length < 2) return { clinicalShifts: [], nonClinicalShifts: [], dates: [], assignments: {} };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const shifts = headers.slice(1); // Remove 'Date' column
    
    // Separate clinical and non-clinical shifts
    const clinicalShifts = shifts.filter(shift => !shift.includes('Admin'));
    const adminShifts = shifts.filter(shift => shift.includes('Admin'));
    
    // Create consolidated non-clinical columns
    const nonClinicalShifts = ['NON CLINICAL FRANKSTON', 'NON CLINICAL ROSEBUD'];
    
    const dates: string[] = [];
    const assignments: { [date: string]: { [shift: string]: string } } = {};
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      const date = row[0];
      dates.push(date);
      assignments[date] = {};
      
      // Process clinical shifts normally
      for (let j = 1; j < row.length && j - 1 < shifts.length; j++) {
        const shiftName = shifts[j - 1];
        if (!shiftName.includes('Admin')) {
          const cellValue = row[j] ? row[j].trim() : '';
          assignments[date][shiftName] = cellValue || 'VACANT';
        }
      }
      
      // Consolidate admin shifts by hospital
      const frankstonAdminDoctors: string[] = [];
      const rosebudAdminDoctors: string[] = [];
      
      for (let j = 1; j < row.length && j - 1 < shifts.length; j++) {
        const shiftName = shifts[j - 1];
        const cellValue = row[j] ? row[j].trim() : '';
        const assignment = cellValue || 'VACANT';
        
        if (shiftName.includes('Admin') && assignment !== 'VACANT') {
          if (shiftName.includes('Rosebud')) {
            rosebudAdminDoctors.push(assignment);
          } else {
            frankstonAdminDoctors.push(assignment);
          }
        }
      }
      
      // Set consolidated admin assignments
      assignments[date]['NON CLINICAL FRANKSTON'] = frankstonAdminDoctors.length > 0 
        ? frankstonAdminDoctors.join(', ') 
        : 'VACANT';
      assignments[date]['NON CLINICAL ROSEBUD'] = rosebudAdminDoctors.length > 0 
        ? rosebudAdminDoctors.join(', ') 
        : 'VACANT';
    }
    
    return { clinicalShifts, nonClinicalShifts, dates, assignments };
  }, [rosterData.outputs.calendar_view]);

  // Parse doctor view CSV
  const doctorData = useMemo((): ParsedDoctorData => {
    const lines = rosterData.outputs.doctor_view.trim().split('\n');
    if (lines.length < 2) return { doctors: [], dates: [], assignments: {} };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const doctors = headers.slice(1); // Remove 'Date' column
    
    const dates: string[] = [];
    const assignments: { [doctor: string]: { [date: string]: string } } = {};
    
    // Initialize doctor assignments
    doctors.forEach(doctor => {
      assignments[doctor] = {};
    });
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      const date = row[0];
      dates.push(date);
      
      for (let j = 1; j < row.length && j - 1 < doctors.length; j++) {
        assignments[doctors[j - 1]][date] = row[j] || 'OFF';
      }
    }
    
    return { doctors, dates, assignments };
  }, [rosterData.outputs.doctor_view]);

  // Parse summary CSV
  const summaryData = useMemo((): ParsedSummaryData => {
    const lines = rosterData.outputs.doctor_summary.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows: { [key: string]: any }[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      const rowObj: { [key: string]: any } = {};
      
      headers.forEach((header, index) => {
        rowObj[header] = row[index] || '';
      });
      
      rows.push(rowObj);
    }
    
    return { headers, rows };
  }, [rosterData.outputs.doctor_summary]);

  const getShiftColor = (shiftName: string): string => {
    if (shiftName === 'VACANT') return '#ffcccc';
    if (shiftName.includes('Blue') || shiftName.includes('Green')) return '#ff9999'; // Leadership
    if (shiftName.includes('Rosebud') && shiftName.includes('PM')) return '#ffaaaa'; // Undesirable
    if (shiftName.includes('Rosebud')) return '#ffffaa'; // Rosebud general
    if (shiftName.includes('Frankston')) return '#aaffaa'; // Frankston
    return '#e6e6e6'; // Default
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Helper function to normalize names for matching
  const normalizeName = (name: string): string => {
    return name.trim().toLowerCase().replace(/[^\w\s]/g, '');
  };

  // Find doctor profile with fuzzy name matching
  const findDoctorProfile = (doctorName: string): DoctorProfile | undefined => {
    if (!doctorName || doctorProfiles.length === 0) return undefined;
    
    // First try exact match
    let profile = doctorProfiles.find(p => p.name === doctorName);
    if (profile) return profile;
    
    // Try case-insensitive match
    profile = doctorProfiles.find(p => p.name.toLowerCase() === doctorName.toLowerCase());
    if (profile) return profile;
    
    // Try normalized name match (remove punctuation, extra spaces)
    const normalizedSearchName = normalizeName(doctorName);
    profile = doctorProfiles.find(p => normalizeName(p.name) === normalizedSearchName);
    if (profile) return profile;
    
    // Try partial match (useful for "Dr. Smith" vs "Smith")
    profile = doctorProfiles.find(p => {
      const profileNormalized = normalizeName(p.name);
      const searchNormalized = normalizedSearchName;
      return profileNormalized.includes(searchNormalized) || searchNormalized.includes(profileNormalized);
    });
    
    return profile;
  };

  // Calculate doctor EFT utilisation based on actual shifts assigned
  const calculateDoctorStats = (doctorName: string) => {
    const profile = findDoctorProfile(doctorName);
    let eft = profile?.eft || 0;
    
    // If no profile found, show N/A instead of calculating
    if (!profile && doctorName) {
      return {
        eft: 'N/A',
        eftUtilisation: 'N/A'
      };
    }
    
    // Count total hours worked by this doctor (assuming each shift is 10 hours based on config)
    const totalHoursWorked = doctorData.dates.reduce((hours, date) => {
      const assignment = doctorData.assignments[doctorName]?.[date];
      if (assignment && assignment !== 'OFF') {
        // Standard shift duration is 10 hours (8am-6pm or 2pm-midnight)
        return hours + 10;
      }
      return hours;
    }, 0);
    
    // Calculate EFT equivalent hours for the period
    // EFT of 1.0 = 40 hours per week, so for the roster period:
    const weeksPeriod = doctorData.dates.length / 7;
    const eftEquivalentHours = eft * 40 * weeksPeriod;
    
    // Calculate EFT utilisation as percentage: scheduled hours / EFT equivalent hours
    const eftUtilisation = eftEquivalentHours > 0 ? (totalHoursWorked / eftEquivalentHours) * 100 : 0;
    
    return {
      eft: eft.toFixed(2), // Show EFT as decimal with 2 decimal places
      eftUtilisation: Math.round(eftUtilisation) + '%' // Show EFT utilisation as percentage with 0 decimal places
    };
  };

  const renderCalendarView = () => {
    const allShifts = [...calendarData.clinicalShifts, ...calendarData.nonClinicalShifts];
    
    // Calculate pagination based on weeks to show
    const datesPerPage = weeksToShow * 7;
    const totalPages = Math.ceil(calendarData.dates.length / datesPerPage);
    const startIdx = calendarPage * datesPerPage;
    const endIdx = startIdx + datesPerPage;
    const visibleDates = calendarData.dates.slice(startIdx, endIdx);
    
    return (
      <div className={styles.calendarView}>
        {/* Pagination controls */}
        <div className={styles.paginationControls}>
          <div className={styles.weekSelector}>
            <label>Show:</label>
            <select 
              value={weeksToShow} 
              onChange={(e) => {
                setWeeksToShow(parseInt(e.target.value) as 1 | 2 | 3 | 4);
                setCalendarPage(0); // Reset to first page when changing view
              }}
              className={styles.weekSelect}
            >
              <option value={1}>1 Week</option>
              <option value={2}>2 Weeks</option>
              <option value={3}>3 Weeks</option>
              <option value={4}>4 Weeks</option>
            </select>
          </div>
          
          <div className={styles.pageNavigation}>
            <button 
              className={styles.pageButton}
              onClick={() => setCalendarPage(prev => Math.max(0, prev - 1))}
              disabled={calendarPage === 0}
            >
              ← Previous
            </button>
            <span className={styles.pageInfo}>
              {weeksToShow === 1 ? `Week ${calendarPage + 1} of ${totalPages}` : 
               `Page ${calendarPage + 1} of ${totalPages}`}
              {visibleDates.length > 0 && (
                <span className={styles.dateRange}>
                  {' '}({formatDate(visibleDates[0])} - {formatDate(visibleDates[visibleDates.length - 1])})
                </span>
              )}
            </span>
            <button 
              className={styles.pageButton}
              onClick={() => setCalendarPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={calendarPage >= totalPages - 1}
            >
              Next →
            </button>
          </div>
        </div>
        
        <div className={styles.calendarGrid}>
          {/* Header row */}
          <div className={styles.calendarHeader}>
            <div className={styles.dateHeader}>Date</div>
            {/* Clinical shifts headers */}
            {calendarData.clinicalShifts.map(shift => (
              <div key={shift} className={styles.shiftHeader}>
                {shift.replace(/\s+/g, ' ').substring(0, 20)}
              </div>
            ))}
            {/* Separator between clinical and non-clinical */}
            {calendarData.nonClinicalShifts.length > 0 && (
              <div className={styles.shiftSeparator}></div>
            )}
            {/* Non-clinical shifts headers */}
            {calendarData.nonClinicalShifts.map(shift => (
              <div key={shift} className={`${styles.shiftHeader} ${styles.nonClinicalHeader}`}>
                {shift.replace(/\s+/g, ' ').substring(0, 20)}
              </div>
            ))}
          </div>
          
          {/* Data rows */}
          {visibleDates.map(date => (
            <div key={date} className={styles.calendarRow}>
              <div className={styles.dateCell}>
                {formatDate(date)}
              </div>
              {/* Clinical shifts data */}
              {calendarData.clinicalShifts.map(shift => {
                const assignment = calendarData.assignments[date]?.[shift] || 'VACANT';
                return (
                  <div 
                    key={`${date}-${shift}`} 
                    className={styles.assignmentCell}
                    style={{ backgroundColor: getShiftColor(assignment) }}
                  >
                    {(!assignment || assignment.trim() === '' || assignment === 'VACANT') ? (
                      <span className={styles.vacant}>VACANT</span>
                    ) : (
                      <span className={styles.assigned}>{assignment}</span>
                    )}
                  </div>
                );
              })}
              {/* Separator between clinical and non-clinical */}
              {calendarData.nonClinicalShifts.length > 0 && (
                <div className={styles.shiftSeparator}></div>
              )}
              {/* Non-clinical shifts data */}
              {calendarData.nonClinicalShifts.map(shift => {
                const assignment = calendarData.assignments[date]?.[shift] || 'VACANT';
                return (
                  <div 
                    key={`${date}-${shift}`} 
                    className={`${styles.assignmentCell} ${styles.nonClinicalCell}`}
                    style={{ backgroundColor: (!assignment || assignment.trim() === '' || assignment === 'VACANT') ? '#f0f4f8' : '#e3f2fd' }}
                  >
                    {(!assignment || assignment.trim() === '' || assignment === 'VACANT') ? (
                      <span className={styles.vacant}>VACANT</span>
                    ) : (
                      <span className={styles.assigned}>{assignment}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDoctorView = () => {
    // Calculate pagination
    const totalPages = Math.ceil(doctorData.doctors.length / DOCTORS_PER_PAGE);
    const startIdx = doctorPage * DOCTORS_PER_PAGE;
    const endIdx = startIdx + DOCTORS_PER_PAGE;
    const visibleDoctors = doctorData.doctors.slice(startIdx, endIdx);
    
    // Pad with empty slots to maintain consistent grid (always 10 columns)
    const paddedDoctors = [...visibleDoctors];
    while (paddedDoctors.length < DOCTORS_PER_PAGE) {
      paddedDoctors.push('');
    }
    
    return (
      <div className={styles.doctorView}>
        {/* Pagination controls */}
        <div className={styles.paginationControls}>
          <button 
            className={styles.pageButton}
            onClick={() => setDoctorPage(prev => Math.max(0, prev - 1))}
            disabled={doctorPage === 0}
          >
            ← Previous
          </button>
          <span className={styles.pageInfo}>
            Page {doctorPage + 1} of {totalPages} 
            <span className={styles.doctorCount}>
              {' '}(Showing {startIdx + 1}-{Math.min(endIdx, doctorData.doctors.length)} of {doctorData.doctors.length} doctors)
            </span>
          </span>
          <button 
            className={styles.pageButton}
            onClick={() => setDoctorPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={doctorPage >= totalPages - 1}
          >
            Next →
          </button>
        </div>
        
        <div className={styles.doctorGrid}>
          {/* Header row */}
          <div className={styles.doctorHeader}>
            <div className={styles.dateHeader}>Date</div>
            {paddedDoctors.map((doctor, index) => (
              <div key={`${doctor}-${index}`} className={styles.doctorHeaderCell}>
                {doctor}
              </div>
            ))}
          </div>
          
          {/* EFT and EFT Utilisation row */}
          <div className={styles.doctorStatsHeader}>
            <div className={styles.dateHeader}>EFT / EFT Utilisation</div>
            {paddedDoctors.map((doctor, index) => {
              if (!doctor) {
                return (
                  <div key={`empty-stats-${index}`} className={styles.doctorStatsCell}>
                  </div>
                );
              }
              
              const stats = calculateDoctorStats(doctor);
              const isNA = stats.eft === 'N/A';
              return (
                <div key={`${doctor}-stats`} className={styles.doctorStatsCell}>
                  <div className={isNA ? styles.eftValueNA : styles.eftValue}>{stats.eft}</div>
                  <div className={isNA ? styles.utilizationValueNA : styles.utilizationValue}>{stats.eftUtilisation}</div>
                </div>
              );
            })}
          </div>
          
          {/* Data rows */}
          {doctorData.dates.map(date => (
            <div key={date} className={styles.doctorRow}>
              <div className={styles.dateCell}>
                {formatDate(date)}
              </div>
              {paddedDoctors.map((doctor, index) => {
                if (!doctor) {
                  // Empty cell for padding
                  return (
                    <div 
                      key={`${date}-empty-${index}`} 
                      className={styles.doctorAssignmentCell}
                      style={{ backgroundColor: '#f8f9fa' }}
                    >
                    </div>
                  );
                }
                
                const assignment = doctorData.assignments[doctor]?.[date] || 'OFF';
                return (
                  <div 
                    key={`${date}-${doctor}`} 
                    className={styles.doctorAssignmentCell}
                    style={{ 
                      backgroundColor: assignment === 'OFF' ? '#f0f0f0' : getShiftColor(assignment) 
                    }}
                  >
                    {assignment === 'OFF' ? (
                      <span className={styles.off}>OFF</span>
                    ) : (
                      <span className={styles.assigned}>{assignment}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSummaryView = () => {
    return (
      <div className={styles.summaryView}>
        <div className={styles.summaryTable}>
          <div className={styles.summaryHeader}>
            {summaryData.headers.map(header => (
              <div key={header} className={styles.summaryHeaderCell}>
                {header.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
          
          {summaryData.rows.map((row, index) => (
            <div key={index} className={styles.summaryRow}>
              {summaryData.headers.map(header => (
                <div key={header} className={styles.summaryCellData}>
                  {row[header]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.rosterDisplay}>
      {/* Header with controls */}
      <div className={styles.displayHeader}>
        <div className={styles.rosterInfo}>
          <h2>Generated Roster</h2>
          <div className={styles.rosterMeta}>
            <span>Start: {formatDate(rosterData.startDate)}</span>
            <span>Duration: {rosterData.weeks} weeks</span>
            <span>Generated: {new Date(rosterData.generatedAt).toLocaleString()}</span>
          </div>
        </div>
        
        <div className={styles.viewControls}>
          <button 
            className={`${styles.viewButton} ${viewMode === 'calendar' ? styles.active : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </button>
          <button 
            className={`${styles.viewButton} ${viewMode === 'doctors' ? styles.active : ''}`}
            onClick={() => setViewMode('doctors')}
          >
            Doctor View
          </button>
          <button 
            className={`${styles.viewButton} ${viewMode === 'summary' ? styles.active : ''}`}
            onClick={() => setViewMode('summary')}
          >
            Summary
          </button>
        </div>
      </div>

      {/* Statistics */}
      {rosterData.statistics && (
        <div className={styles.statisticsPanel}>
          <h3>Generation Statistics</h3>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Doctors:</span>
              <span className={styles.statValue}>{rosterData.statistics.total_doctors}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Shifts:</span>
              <span className={styles.statValue}>{rosterData.statistics.total_shifts}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total Hours:</span>
              <span className={styles.statValue}>{Math.round(rosterData.statistics.total_hours)}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Avg EFT Utilisation:</span>
              <span className={styles.statValue}>{Math.round(rosterData.statistics.avg_eft_utilization || 0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={styles.displayContent}>
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'doctors' && renderDoctorView()}
        {viewMode === 'summary' && renderSummaryView()}
      </div>
    </div>
  );
};

export default RosterDisplay;