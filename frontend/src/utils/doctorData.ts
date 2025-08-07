import { DoctorProfile, CurrentShift, DOCTOR_AVATARS } from '../types/doctor';

// Helper function to generate sample shifts for current month
const generateSampleShifts = (doctorId: string, totalShifts: number): CurrentShift[] => {
  const shifts: CurrentShift[] = [];
  const shiftTypes = [
    { type: 'Blue (Frankston Day Leadership)', hospital: 'Frankston', start: '08:00', end: '18:00', leadership: true },
    { type: 'Yellow (Frankston Day)', hospital: 'Frankston', start: '08:00', end: '18:00' },
    { type: 'Pink (Frankston Day)', hospital: 'Frankston', start: '08:00', end: '18:00' },
    { type: 'Green (Frankston Evening Leadership)', hospital: 'Frankston', start: '18:00', end: '02:00', leadership: true },
    { type: 'Orange (Frankston Evening)', hospital: 'Frankston', start: '18:00', end: '02:00' },
    { type: 'Red AM (Rosebud Day)', hospital: 'Rosebud', start: '08:00', end: '18:00' },
    { type: 'Red PM (Rosebud Evening)', hospital: 'Rosebud', start: '14:00', end: '00:00' },
  ];

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  for (let i = 0; i < totalShifts; i++) {
    const randomDay = Math.floor(Math.random() * 31) + 1;
    const shiftDate = new Date(currentYear, currentMonth, randomDay);
    
    // Skip if date doesn't exist in this month or is in the past
    if (shiftDate.getMonth() !== currentMonth || shiftDate < today) continue;
    
    const randomShift = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
    
    shifts.push({
      date: shiftDate.toISOString().split('T')[0],
      shift_type: randomShift.type,
      hospital: randomShift.hospital as 'Frankston' | 'Rosebud',
      start_time: randomShift.start,
      end_time: randomShift.end,
      is_leadership: randomShift.leadership || false
    });
  }
  
  // Sort shifts by date
  return shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Sample doctor data based on config.json structure
export const generateSampleDoctors = (): DoctorProfile[] => {
  const sampleDoctors: DoctorProfile[] = [
    {
      id: 'leadbeatter',
      name: 'Dr. Sarah Leadbeatter',
      eft: 0.8,
      rosebud_preference: 0,
      unavailable_dates: ['2025-01-15', '2025-01-16'],
      preferred_shifts: ['Blue (Frankston Day Leadership)', 'Yellow (Frankston Day)'],
      email: 's.leadbeatter@peninsulahealth.org.au',
      phone: '+61 3 9784 7777',
      specialization: 'Emergency Medicine',
      hire_date: '2020-03-15',
      status: 'active',
      total_shifts_this_month: 12,
      undesirable_shifts_assigned: 2,
      last_modified: '2025-01-01T10:00:00Z',
      avatar: '🦸',
      current_shifts: generateSampleShifts('leadbeatter', 12)
    },
    {
      id: 'lamacchia',
      name: 'Dr. Michael Lamacchia',
      eft: 0.5,
      rosebud_preference: -1,
      unavailable_dates: [],
      preferred_shifts: ['Yellow (Frankston Day)', 'Pink (Frankston Day)'],
      email: 'm.lamacchia@peninsulahealth.org.au',
      phone: '+61 3 9784 7778',
      specialization: 'Internal Medicine',
      hire_date: '2019-08-22',
      status: 'active',
      total_shifts_this_month: 8,
      undesirable_shifts_assigned: 1,
      last_modified: '2025-01-01T09:30:00Z',
      avatar: '🦁',
      current_shifts: generateSampleShifts('lamacchia', 8)
    },
    {
      id: 'rosengarten',
      name: 'Dr. Emily Rosengarten',
      eft: 0.25,
      rosebud_preference: 1,
      unavailable_dates: ['2025-01-20', '2025-01-21', '2025-01-22'],
      preferred_shifts: ['Red AM (Rosebud Day)', 'Red PM (Rosebud Evening)'],
      email: 'e.rosengarten@peninsulahealth.org.au',
      phone: '+61 3 9784 7779',
      specialization: 'Family Medicine',
      hire_date: '2021-06-10',
      status: 'active',
      total_shifts_this_month: 4,
      undesirable_shifts_assigned: 0,
      last_modified: '2025-01-01T11:15:00Z',
      avatar: '🌹',
      current_shifts: generateSampleShifts('rosengarten', 4)
    },
    {
      id: 'waliuddin',
      name: 'Dr. Hassan Waliuddin',
      eft: 0.8,
      rosebud_preference: 0,
      unavailable_dates: [],
      preferred_shifts: ['Green (Frankston Evening Leadership)', 'Orange (Frankston Evening)'],
      email: 'h.waliuddin@peninsulahealth.org.au',
      phone: '+61 3 9784 7780',
      specialization: 'Emergency Medicine',
      hire_date: '2018-11-05',
      status: 'active',
      total_shifts_this_month: 13,
      undesirable_shifts_assigned: 3,
      last_modified: '2025-01-01T08:45:00Z',
      avatar: '🦅',
      current_shifts: generateSampleShifts('waliuddin', 13)
    },
    {
      id: 'cheung',
      name: 'Dr. Lisa Cheung',
      eft: 0.5,
      rosebud_preference: 2,
      unavailable_dates: ['2025-01-18'],
      preferred_shifts: ['Red AM (Rosebud Day)', 'EPIC (Frankston Day)'],
      email: 'l.cheung@peninsulahealth.org.au',
      phone: '+61 3 9784 7781',
      specialization: 'Cardiology',
      hire_date: '2022-02-28',
      status: 'active',
      total_shifts_this_month: 7,
      undesirable_shifts_assigned: 1,
      last_modified: '2025-01-01T12:00:00Z',
      avatar: '💝',
      current_shifts: generateSampleShifts('cheung', 7)
    },
    {
      id: 'ghadak',
      name: 'Dr. Rajesh Ghadak',
      eft: 0.66,
      rosebud_preference: -2,
      unavailable_dates: [],
      preferred_shifts: ['Blue (Frankston Day Leadership)', 'Brown (Frankston Day)'],
      email: 'r.ghadak@peninsulahealth.org.au',
      phone: '+61 3 9784 7782',
      specialization: 'Neurology',
      hire_date: '2017-09-12',
      status: 'active',
      total_shifts_this_month: 10,
      undesirable_shifts_assigned: 2,
      last_modified: '2025-01-01T14:20:00Z',
      avatar: '🦓',
      current_shifts: generateSampleShifts('ghadak', 10)
    },
    {
      id: 'lui',
      name: 'Dr. James Lui',
      eft: 0.79,
      rosebud_preference: 1,
      unavailable_dates: ['2025-01-25', '2025-01-26'],
      preferred_shifts: ['Red AM (Rosebud Day)', 'Pink (Frankston Day)'],
      email: 'j.lui@peninsulahealth.org.au',
      phone: '+61 3 9784 7783',
      specialization: 'Orthopedics',
      hire_date: '2020-07-14',
      status: 'active',
      total_shifts_this_month: 11,
      undesirable_shifts_assigned: 1,
      last_modified: '2025-01-01T16:10:00Z',
      avatar: '🌊',
      current_shifts: generateSampleShifts('lui', 11)
    },
    {
      id: 'de_silva',
      name: 'Dr. Priya De Silva',
      eft: 0.63,
      rosebud_preference: 0,
      unavailable_dates: [],
      preferred_shifts: ['Yellow (Frankston Day)', 'Orange (Frankston Evening)'],
      email: 'p.desilva@peninsulahealth.org.au',
      phone: '+61 3 9784 7784',
      specialization: 'Pediatrics',
      hire_date: '2019-04-03',
      status: 'active',
      total_shifts_this_month: 9,
      undesirable_shifts_assigned: 2,
      last_modified: '2025-01-01T13:45:00Z',
      avatar: '🦋',
      current_shifts: generateSampleShifts('de_silva', 9)
    },
    {
      id: 'martinez',
      name: 'Dr. Carlos Martinez',
      eft: 1.0,
      rosebud_preference: -1,
      unavailable_dates: ['2025-01-30', '2025-01-31'],
      preferred_shifts: ['Green (Frankston Evening Leadership)', 'Brown (Frankston Day)'],
      email: 'c.martinez@peninsulahealth.org.au',
      phone: '+61 3 9784 7785',
      specialization: 'Surgery',
      hire_date: '2016-12-01',
      status: 'active',
      total_shifts_this_month: 15,
      undesirable_shifts_assigned: 4,
      last_modified: '2025-01-01T15:30:00Z',
      avatar: '🎆',
      current_shifts: generateSampleShifts('martinez', 15)
    },
    {
      id: 'thompson',
      name: 'Dr. Amanda Thompson',
      eft: 0.4,
      rosebud_preference: 2,
      unavailable_dates: ['2025-01-12', '2025-01-13', '2025-01-14'],
      preferred_shifts: ['Red PM (Rosebud Evening)'],
      email: 'a.thompson@peninsulahealth.org.au',
      phone: '+61 3 9784 7786',
      specialization: 'Anesthesiology',
      hire_date: '2023-01-16',
      status: 'on_leave',
      total_shifts_this_month: 0,
      undesirable_shifts_assigned: 0,
      last_modified: '2025-01-01T09:00:00Z',
      avatar: '❄️',
      current_shifts: []
    },
    {
      id: 'patel',
      name: 'Dr. Vikram Patel',
      eft: 0.7,
      rosebud_preference: 0,
      unavailable_dates: [],
      preferred_shifts: ['EPIC (Frankston Day)', 'Blue (Frankston Day Leadership)'],
      email: 'v.patel@peninsulahealth.org.au',
      phone: '+61 3 9784 7787',
      specialization: 'Radiology',
      hire_date: '2021-03-22',
      status: 'inactive',
      total_shifts_this_month: 0,
      undesirable_shifts_assigned: 0,
      last_modified: '2024-12-15T18:00:00Z',
      avatar: '🎯',
      current_shifts: []
    }
  ];

  return sampleDoctors;
};

// Helper function to convert config.json format to DoctorProfile
export const configToDoctorProfile = (configData: any): DoctorProfile[] => {
  const doctors: DoctorProfile[] = [];
  
  if (configData.DOCTORS) {
    Object.entries(configData.DOCTORS).forEach(([key, value]: [string, any]) => {
      // Skip comment fields
      if (key.startsWith('_')) return;
      
      const totalShifts = Math.floor(Math.random() * 15);
      const doctor: DoctorProfile = {
        id: key.toLowerCase(),
        name: `Dr. ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
        eft: value.eft || 0.8,
        rosebud_preference: value.rosebud_preference || 0,
        unavailable_dates: value.unavailable_dates || [],
        preferred_shifts: value.preferred_shifts || [],
        email: `${key.toLowerCase()}@peninsulahealth.org.au`,
        phone: '+61 3 9784 7777',
        specialization: 'Emergency Medicine',
        hire_date: '2020-01-01',
        status: 'active',
        total_shifts_this_month: totalShifts,
        undesirable_shifts_assigned: Math.floor(Math.random() * 5),
        last_modified: new Date().toISOString(),
        avatar: DOCTOR_AVATARS[Math.floor(Math.random() * DOCTOR_AVATARS.length)],
        current_shifts: generateSampleShifts(key.toLowerCase(), totalShifts)
      };
      
      doctors.push(doctor);
    });
  }
  
  return doctors;
};

// Helper function to export doctors back to config.json format
export const doctorsToConfigFormat = (doctors: DoctorProfile[]) => {
  const config: any = {
    DOCTORS: {
      "_comment": "Configure individual doctor preferences here",
      "_format": "doctor_name: {eft: 0.5-1.0, rosebud_preference: -2 to +2}",
      "_rosebud_scale": "-2=strongly dislike, -1=dislike, 0=neutral, 1=like, 2=prefer"
    }
  };
  
  doctors.forEach(doctor => {
    const key = doctor.name
      .replace(/^Dr\. /, '')
      .toUpperCase()
      .replace(/\s+/g, '_');
    
    config.DOCTORS[key] = {
      eft: doctor.eft,
      rosebud_preference: doctor.rosebud_preference,
      unavailable_dates: doctor.unavailable_dates,
      preferred_shifts: doctor.preferred_shifts
    };
  });
  
  return config;
};