import React from 'react';
import { RosterStatusResponse } from '../../types/schedule';
import { DoctorProfile } from '../../types/doctor';
import { RosterView } from './RosterView';
import '../../styles/components.css';

interface RosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  rosterStatus: RosterStatusResponse;
  doctors: DoctorProfile[];
  onShiftReassign: (date: string, shiftName: string, currentDoctor: string, newDoctor: string) => Promise<void>;
  isReassigning: boolean;
  onExport?: (format: 'all' | 'distribution' | 'management', type: 'csv' | 'pdf') => Promise<void>;
}

export const RosterModal: React.FC<RosterModalProps> = ({
  isOpen,
  onClose,
  rosterStatus,
  doctors,
  onShiftReassign,
  isReassigning,
  onExport
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleExport = async () => {
    if (onExport) {
      try {
        await onExport('all', 'csv');
      } catch (error) {
        console.error('Export failed in modal:', error);
      }
    } else {
      alert('Export functionality not available');
    }
  };

  return (
    <div className="modalOverlay" onClick={handleOverlayClick}>
      <div 
        className="modalContent" 
        style={{ 
          maxWidth: '95vw', 
          width: '1400px', 
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <header className="modalHeader">
          <h1 className="modalTitle">Hospital Roster Schedule</h1>
          <button
            className="modalCloseButton"
            onClick={onClose}
            aria-label="Close roster modal"
          >
            ×
          </button>
        </header>

        {/* Modal Body - Scrollable Roster Content */}
        <div style={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: 'var(--spacing-6)',
          backgroundColor: 'var(--color-background)'
        }}>
          <RosterView
            rosterStatus={rosterStatus}
            doctors={doctors}
            onShiftReassign={onShiftReassign}
            isReassigning={isReassigning}
          />
        </div>

        {/* Modal Footer */}
        <footer style={{
          padding: 'var(--spacing-6)',
          borderTop: '1px solid var(--color-gray-200)',
          backgroundColor: 'var(--color-gray-50)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--spacing-4)',
          flexShrink: 0
        }}>
          <div style={{ 
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-gray-600)'
          }}>
            Double-click any shift to reassign it to another doctor
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
            <button className="btnSecondary" onClick={handleExport}>
              📊 Export Roster
            </button>
            <button className="btnPrimary" onClick={onClose}>
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};