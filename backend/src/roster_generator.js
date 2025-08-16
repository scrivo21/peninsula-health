/**
 * Peninsula Health Roster Generator (JavaScript version)
 * Replaces Python script for Electron packaged app compatibility
 * Full feature parity with Python implementation
 */

const fs = require('fs').promises;
const path = require('path');

// Shift definitions
const FRANKSTON_AM_SHIFTS = ['Blue', 'Yellow', 'Pink', 'Brown', 'EPIC'];
const FRANKSTON_PM_SHIFTS = ['Green', 'Orange', 'Pink', 'Brown'];
const ROSEBUD_SHIFTS = ['Red AM', 'Red PM'];

class RosterGenerator {
  constructor(config, weeks, startDate) {
    this.config = config;
    this.weeks = weeks;
    this.startDate = new Date(startDate);
    this.doctors = this.extractDoctors(config);
    this.penaltyPoints = {};
    this.assignments = {};
  }

  extractDoctors(config) {
    const doctors = [];
    for (const [key, value] of Object.entries(config.DOCTORS || {})) {
      if (!key.startsWith('_')) {
        doctors.push({
          id: key,
          name: value.name || key,
          eft: value.eft || 1.0,
          rosebud_preference: value.rosebud_preference || 0,
          unavailable_dates: value.unavailable_dates || [],
          email: value.email || '',
          phone: value.phone || '',
          specialization: value.specialization || '',
          status: value.status || 'active'
        });
      }
    }
    return doctors;
  }

  generateDates() {
    const dates = [];
    const currentDate = new Date(this.startDate);
    const totalDays = this.weeks * 7;
    
    for (let i = 0; i < totalDays; i++) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  isDoctorAvailable(doctor, date) {
    const dateStr = date.toISOString().split('T')[0];
    return !doctor.unavailable_dates.includes(dateStr);
  }

  calculatePenalty(shift, doctor, isFriday) {
    let penalty = 0;
    
    // Leadership roles
    if (shift === 'Blue' || shift === 'Green') {
      penalty += 3;
    }
    
    // Rosebud shifts
    if (shift.includes('Red')) {
      penalty += 1;
      if (shift === 'Red PM') {
        penalty += 2; // PM is less desirable
      }
      // Apply doctor's Rosebud preference
      penalty -= doctor.rosebud_preference;
    }
    
    // Friday PM shifts
    if (isFriday && (shift.includes('PM') || shift === 'Green' || shift === 'Orange')) {
      penalty += 2;
    }
    
    return Math.max(0, penalty);
  }

  generateRoster() {
    const dates = this.generateDates();
    const roster = {};
    
    // Initialize penalty points for all doctors
    this.doctors.forEach(doc => {
      this.penaltyPoints[doc.id] = 0;
    });
    
    // Generate assignments for each date
    dates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isFriday = dayOfWeek === 5;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      roster[dateStr] = {};
      
      // Get available doctors for this date
      const availableDoctors = this.doctors.filter(doc => 
        doc.status === 'active' && this.isDoctorAvailable(doc, date)
      );
      
      // Determine which shifts to assign
      let shiftsToAssign = [];
      
      if (!isWeekend) {
        // Weekday shifts
        shiftsToAssign = [
          ...FRANKSTON_AM_SHIFTS.map(s => ({ shift: s, type: 'AM', site: 'Frankston' })),
          ...FRANKSTON_PM_SHIFTS.map(s => ({ shift: s, type: 'PM', site: 'Frankston' })),
          { shift: 'Red AM', type: 'AM', site: 'Rosebud' },
          { shift: 'Red PM', type: 'PM', site: 'Rosebud' }
        ];
      } else {
        // Weekend shifts (reduced)
        shiftsToAssign = [
          { shift: 'Blue', type: 'AM', site: 'Frankston' },
          { shift: 'Yellow', type: 'AM', site: 'Frankston' },
          { shift: 'Green', type: 'PM', site: 'Frankston' },
          { shift: 'Orange', type: 'PM', site: 'Frankston' },
          { shift: 'Red AM', type: 'AM', site: 'Rosebud' }
        ];
      }
      
      // Assign doctors to shifts
      const assignedDoctors = new Set();
      
      shiftsToAssign.forEach(({ shift, type, site }) => {
        // Find best doctor for this shift
        let bestDoctor = null;
        let lowestScore = Infinity;
        
        availableDoctors.forEach(doc => {
          // Skip if already assigned today
          if (assignedDoctors.has(doc.id)) return;
          
          // Calculate score (penalty points + shift penalty)
          const shiftPenalty = this.calculatePenalty(shift, doc, isFriday);
          const totalScore = this.penaltyPoints[doc.id] + shiftPenalty;
          
          if (totalScore < lowestScore) {
            lowestScore = totalScore;
            bestDoctor = doc;
          }
        });
        
        if (bestDoctor) {
          roster[dateStr][shift] = bestDoctor.name;
          assignedDoctors.add(bestDoctor.id);
          const penalty = this.calculatePenalty(shift, bestDoctor, isFriday);
          this.penaltyPoints[bestDoctor.id] += penalty;
        } else {
          roster[dateStr][shift] = 'VACANT';
        }
      });
    });
    
