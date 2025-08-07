import { VacantShift, VacantShiftSummary, UndesirableShift, UndesirableShiftSummary, DoctorUndesirableLoad, DoctorStatistics, TeamStatistics } from '../types/reports';

interface RosterData {
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
}

interface ParsedCalendarData {
  dates: string[];
  shifts: string[];
  assignments: { [date: string]: { [shift: string]: string } };
}

interface ParsedDoctorData {
  doctors: string[];
  dates: string[];
  assignments: { [doctor: string]: { [date: string]: string } };
}

export class RosterAnalyticsService {
  private static getRosterData(): RosterData | null {
    try {
      const storedRoster = localStorage.getItem('peninsula_health_generated_roster');
      if (storedRoster) {
        return JSON.parse(storedRoster);
      }
    } catch (error) {
      console.error('Failed to parse roster data:', error);
    }
    return null;
  }

  private static parseCalendarView(calendarCsv: string): ParsedCalendarData {
    const lines = calendarCsv.trim().split('\n');
    if (lines.length < 2) return { dates: [], shifts: [], assignments: {} };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const shifts = headers.slice(1); // Remove 'Date' column
    
    const dates: string[] = [];
    const assignments: { [date: string]: { [shift: string]: string } } = {};
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      const date = row[0];
      dates.push(date);
      assignments[date] = {};
      
      for (let j = 1; j < row.length && j - 1 < shifts.length; j++) {
        const cellValue = row[j] ? row[j].trim() : '';
        assignments[date][shifts[j - 1]] = cellValue || 'VACANT';
      }
    }
    
