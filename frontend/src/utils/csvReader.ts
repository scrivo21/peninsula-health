import { ScheduleData, Shift, DaySchedule, Doctor, SHIFT_TYPES } from '../types/schedule';

export class CSVReader {
  /**
   * Parse CSV content and convert to schedule data
   * Expected CSV format: Date,Hospital,Shift,StartTime,EndTime,Doctor,DoctorId
   */
  static parseScheduleCSV(csvContent: string): ScheduleData {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('CSV Headers:', headers);
    
    const shifts: Shift[] = [];
    const doctorsMap = new Map<string, Doctor>();
    let periodStart = '';
    let periodEnd = '';
    
    // Parse each data row
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      
      if (values.length < headers.length) {
        console.warn(`Skipping malformed line ${i + 1}:`, lines[i]);
        continue;
      }
      
      try {
        const row: { [key: string]: string } = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        
        // Extract shift data
        const date = this.parseDate(row['Date'] || row['date']);
        const hospital = (row['Hospital'] || row['hospital'] || 'Frankston') as 'Frankston' | 'Rosebud';
        const shiftName = row['Shift'] || row['shift'] || 'Unknown';
        const startTime = row['StartTime'] || row['start_time'] || '08:00';
        const endTime = row['EndTime'] || row['end_time'] || '18:00';
        const doctorName = row['Doctor'] || row['doctor'] || '';
        const doctorId = row['DoctorId'] || row['doctor_id'] || this.generateDoctorId(doctorName);
        
        if (!date) {
          console.warn(`Invalid date on line ${i + 1}:`, row['Date']);
          continue;
        }
        
        // Track period dates
        const dateStr = date.toISOString().split('T')[0];
        if (!periodStart || dateStr < periodStart) {
          periodStart = dateStr;
        }
        if (!periodEnd || dateStr > periodEnd) {
          periodEnd = dateStr;
        }
        
        // Create shift
        const shift: Shift = {
          id: `${dateStr}-${hospital}-${shiftName}-${startTime}`,
          type: SHIFT_TYPES[shiftName] || SHIFT_TYPES['Unknown'],
          hospital,
          startTime,
          endTime,
          doctorId: doctorName ? doctorId : undefined,
          doctorName: doctorName || undefined,
          isUndesirable: this.isUndesirableShift(shiftName, hospital, dateStr)
        };
        
        shifts.push(shift);
        
        // Track doctors
        if (doctorName && doctorId) {
          if (!doctorsMap.has(doctorId)) {
            doctorsMap.set(doctorId, {
              id: doctorId,
              name: doctorName,
              eft: 0.8, // Default EFT
              rosebud_preference: 0, // Neutral preference
              unavailable_dates: []
            });
          }
        }
        
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error, lines[i]);
      }
    }
    
    // Group shifts by date
    const daysMap = new Map<string, DaySchedule>();
    
    shifts.forEach(shift => {
      const dateKey = shift.id.split('-')[0];
      
      if (!daysMap.has(dateKey)) {
        daysMap.set(dateKey, {
          date: dateKey,
          shifts: []
        });
      }
      
      daysMap.get(dateKey)!.shifts.push(shift);
    });
    
    // Sort days and shifts
    const days = Array.from(daysMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    days.forEach(day => {
      day.shifts.sort((a, b) => {
        // Sort by hospital first, then by start time
        if (a.hospital !== b.hospital) {
          return a.hospital.localeCompare(b.hospital);
        }
        return a.startTime.localeCompare(b.startTime);
      });
    });
    
    console.log(`Parsed ${shifts.length} shifts across ${days.length} days`);
    console.log(`Period: ${periodStart} to ${periodEnd}`);
    
    return {
      days,
      doctors: Array.from(doctorsMap.values()),
      period_start: periodStart,
      period_end: periodEnd
    };
  }
  
  /**
   * Parse a CSV line handling quoted values and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  /**
   * Parse date string in various formats
   */
  private static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    // Try various date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
    ];
    
    const cleanDate = dateStr.trim();
    
    // Try parsing with built-in Date constructor
    const date = new Date(cleanDate);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    console.warn('Could not parse date:', dateStr);
    return null;
  }
  
  /**
   * Generate a consistent doctor ID from name
   */
  private static generateDoctorId(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  /**
   * Determine if a shift is undesirable based on rules
   */
  private static isUndesirableShift(shiftName: string, hospital: string, dateStr: string): boolean {
    // Leadership shifts are undesirable
    if (shiftName === 'Blue' || shiftName === 'Green') {
      return true;
    }
    
    // Rosebud PM shifts are undesirable
    if (hospital === 'Rosebud' && shiftName === 'Red PM') {
      return true;
    }
    
    // Friday PM shifts are undesirable
    const date = new Date(dateStr);
    if (date.getDay() === 5) { // Friday
      const isPMShift = shiftName.includes('PM') || 
                        shiftName === 'Green' || 
                        shiftName === 'Orange' ||
                        shiftName === 'Red PM';
      if (isPMShift) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Read CSV file from the file input
   */
  static async readCSVFile(file: File): Promise<ScheduleData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const csvContent = event.target?.result as string;
          const scheduleData = this.parseScheduleCSV(csvContent);
          resolve(scheduleData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
  
  /**
   * Create sample CSV data for testing
   */
  static generateSampleCSV(): string {
    const headers = ['Date', 'Hospital', 'Shift', 'StartTime', 'EndTime', 'Doctor', 'DoctorId'];
    const sampleData = [
      ['2025-01-01', 'Frankston', 'Blue', '08:00', '18:00', 'Dr. Sarah Mitchell', 'sarah_mitchell'],
      ['2025-01-01', 'Frankston', 'Yellow', '08:00', '18:00', 'Dr. John Doe', 'john_doe'],
      ['2025-01-01', 'Frankston', 'Green', '18:00', '02:00', 'Dr. Emily Johnson', 'emily_johnson'],
      ['2025-01-01', 'Rosebud', 'Red AM', '08:00', '18:00', 'Dr. Michael Brown', 'michael_brown'],
      ['2025-01-01', 'Rosebud', 'Red PM', '14:00', '00:00', 'Dr. Lisa Anderson', 'lisa_anderson'],
      
      ['2025-01-02', 'Frankston', 'Blue', '08:00', '18:00', 'Dr. Robert Wilson', 'robert_wilson'],
      ['2025-01-02', 'Frankston', 'Pink', '08:00', '18:00', 'Dr. Sarah Mitchell', 'sarah_mitchell'],
      ['2025-01-02', 'Frankston', 'Orange', '18:00', '02:00', 'Dr. John Doe', 'john_doe'],
      ['2025-01-02', 'Rosebud', 'Red AM', '08:00', '18:00', 'Dr. Emily Johnson', 'emily_johnson'],
    ];
    
    const csvLines = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ];
    
    return csvLines.join('\n');
  }

  /**
   * Get color for doctor name display
   */
  static getDoctorColor(doctorName: string): string {
    const colors = [
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#e67e22', '#34495e', '#16a085', '#27ae60',
      '#2980b9', '#8e44ad', '#c0392b', '#d35400', '#7f8c8d'
    ];
    
    // Use the doctor name to consistently assign a color
    let hash = 0;
    for (let i = 0; i < doctorName.length; i++) {
      hash = doctorName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}