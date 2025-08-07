// Types for Reports functionality

export interface VacantShift {
  date: string;
  shift_type: string;
  hospital: 'Frankston' | 'Rosebud';
  start_time: string;
  end_time: string;
  reason?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface VacantShiftSummary {
  shift_type: string;
  vacant_count: number;
  total_shifts: number;
  vacancy_rate: number;
}

export interface DoctorStatistics {
  doctor_name: string;
  avatar: string;
  eft: number;
  total_hours: number;
  max_hours: number;
  eft_utilization: number;
  total_shifts: number;
  undesirable_shifts: number;
  clinical_shifts: number;
  admin_shifts: number;
  remaining_hours: number;
  fairness_score: number;
}

export interface TeamStatistics {
  total_doctors: number;
  active_doctors: number;
  total_eft_capacity: number;
  average_utilization: number;
  total_shifts_assigned: number;
  total_undesirable_shifts: number;
  average_fairness_score: number;
}

export interface UndesirableShift {
  date: string;
  shift_type: string;
  hospital: 'Frankston' | 'Rosebud';
  doctor_name: string;
  doctor_avatar: string;
  penalty_score: number;
  reasons: string[];
  start_time: string;
  end_time: string;
}

export interface UndesirableShiftSummary {
  shift_type: string;
  total_assignments: number;
  penalty_score: number;
  reasons: string[];
  frequency: number;
}

export interface DoctorUndesirableLoad {
  doctor_name: string;
  doctor_avatar: string;
  total_undesirable: number;
  penalty_points: number;
  shift_types: string[];
  fairness_ratio: number;
}

export type ReportTimeframe = 'week' | 'month' | 'quarter';
export type ReportHospital = 'all' | 'Frankston' | 'Rosebud';
export type ReportView = 'shifts' | 'doctors' | 'analysis';
export type SortMetric = 'name' | 'eft' | 'utilization' | 'shifts' | 'fairness';
export type SortOrder = 'asc' | 'desc';
export type StatisticMetric = 'utilization' | 'workload' | 'fairness';