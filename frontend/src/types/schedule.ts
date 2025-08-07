export interface Shift {
  id: string;
  type: ShiftType;
  hospital: 'Frankston' | 'Rosebud';
  startTime: string;
  endTime: string;
  doctorId?: string;
  doctorName?: string;
  doctor_name?: string; // Backend uses this format
  isUndesirable?: boolean;
}

export interface ShiftType {
  name: string;
  color: string;
  backgroundColor: string;
  isLeadership?: boolean;
}

export interface DaySchedule {
  date: string;
  shifts: Shift[];
}

export interface Doctor {
  id: string;
  name: string;
  eft: number;
  rosebud_preference: number;
  unavailable_dates: string[];
}

export interface ScheduleData {
  days: DaySchedule[];
  doctors: Doctor[];
  period_start: string;
  period_end: string;
}

// Predefined shift types with colors matching the original system
export const SHIFT_TYPES: { [key: string]: ShiftType } = {
  // Frankston Day Shifts
  'Blue': {
    name: 'Blue (Leadership)',
    color: '#FFFFFF',
    backgroundColor: '#2563EB',
    isLeadership: true
  },
  'Yellow': {
    name: 'Yellow',
    color: '#000000',
    backgroundColor: '#FDE047'
  },
  'Pink': {
    name: 'Pink',
    color: '#000000',
    backgroundColor: '#F472B6'
  },
  'Brown': {
    name: 'Brown',
    color: '#FFFFFF',
    backgroundColor: '#A16207'
  },
  'EPIC': {
    name: 'EPIC',
    color: '#FFFFFF',
    backgroundColor: '#7C3AED'
  },
  
  // Frankston Evening Shifts
  'Green': {
    name: 'Green (Leadership)',
    color: '#FFFFFF',
    backgroundColor: '#16A34A',
    isLeadership: true
  },
  'Orange': {
    name: 'Orange',
    color: '#000000',
    backgroundColor: '#FB923C'
  },
  
  // Rosebud Shifts
  'Red AM': {
    name: 'Red AM (8am-6pm)',
    color: '#FFFFFF',
    backgroundColor: '#DC2626'
  },
  'Red PM': {
    name: 'Red PM (2pm-12am)',
    color: '#FFFFFF',
    backgroundColor: '#991B1B'
  },
  
  // Default/Unknown
  'Unknown': {
    name: 'Unknown',
    color: '#000000',
    backgroundColor: '#D1D5DB'
  }
};

export interface CalendarDay {
  date: Date;
  shifts: Shift[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface WeekRow {
  days: CalendarDay[];
}

// Roster Generation Types
export interface RosterGenerationRequest {
  start_date: string;
  end_date: string;
  hospitals?: Array<'Frankston' | 'Rosebud'>;
  shift_types?: string[];
  exclude_doctors?: string[];
}

export interface BackendRosterRequest {
  start_date: string;
  weeks: number;
}

export interface RosterJob {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: number;
  message?: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface RosterGenerationResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface RosterStatusResponse {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  roster_data?: ScheduleData;
  created_at: string;
  completed_at?: string;
  error?: string;
  outputs?: {
    calendar_view?: string;
    doctor_view?: string;
    doctor_summary?: string;
  };
  availableOutputs?: string[];
  weeks?: number;
  startDate?: string;
  statistics?: any;
  modifiedShifts?: string[];  // Array of shift keys that have been modified
}

export interface ShiftModification {
  shift_id: string;
  doctor_id?: string;
  doctor_name?: string; // Backend uses this format
  action: 'assign' | 'unassign' | 'add' | 'remove';
}

export interface ShiftModificationRequest {
  modifications: ShiftModification[];
  reason?: string;
}

export interface ExportFormat {
  type: 'csv' | 'pdf';
  format: 'all' | 'distribution' | 'management';
}

export interface ExportResponse {
  download_url: string;
  filename: string;
  expires_at: string;
}