    return { dates, shifts, assignments };
  }

  private static parseDoctorView(doctorCsv: string): ParsedDoctorData {
    const lines = doctorCsv.trim().split('\n');
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
  }

  static getVacantShiftsData(): { shifts: VacantShift[], summary: VacantShiftSummary[] } {
    const rosterData = this.getRosterData();
    if (!rosterData) {
      return { shifts: [], summary: [] };
    }

    const calendarData = this.parseCalendarView(rosterData.outputs.calendar_view);
    const vacantShifts: VacantShift[] = [];
    const shiftTypeVacancies: { [key: string]: { vacant: number, total: number } } = {};

    // Filter to only include clinical shifts (exclude Admin shifts)
    const clinicalShifts = calendarData.shifts.filter(shift => !shift.includes('Admin'));

    // Analyze calendar data for vacant shifts (clinical only)
    calendarData.dates.forEach(date => {
      clinicalShifts.forEach(shiftType => {
        const assignment = calendarData.assignments[date]?.[shiftType] || 'VACANT';
        
        // Initialize shift type tracking
        if (!shiftTypeVacancies[shiftType]) {
          shiftTypeVacancies[shiftType] = { vacant: 0, total: 0 };
        }
        shiftTypeVacancies[shiftType].total++;
        
        // Check if shift is vacant (handles empty strings, null, undefined, and 'VACANT')
        const isVacant = !assignment || assignment.trim() === '' || assignment === 'VACANT';
        
        if (isVacant) {
          shiftTypeVacancies[shiftType].vacant++;
          
          // Determine hospital from shift name
          const hospital = shiftType.includes('Rosebud') ? 'Rosebud' : 'Frankston';
          
          // Determine urgency based on shift type
          let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';
          if (shiftType.includes('Blue') || shiftType.includes('Green')) {
            urgency = 'high'; // Leadership roles
          }
          if (shiftType.includes('Red') && shiftType.includes('PM')) {
            urgency = 'critical'; // Undesirable evening shifts
          }
          
          // Extract times (simplified)
          let startTime = '08:00';
          let endTime = '18:00';
          if (shiftType.includes('PM') || shiftType.includes('Evening')) {
            startTime = '18:00';
            endTime = '02:00';
          }
          
          vacantShifts.push({
            date,
            shift_type: shiftType,
            hospital,
            start_time: startTime,
            end_time: endTime,
            reason: 'No qualified staff available',
            urgency
          });
        }
      });
    });

    // Create summary (only for clinical shifts)
    const summary: VacantShiftSummary[] = Object.entries(shiftTypeVacancies).map(([shiftType, data]) => ({
      shift_type: shiftType,
      vacant_count: data.vacant,
      total_shifts: data.total,
      vacancy_rate: data.total > 0 ? (data.vacant / data.total) * 100 : 0
    }));

    return { shifts: vacantShifts, summary };
  }

  static getUndesirableShiftsData(): {
    shifts: UndesirableShift[],
    summary: UndesirableShiftSummary[],
    doctorLoads: DoctorUndesirableLoad[]
  } {
    const rosterData = this.getRosterData();
    if (!rosterData) {
      return { shifts: [], summary: [], doctorLoads: [] };
    }

    const calendarData = this.parseCalendarView(rosterData.outputs.calendar_view);
    const doctorData = this.parseDoctorView(rosterData.outputs.doctor_view);
    
    const undesirableShifts: UndesirableShift[] = [];
    const shiftTypeCounts: { [key: string]: number } = {};
    const doctorUndesirableLoads: { [doctor: string]: { count: number, points: number, types: Set<string> } } = {};

    // Define undesirable shift criteria
    const getUndesirableScore = (shiftType: string): { score: number, reasons: string[] } => {
      const reasons: string[] = [];
      let score = 0;
      
      if (shiftType.includes('Blue') || shiftType.includes('Green')) {
        reasons.push('Leadership responsibility');
        score += 3;
      }
      if (shiftType.includes('Rosebud')) {
        reasons.push('Remote location');
        score += 2;
      }
      if (shiftType.includes('PM') || shiftType.includes('Evening')) {
        reasons.push('Evening hours');
        score += 1;
      }
      if (shiftType.includes('Red') && shiftType.includes('PM')) {
        reasons.push('Friday PM impact');
        score += 1;
      }
      
      return { score: Math.min(score, 3), reasons }; // Cap at 3
    };

    // Analyze assignments for undesirable shifts
    doctorData.dates.forEach(date => {
      doctorData.doctors.forEach(doctor => {
        const assignment = doctorData.assignments[doctor]?.[date];
        if (assignment && assignment !== 'OFF') {
          const undesirableInfo = getUndesirableScore(assignment);
          
          if (undesirableInfo.score > 0) {
            // Initialize doctor tracking
            if (!doctorUndesirableLoads[doctor]) {
              doctorUndesirableLoads[doctor] = { count: 0, points: 0, types: new Set() };
            }
            
            doctorUndesirableLoads[doctor].count++;
            doctorUndesirableLoads[doctor].points += undesirableInfo.score;
            doctorUndesirableLoads[doctor].types.add(assignment.split(' ')[0]); // First word as type
            
            // Track shift type counts
            shiftTypeCounts[assignment] = (shiftTypeCounts[assignment] || 0) + 1;
            
            // Determine hospital and times
            const hospital = assignment.includes('Rosebud') ? 'Rosebud' : 'Frankston';
            let startTime = '08:00';
            let endTime = '18:00';
            if (assignment.includes('PM') || assignment.includes('Evening')) {
              startTime = '18:00';
              endTime = '02:00';
            }
            
            undesirableShifts.push({
              date,
              shift_type: assignment,
              hospital,
              doctor_name: doctor,
              doctor_avatar: '👨‍⚕️', // Default avatar
              penalty_score: undesirableInfo.score,
              reasons: undesirableInfo.reasons,
              start_time: startTime,
              end_time: endTime
            });
          }
        }
      });
    });

    // Create summary
    const summary: UndesirableShiftSummary[] = Object.entries(shiftTypeCounts).map(([shiftType, count]) => {
      const { score, reasons } = getUndesirableScore(shiftType);
      const totalShifts = calendarData.dates.length; // Rough estimate
      return {
        shift_type: shiftType,
        total_assignments: count,
        penalty_score: score,
        reasons,
        frequency: (count / totalShifts) * 100
      };
    });

    // Calculate average for fairness ratios
    const avgUndesirable = Object.values(doctorUndesirableLoads).reduce((sum, load) => sum + load.count, 0) / Object.keys(doctorUndesirableLoads).length;
    
    // Create doctor loads
    const doctorLoads: DoctorUndesirableLoad[] = Object.entries(doctorUndesirableLoads).map(([doctor, load]) => ({
      doctor_name: doctor,
      doctor_avatar: '👨‍⚕️', // Default avatar
      total_undesirable: load.count,
      penalty_points: load.points,
      shift_types: Array.from(load.types),
      fairness_ratio: avgUndesirable > 0 ? load.count / avgUndesirable : 1
    }));

    return { shifts: undesirableShifts, summary, doctorLoads };
  }

  static getDoctorStatistics(): { doctorStats: DoctorStatistics[], teamStats: TeamStatistics } {
    const rosterData = this.getRosterData();
    if (!rosterData) {
      return { doctorStats: [], teamStats: {
        total_doctors: 0,
        active_doctors: 0,
        total_eft_capacity: 0,
        average_utilization: 0,
        total_shifts_assigned: 0,
        total_undesirable_shifts: 0,
        average_fairness_score: 0
      }};
    }

    const doctorData = this.parseDoctorView(rosterData.outputs.doctor_view);
    const undesirableData = this.getUndesirableShiftsData();
    
    const doctorStats: DoctorStatistics[] = doctorData.doctors.map(doctor => {
      // Count total shifts for this doctor
      const totalShifts = doctorData.dates.reduce((count, date) => {
        const assignment = doctorData.assignments[doctor]?.[date];
        return assignment && assignment !== 'OFF' ? count + 1 : count;
      }, 0);

      // Count clinical vs admin shifts
      const clinicalShifts = doctorData.dates.reduce((count, date) => {
        const assignment = doctorData.assignments[doctor]?.[date];
        return assignment && assignment !== 'OFF' && !assignment.includes('Admin') ? count + 1 : count;
      }, 0);

      const adminShifts = totalShifts - clinicalShifts;
      
      // Get undesirable shift count for this doctor
      const doctorUndesirable = undesirableData.doctorLoads.find(d => d.doctor_name === doctor);
      const undesirableShifts = doctorUndesirable?.total_undesirable || 0;
      
      // Calculate actual hours worked (assuming 10-hour shifts based on config)
      const totalHoursWorked = totalShifts * 10;
      
      // Use a more realistic EFT estimate based on hours worked
      // EFT of 1.0 = 40 hours per week
      const weeksPeriod = doctorData.dates.length / 7;
      const hoursPerWeek = totalHoursWorked / weeksPeriod;
      const estimatedEft = Math.min(1.0, hoursPerWeek / 40);
      
      // Calculate EFT equivalent hours for the period
      const eftEquivalentHours = estimatedEft * 40 * weeksPeriod;
      
      // Calculate EFT utilisation as percentage: scheduled hours / EFT equivalent hours
      const eftUtilisationRate = eftEquivalentHours > 0 ? (totalHoursWorked / eftEquivalentHours) * 100 : 0;
      
      return {
        doctor_name: doctor,
        avatar: '👨‍⚕️',
        eft: estimatedEft,
        total_hours: totalHoursWorked,
        max_hours: eftEquivalentHours,
        eft_utilization: eftUtilisationRate,
        total_shifts: totalShifts,
        undesirable_shifts: undesirableShifts,
        clinical_shifts: clinicalShifts,
        admin_shifts: adminShifts,
        remaining_hours: Math.max(0, eftEquivalentHours - totalHoursWorked),
        fairness_score: doctorUndesirable?.fairness_ratio ? Math.max(0, 100 - (doctorUndesirable.fairness_ratio * 50)) : 85
      };
    });

    // Calculate team statistics
    const teamStats: TeamStatistics = {
      total_doctors: doctorStats.length,
      active_doctors: doctorStats.filter(d => d.total_shifts > 0).length,
      total_eft_capacity: doctorStats.reduce((sum, d) => sum + d.eft, 0),
      average_utilization: doctorStats.length > 0 ? doctorStats.reduce((sum, d) => sum + d.eft_utilization, 0) / doctorStats.length : 0,
      total_shifts_assigned: doctorStats.reduce((sum, d) => sum + d.total_shifts, 0),
      total_undesirable_shifts: doctorStats.reduce((sum, d) => sum + d.undesirable_shifts, 0),
      average_fairness_score: doctorStats.length > 0 ? doctorStats.reduce((sum, d) => sum + d.fairness_score, 0) / doctorStats.length : 0
    };

    return { doctorStats, teamStats };
  }

  static isRosterDataAvailable(): boolean {
    return this.getRosterData() !== null;
  }

  static getRosterGenerationInfo(): { startDate: string, weeks: number, generatedAt: string } | null {
    const rosterData = this.getRosterData();
    if (!rosterData) return null;
    
    return {
      startDate: rosterData.startDate,
      weeks: rosterData.weeks,
      generatedAt: rosterData.generatedAt
    };
  }
}