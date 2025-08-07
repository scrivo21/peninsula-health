export interface DoctorProfile {
  id: string;
  name: string;
  eft: number;
  rosebud_preference: number;
  unavailable_dates: string[];
  preferred_shifts: string[];
  // Additional metadata for UI
  email?: string;
  phone?: string;
  specialization?: string;
  hire_date?: string;
  status: 'active' | 'inactive' | 'on_leave';
  total_shifts_this_month?: number;
  undesirable_shifts_assigned?: number;
  last_modified?: string;
  avatar?: string;
  current_shifts?: CurrentShift[];
}

export interface CurrentShift {
  date: string;
  shift_type: string;
  hospital: 'Frankston' | 'Rosebud';
  start_time: string;
  end_time: string;
  is_leadership?: boolean;
}

export interface DoctorFormData {
  name: string;
  eft: number;
  rosebud_preference: number;
  unavailable_dates: string[];
  preferred_shifts: string[];
  email: string;
  phone: string;
  specialization: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  avatar: string;
}

export interface DoctorStatistics {
  total_doctors: number;
  active_doctors: number;
  inactive_doctors: number;
  on_leave_doctors: number;
  average_eft: number;
  total_eft_capacity: number;
}

// Shift preferences mapping
export const SHIFT_PREFERENCES = [
  'Blue (Frankston Day Leadership)',
  'Yellow (Frankston Day)',
  'Pink (Frankston Day)',
  'Brown (Frankston Day)',
  'EPIC (Frankston Day)',
  'Green (Frankston Evening Leadership)', 
  'Orange (Frankston Evening)',
  'Red AM (Rosebud Day)',
  'Red PM (Rosebud Evening)',
];

// Rosebud preference scale
export const ROSEBUD_PREFERENCE_SCALE = {
  '-2': 'Strongly Dislike',
  '-1': 'Dislike',
  '0': 'Neutral',
  '1': 'Like',
  '2': 'Prefer'
};

// Specializations
export const SPECIALIZATIONS = [
  'Emergency Medicine',
  'Internal Medicine',
  'Family Medicine',
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'Surgery',
  'Anesthesiology',
  'Radiology',
  'Other'
];

export interface DoctorListFilters {
  search: string;
  status: 'all' | 'active' | 'inactive' | 'on_leave';
  eft_range: {
    min: number;
    max: number;
  };
  rosebud_preference: 'all' | 'positive' | 'neutral' | 'negative';
}

// Fun avatar options for doctors
export const DOCTOR_AVATARS = [
  '🦸', '🦹', '🧙', '🧚', '🦁', '🐯', '🦊', '🐺', '🦝', '🐻',
  '🐼', '🐨', '🐵', '🦒', '🦓', '🦄', '🐉', '🦅', '🦉', '🦜',
  '🦢', '🦩', '🐧', '🦈', '🐙', '🦋', '🐝', '🐞', '🦗', '🕷️',
  '🌺', '🌻', '🌹', '🌷', '🌸', '🏔️', '🌊', '⭐', '🌟', '✨',
  '🔥', '❄️', '🌈', '⚡', '🎯', '🎨', '🎭', '🎪', '🎸', '🥁'
];