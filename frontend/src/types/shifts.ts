export interface ShiftTypeInfo {
  name: string;
  location: string;
  hours: string;
  difficulty_level: 'Low' | 'Medium' | 'High';
  is_clinical: boolean;
  is_leadership: boolean;
  description?: string;
  requirements?: string[];
  color?: string;
  backgroundColor?: string;
}

export interface ShiftStatistics {
  total_assignments: number;
  avg_assignments_per_doctor: number;
  undesirable_rate: number;
  completion_rate: number;
  most_assigned: string;
  least_assigned: string;
}

export interface ShiftTypesResponse {
  clinical_shifts: ShiftTypeInfo[];
  non_clinical_shifts: ShiftTypeInfo[];
  statistics?: {
    total_shift_types: number;
    clinical_types: number;
    non_clinical_types: number;
    leadership_types: number;
  };
}

export interface ShiftAnalytics {
  shift_type: string;
  total_assignments: number;
  unique_doctors: number;
  avg_per_doctor: number;
  undesirable_count: number;
  undesirable_rate: number;
  recent_assignments: ShiftAssignment[];
  trends: ShiftTrend[];
}

export interface ShiftAssignment {
  date: string;
  doctor_name: string;
  doctor_id: string;
  location: string;
  is_undesirable: boolean;
}

export interface ShiftTrend {
  period: string;
  assignments: number;
  undesirable_rate: number;
}

export interface ShiftFilters {
  search: string;
  type: 'all' | 'clinical' | 'non_clinical' | 'leadership';
  location: 'all' | 'Frankston' | 'Rosebud';
  difficulty: 'all' | 'Low' | 'Medium' | 'High';
  sort_by: 'name' | 'assignments' | 'difficulty' | 'location';
  sort_order: 'asc' | 'desc';
}