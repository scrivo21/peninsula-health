import React, { useState, useCallback, useMemo } from 'react';
import { RosterStatusResponse } from '../../types/schedule';
import { DoctorProfile } from '../../types/doctor';
import styles from './RosterView.module.css';

interface RosterViewProps {
  rosterStatus: RosterStatusResponse;
  doctors: DoctorProfile[];
  onShiftReassign: (date: string, shiftName: string, currentDoctor: string, newDoctor: string) => Promise<void>;
  isReassigning: boolean;
}

interface ShiftAssignment {
  date: string;
  shiftName: string;
  doctorName: string;
  doctorId: string;
  isVacant: boolean;
  isUndesirable: boolean;
  shiftType: string;
  location: string;
}

interface ReassignModalState {
  isOpen: boolean;
  shift: ShiftAssignment | null;
  availableDoctors: DoctorProfile[];
  selectedDoctorId: string;
}

export const RosterView: React.FC<RosterViewProps> = ({
  rosterStatus,
  doctors,
  onShiftReassign,
  isReassigning
}) => {
  const [activeTab, setActiveTab] = useState<'frankston' | 'rosebud' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [reassignModal, setReassignModal] = useState<ReassignModalState>({
    isOpen: false,
    shift: null,
    availableDoctors: [],
    selectedDoctorId: ''
  });

  const parseCalendarView = useCallback(() => {
    if (!rosterStatus.outputs?.calendar_view) return { dates: [], shifts: [], assignments: new Map() };
    
    const lines = rosterStatus.outputs.calendar_view.trim().split('\n');
    if (lines.length < 2) return { dates: [], shifts: [], assignments: new Map() };
    
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
    const shifts = headers.slice(1); // Remove 'Date' column
    const dates: string[] = [];
    const assignments = new Map<string, string>(); // key: date-shift, value: doctor name
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((cell: string) => cell.trim().replace(/"/g, ''));
      const date = row[0];
      dates.push(date);
      
      shifts.forEach((shift: string, index: number) => {
        const doctorName = row[index + 1] || '';
        const key = `${date}-${shift}`;
        assignments.set(key, doctorName);
      });
    }
    
    return { dates, shifts, assignments };
  }, [rosterStatus.outputs?.calendar_view]);

  const createShiftAssignment = useCallback((
    date: string, 
    shiftName: string, 
    doctorName: string
  ): ShiftAssignment => {
    const doctor = doctors.find(d => d.name === doctorName);
    const parts = shiftName.split(' ');
    const location = parts[0] || '';
    const shiftType = parts.slice(1).join(' ') || '';
    
    return {
      date,
      shiftName,
      doctorName: doctorName || 'VACANT',
      doctorId: doctor?.id || '',
      isVacant: !doctorName || doctorName === 'VACANT' || doctorName === '',
      isUndesirable: false, // Remove undesirable logic - keep everything neutral
      shiftType,
      location
    };
  }, [doctors]);

  // Check if a shift has been modified
  const isShiftModified = useCallback((date: string, shiftName: string): boolean => {
    const shiftKey = `${date}-${shiftName}`;
    return rosterStatus.modifiedShifts?.includes(shiftKey) || false;
  }, [rosterStatus.modifiedShifts]);

  const handleShiftDoubleClick = useCallback(async (shift: ShiftAssignment) => {
    // Find available doctors for this shift (exclude currently assigned doctor)
    const availableDoctors = doctors.filter(doctor => 
      doctor.status === 'active' && 
      doctor.name !== shift.doctorName
    );
    
    setReassignModal({
      isOpen: true,
      shift,
      availableDoctors,
      selectedDoctorId: availableDoctors[0]?.id || ''
    });
  }, [doctors]);

  const handleReassignConfirm = async () => {
    if (!reassignModal.shift || !reassignModal.selectedDoctorId) return;
    
    const newDoctor = doctors.find(d => d.id === reassignModal.selectedDoctorId);
    if (!newDoctor) return;
    
    try {
      await onShiftReassign(
        reassignModal.shift.date,
        reassignModal.shift.shiftName,
        reassignModal.shift.doctorName,
        newDoctor.name
      );
      
      setReassignModal({
        isOpen: false,
        shift: null,
        availableDoctors: [],
        selectedDoctorId: ''
      });
    } catch (error) {
      console.error('Failed to reassign shift:', error);
    }
  };

  const handleReassignCancel = () => {
    setReassignModal({
      isOpen: false,
      shift: null,
      availableDoctors: [],
      selectedDoctorId: ''
    });
  };

  const getShiftCellClass = (shift: ShiftAssignment, isModified: boolean) => {
    let className = styles.shiftCell;
    
    if (isModified) {
      className += ` ${styles.modified}`;  // Purple styling for modified shifts
    } else if (shift.isVacant) {
      className += ` ${styles.vacant}`;
    }
    if (shift.isUndesirable) {
      className += ` ${styles.undesirable}`;
    }
    if (shift.location === 'Rosebud') {
      className += ` ${styles.rosebud}`;
    }
    
    return className;
  };

  const getShiftCardClass = (shift: ShiftAssignment, isModified: boolean) => {
    let className = '';
    
    if (isModified) {
      className += ` ${styles.modifiedCard}`;  // Purple styling for modified shifts
    } else if (shift.isVacant) {
      className += ` ${styles.vacantCard}`;
    }
    if (shift.isUndesirable) {
      className += ` ${styles.undesirableCard}`;
    }
    if (shift.location === 'Rosebud') {
      className += ` ${styles.rosebudCard}`;
    }
    
    return className;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const { dates, shifts, assignments } = parseCalendarView();

  // Group shifts by hospital and format headers
  const shiftGroups = useMemo(() => {
    const frankston: string[] = [];
    const rosebud: string[] = [];
    const other: string[] = [];

    shifts.forEach(shift => {
      if (shift.toLowerCase().includes('frankston')) {
        frankston.push(shift);
      } else if (shift.toLowerCase().includes('rosebud')) {
        rosebud.push(shift);
      } else {
        other.push(shift);
      }
    });

    return { frankston, rosebud, other };
  }, [shifts]);

  // Format shift header for better readability
  const formatShiftHeader = useCallback((shift: string) => {
    const parts = shift.split(' ');
    const location = parts[0];
    const shiftDetails = parts.slice(1).join(' ');
    
    // Simplify common patterns
    let simplified = shiftDetails
      .replace('Blue AM', 'Blue')
      .replace('Brown AM', 'Brown')
      .replace('Green AM', 'Green')
      .replace('AM', 'AM')
      .replace('PM', 'PM');
    
    return {
      location,
      shift: simplified,
      original: shift,
      isUndesirable: false // Remove all undesirable indicators
    };
  }, []);

  // Get filtered shifts based on active tab
  const getFilteredShifts = useCallback(() => {
    switch (activeTab) {
      case 'frankston':
        return shiftGroups.frankston;
      case 'rosebud':
        return shiftGroups.rosebud;
      default:
        return shifts;
    }
  }, [activeTab, shiftGroups, shifts]);

  const filteredShifts = getFilteredShifts();

  if (dates.length === 0 || shifts.length === 0) {
    return (
      <div className={styles.noDataState}>
        <div className={styles.noDataIcon}>📅</div>
        <h3>No Roster Data Available</h3>
        <p>Generate a roster to view the schedule here.</p>
      </div>
    );
  }

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.rosterHeader}>
        <div className={styles.titleSection}>
          <h2>Hospital Roster Schedule</h2>
          <p className={styles.instructions}>
            Clean, professional roster view with simplified styling
          </p>
        </div>
        
        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.tabGroup}>
            <button 
              className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Hospitals
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'frankston' ? styles.active : ''}`}
              onClick={() => setActiveTab('frankston')}
            >
              Frankston ({shiftGroups.frankston.length})
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'rosebud' ? styles.active : ''}`}
              onClick={() => setActiveTab('rosebud')}
            >
              Rosebud ({shiftGroups.rosebud.length})
            </button>
          </div>
          
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.viewButton} ${viewMode === 'table' ? styles.active : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              📊
            </button>
            <button 
              className={`${styles.viewButton} ${viewMode === 'cards' ? styles.active : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card View"
            >
              🗃️
            </button>
          </div>
        </div>
      </div>

      {/* Roster Content */}
      {viewMode === 'table' ? (
        <div className={styles.rosterGrid}>
          <div className={styles.rosterTable}>
            {/* Header Row */}
            <div className={styles.headerRow}>
              <div className={styles.dateHeader}>
                <span>Date</span>
              </div>
              {filteredShifts.map((shift: string, index: number) => {
                const shiftInfo = formatShiftHeader(shift);
                return (
                  <div key={index} className={styles.shiftHeader}>
                    <div className={styles.shiftLocation}>{shiftInfo.location}</div>
                    <div className={styles.shiftName}>{shiftInfo.shift}</div>
                  </div>
                );
              })}
            </div>
          
            {/* Date Rows */}
            {dates.map((date) => {
              const dayOfWeek = new Date(date).getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              
              return (
                <div key={date} className={`${styles.dateRow} ${isWeekend ? styles.weekendRow : ''}`}>
                  <div className={styles.dateCell}>
                    <div className={styles.dateMain}>{formatDate(date)}</div>
                    <div className={styles.dateISO}>{date}</div>
                    {isWeekend && <div className={styles.weekendBadge}>Weekend</div>}
                  </div>
                  {filteredShifts.map((shift: string, shiftIndex: number) => {
                    const key = `${date}-${shift}`;
                    const doctorName = assignments.get(key) || '';
                    const shiftAssignment = createShiftAssignment(date, shift, doctorName);
                    const isModified = isShiftModified(date, shift);
                    
                    return (
                      <div
                        key={shiftIndex}
                        className={getShiftCellClass(shiftAssignment, isModified)}
                        onDoubleClick={() => handleShiftDoubleClick(shiftAssignment)}
                        title={`${shift}\n${formatDate(date)}\nAssigned: ${shiftAssignment.doctorName}${isModified ? '\n(Modified)' : ''}\nDouble-click to reassign`}
                      >
                        <div className={styles.doctorName}>
                          {shiftAssignment.isVacant ? (
                            <span className={styles.vacantText}>VACANT</span>
                          ) : (
                            <span className={styles.assignedText}>
                              {shiftAssignment.doctorName.split(' ').map((name, idx) => 
                                idx === 0 ? name : name.charAt(0) + '.'
                              ).join(' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.cardView}>
          {dates.map((date) => {
            const dayOfWeek = new Date(date).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            return (
              <div key={date} className={`${styles.dateCard} ${isWeekend ? styles.weekendCard : ''}`}>
                <div className={styles.dateCardHeader}>
                  <h3>{formatDate(date)}</h3>
                  <span className={styles.dateCardISO}>{date}</span>
                  {isWeekend && <span className={styles.weekendLabel}>Weekend</span>}
                </div>
                
                <div className={styles.shiftsGrid}>
                  {filteredShifts.map((shift: string, shiftIndex: number) => {
                    const key = `${date}-${shift}`;
                    const doctorName = assignments.get(key) || '';
                    const shiftAssignment = createShiftAssignment(date, shift, doctorName);
                    const shiftInfo = formatShiftHeader(shift);
                    const isModified = isShiftModified(date, shift);
                    
                    return (
                      <div
                        key={shiftIndex}
                        className={`${styles.shiftCard} ${getShiftCardClass(shiftAssignment, isModified)}`}
                        onDoubleClick={() => handleShiftDoubleClick(shiftAssignment)}
                        title={`${isModified ? '(Modified) ' : ''}Double-click to reassign`}
                      >
                        <div className={styles.shiftCardHeader}>
                          <span className={styles.shiftLocation}>{shiftInfo.location}</span>
                          <span className={styles.shiftTime}>{shiftInfo.shift}</span>
                        </div>
                        <div className={styles.shiftCardDoctor}>
                          {shiftAssignment.isVacant ? (
                            <span className={styles.vacantText}>VACANT</span>
                          ) : (
                            <span className={styles.assignedText}>
                              {shiftAssignment.doctorName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Legend:</div>
        <div className={styles.legendItems}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.vacant}`}></div>
            <span>Vacant Shift</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.assigned}`}></div>
            <span>Assigned Shift</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSwatch} ${styles.modified}`}></div>
            <span>Modified Shift</span>
          </div>
        </div>
      </div>

      {/* Reassign Modal */}
      {reassignModal.isOpen && reassignModal.shift && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Reassign Shift</h3>
              <button
                className={styles.closeButton}
                onClick={handleReassignCancel}
              >
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.shiftDetails}>
                <h4>Shift Details</h4>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Date:</span>
                  <span className={styles.value}>{formatDate(reassignModal.shift.date)}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Shift:</span>
                  <span className={styles.value}>
                    {reassignModal.shift.shiftName}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.label}>Current Assignment:</span>
                  <span className={styles.value}>
                    {reassignModal.shift.isVacant ? 'VACANT' : reassignModal.shift.doctorName}
                  </span>
                </div>
              </div>
              
              <div className={styles.reassignForm}>
                <label className={styles.formLabel}>
                  Assign to Doctor:
                </label>
                <select
                  value={reassignModal.selectedDoctorId}
                  onChange={(e) => setReassignModal(prev => ({
                    ...prev,
                    selectedDoctorId: e.target.value
                  }))}
                  className={styles.doctorSelect}
                >
                  <option value="">Select a doctor...</option>
                  {reassignModal.availableDoctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} (EFT: {doctor.eft})
                    </option>
                  ))}
                </select>
                
                {reassignModal.selectedDoctorId && (
                  <div className={styles.doctorInfo}>
                    {(() => {
                      const selectedDoctor = doctors.find(d => d.id === reassignModal.selectedDoctorId);
                      return selectedDoctor && (
                        <>
                          <div className={styles.infoRow}>
                            <span>Specialization: {selectedDoctor.specialization}</span>
                          </div>
                          <div className={styles.infoRow}>
                            <span>Status: {selectedDoctor.status}</span>
                          </div>
                          <div className={styles.infoRow}>
                            <span>Rosebud Preference: {selectedDoctor.rosebud_preference}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={handleReassignCancel}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleReassignConfirm}
                disabled={!reassignModal.selectedDoctorId || isReassigning}
              >
                {isReassigning ? '⏳ Reassigning...' : 'Confirm Reassignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};