    this.assignments = roster;
    return roster;
  }

  generateCalendarView() {
    const lines = [];
    lines.push('Calendar View - Peninsula Health Roster');
    lines.push('=' .repeat(80));
    lines.push('');
    
    const dates = Object.keys(this.assignments).sort();
    const allShifts = new Set();
    
    // Collect all unique shifts
    dates.forEach(date => {
      Object.keys(this.assignments[date]).forEach(shift => allShifts.add(shift));
    });
    
    const shiftList = Array.from(allShifts).sort();
    
    // Header
    lines.push('Date,' + shiftList.join(','));
    
    // Data rows
    dates.forEach(date => {
      const row = [date];
      shiftList.forEach(shift => {
        row.push(this.assignments[date][shift] || '');
      });
      lines.push(row.join(','));
    });
    
    return lines.join('\n');
  }

  generateDoctorView() {
    const lines = [];
    lines.push('Doctor View - Individual Schedules');
    lines.push('=' .repeat(80));
    lines.push('');
    
    this.doctors.forEach(doctor => {
      lines.push(`Dr. ${doctor.name} (EFT: ${doctor.eft})`);
      lines.push('-'.repeat(40));
      
      const dates = Object.keys(this.assignments).sort();
      let shiftCount = 0;
      
      dates.forEach(date => {
        Object.entries(this.assignments[date]).forEach(([shift, assignedDoc]) => {
          if (assignedDoc === doctor.name) {
            lines.push(`  ${date}: ${shift}`);
            shiftCount++;
          }
        });
      });
      
      if (shiftCount === 0) {
        lines.push('  No shifts assigned');
      }
      
      lines.push(`  Total shifts: ${shiftCount}`);
      lines.push(`  Penalty points: ${this.penaltyPoints[doctor.id] || 0}`);
      lines.push('');
    });
    
    return lines.join('\n');
  }

  generateDoctorSummary() {
    const lines = [];
    lines.push('Doctor Summary Statistics');
    lines.push('=' .repeat(80));
    lines.push('');
    lines.push('Doctor,Total Shifts,Penalty Points,Avg Penalty/Shift');
    
    const summary = [];
    
    this.doctors.forEach(doctor => {
      let shiftCount = 0;
      
      Object.values(this.assignments).forEach(dayAssignments => {
        Object.values(dayAssignments).forEach(assignedDoc => {
          if (assignedDoc === doctor.name) {
            shiftCount++;
          }
        });
      });
      
      const penalty = this.penaltyPoints[doctor.id] || 0;
      const avgPenalty = shiftCount > 0 ? (penalty / shiftCount).toFixed(2) : '0.00';
      
      summary.push({
        name: doctor.name,
        shifts: shiftCount,
        penalty: penalty,
        avgPenalty: avgPenalty
      });
    });
    
    // Sort by total shifts descending
    summary.sort((a, b) => b.shifts - a.shifts);
    
    summary.forEach(doc => {
      lines.push(`${doc.name},${doc.shifts},${doc.penalty},${doc.avgPenalty}`);
    });
    
    return lines.join('\n');
  }

  generateStatistics() {
    const stats = {
      total_shifts: 0,
      assigned_shifts: 0,
      vacant_shifts: 0,
      coverage_rate: 0,
      average_penalty_points: 0,
      max_penalty_points: 0,
      min_penalty_points: Infinity,
      shifts_per_doctor: {}
    };
    
    // Count shifts
    Object.values(this.assignments).forEach(dayAssignments => {
      Object.values(dayAssignments).forEach(assignedDoc => {
        stats.total_shifts++;
        if (assignedDoc === 'VACANT') {
          stats.vacant_shifts++;
        } else {
          stats.assigned_shifts++;
        }
      });
    });
    
    // Calculate coverage rate
    stats.coverage_rate = stats.total_shifts > 0 
      ? ((stats.assigned_shifts / stats.total_shifts) * 100).toFixed(1)
      : 0;
    
    // Calculate penalty statistics
    const penalties = Object.values(this.penaltyPoints);
    if (penalties.length > 0) {
      const totalPenalty = penalties.reduce((a, b) => a + b, 0);
      stats.average_penalty_points = (totalPenalty / penalties.length).toFixed(1);
      stats.max_penalty_points = Math.max(...penalties);
      stats.min_penalty_points = Math.min(...penalties);
    }
    
    return stats;
  }

  generate() {
    this.generateRoster();
    
    const result = {
      success: true,
      outputs: {
        calendar_view: this.generateCalendarView(),
        doctor_view: this.generateDoctorView(),
        doctor_summary: this.generateDoctorSummary()
      },
      statistics: this.generateStatistics()
    };
    
    return result;
  }
}

// Main execution when called directly
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    if (args.length < 3) {
      throw new Error('Usage: node roster_generator.js <config_file> <weeks> <start_date>');
    }
    
    const [configPath, weeksStr, startDate] = args;
    const weeks = parseInt(weeksStr);
    
    // Read config file
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    // Generate roster
    const generator = new RosterGenerator(config, weeks, startDate);
    const result = generator.generate();
    
    // Output result as JSON to stdout
    console.log(JSON.stringify(result));
    
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message
    }));
    process.exit(1);
  }
}

// Export for use as module
module.exports = { RosterGenerator };

// Run if called directly
if (require.main === module) {
  main();
}