import React, { useState, useEffect } from 'react';
import { DoctorProfile } from '../../types/doctor';

interface UnavailabilityPeriod {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  type: string;
  created_at: string;
  updated_at?: string;
}

interface UnavailabilitySectionProps {
  doctor: DoctorProfile;
  formatDate: (dateString: string) => string;
  styles: Record<string, string>;
}

export const UnavailabilitySection: React.FC<UnavailabilitySectionProps> = ({
  doctor,
  formatDate,
  styles
}) => {
  const [unavailabilityPeriods, setUnavailabilityPeriods] = useState<UnavailabilityPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<UnavailabilityPeriod | null>(null);
  const [newPeriod, setNewPeriod] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    type: 'unavailable'
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    periodId: string | null;
    periodText: string;
  }>({
    isOpen: false,
    periodId: null,
    periodText: ''
  });

  // Load unavailability periods
  useEffect(() => {
    loadUnavailabilityPeriods();
  }, [doctor.id]);

  const loadUnavailabilityPeriods = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/doctors/${doctor.id}/unavailability`);
      const result = await response.json();
      
      if (result.success) {
        setUnavailabilityPeriods(result.data || []);
      } else {
        console.error('Failed to load unavailability periods:', result.error);
      }
    } catch (error) {
      console.error('Error loading unavailability periods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addUnavailabilityPeriod = async () => {
    if (!newPeriod.start_date || !newPeriod.end_date) {
      alert('Please provide both start and end dates');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/doctors/${doctor.id}/unavailability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPeriod)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUnavailabilityPeriods(prev => [...prev, result.data]);
        setIsAddModalOpen(false);
        setNewPeriod({
          start_date: '',
          end_date: '',
          reason: '',
          type: 'unavailable'
        });
      } else {
        alert(`Failed to add unavailability period: ${result.error}`);
      }
    } catch (error) {
      console.error('Error adding unavailability period:', error);
      alert('Failed to add unavailability period');
    }
  };

  const updateUnavailabilityPeriod = async () => {
    if (!selectedPeriod) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/doctors/${doctor.id}/unavailability/${selectedPeriod.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            start_date: selectedPeriod.start_date,
            end_date: selectedPeriod.end_date,
            reason: selectedPeriod.reason,
            type: selectedPeriod.type
          })
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setUnavailabilityPeriods(prev =>
          prev.map(period => period.id === selectedPeriod.id ? result.data : period)
        );
        setIsEditModalOpen(false);
        setSelectedPeriod(null);
      } else {
        alert(`Failed to update unavailability period: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating unavailability period:', error);
      alert('Failed to update unavailability period');
    }
  };

  const showDeleteConfirm = (periodId: string, period: UnavailabilityPeriod) => {
    const periodText = `${formatDate(period.start_date)} to ${formatDate(period.end_date)} - ${period.reason}`;
    setDeleteConfirmModal({
      isOpen: true,
      periodId,
      periodText
    });
  };

  const deleteUnavailabilityPeriod = async () => {
    if (!deleteConfirmModal.periodId) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/doctors/${doctor.id}/unavailability/${deleteConfirmModal.periodId}`,
        {
          method: 'DELETE'
        }
      );
      
      const result = await response.json();
      
      if (result.success) {
        setUnavailabilityPeriods(prev => prev.filter(period => period.id !== deleteConfirmModal.periodId));
        setDeleteConfirmModal({ isOpen: false, periodId: null, periodText: '' });
      } else {
        alert(`Failed to delete unavailability period: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting unavailability period:', error);
      alert('Failed to delete unavailability period');
    }
  };

  const getCurrentUnavailability = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return unavailabilityPeriods.filter(period => {
      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);
      return startDate <= today && endDate >= today;
    });
  };

  const getUpcomingUnavailability = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return unavailabilityPeriods.filter(period => {
      const startDate = new Date(period.start_date);
      return startDate > today;
    }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  };

  const currentUnavailability = getCurrentUnavailability();
  const upcomingUnavailability = getUpcomingUnavailability();

  return (
    <div className={styles.profileSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Unavailability Management</h2>
        <button
          className={styles.addButton}
          onClick={() => setIsAddModalOpen(true)}
          disabled={isLoading}
        >
          + Add Period
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <p>Loading unavailability periods...</p>
        </div>
      ) : (
        <>
          {/* Current Unavailability */}
          {currentUnavailability.length > 0 && (
            <div className={styles.unavailabilityGroup}>
              <h3 className={styles.groupTitle}>🚫 Currently Unavailable</h3>
              <div className={styles.periodsList}>
                {currentUnavailability.map(period => (
                  <UnavailabilityPeriodCard
                    key={period.id}
                    period={period}
                    formatDate={formatDate}
                    styles={styles}
                    onEdit={() => {
                      setSelectedPeriod(period);
                      setIsEditModalOpen(true);
                    }}
                    onDelete={() => showDeleteConfirm(period.id, period)}
                    isCurrent={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Unavailability */}
          {upcomingUnavailability.length > 0 && (
            <div className={styles.unavailabilityGroup}>
              <h3 className={styles.groupTitle}>⏰ Upcoming Unavailability</h3>
              <div className={styles.periodsList}>
                {upcomingUnavailability.map(period => (
                  <UnavailabilityPeriodCard
                    key={period.id}
                    period={period}
                    formatDate={formatDate}
                    styles={styles}
                    onEdit={() => {
                      setSelectedPeriod(period);
                      setIsEditModalOpen(true);
                    }}
                    onDelete={() => showDeleteConfirm(period.id, period)}
                    isCurrent={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className={styles.unavailabilitySummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNumber}>{unavailabilityPeriods.length}</span>
              <span className={styles.summaryLabel}>Total Periods</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNumber}>{currentUnavailability.length}</span>
              <span className={styles.summaryLabel}>Currently Unavailable</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryNumber}>{upcomingUnavailability.length}</span>
              <span className={styles.summaryLabel}>Upcoming</span>
            </div>
          </div>

          {unavailabilityPeriods.length === 0 && (
            <div className={styles.emptyState}>
              <p>✅ No unavailability periods recorded for {doctor.name}</p>
              <p>Click "Add Period" to add vacation, leave, or other unavailability.</p>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Add Unavailability Period</h3>
              <button
                className={styles.closeButton}
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Start Date:</label>
                <input
                  type="date"
                  value={newPeriod.start_date}
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, start_date: e.target.value }))}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>End Date:</label>
                <input
                  type="date"
                  value={newPeriod.end_date}
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, end_date: e.target.value }))}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Type:</label>
                <select
                  value={newPeriod.type}
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, type: e.target.value }))}
                  className={styles.formSelect}
                >
                  <option value="unavailable">Unavailable</option>
                  <option value="vacation">Vacation</option>
                  <option value="sick_leave">Sick Leave</option>
                  <option value="training">Training</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reason:</label>
                <textarea
                  value={newPeriod.reason}
                  onChange={(e) => setNewPeriod(prev => ({ ...prev, reason: e.target.value }))}
                  className={styles.formTextarea}
                  placeholder="Optional reason or notes..."
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={addUnavailabilityPeriod}
              >
                Add Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedPeriod && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Edit Unavailability Period</h3>
              <button
                className={styles.closeButton}
                onClick={() => setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Start Date:</label>
                <input
                  type="date"
                  value={selectedPeriod.start_date}
                  onChange={(e) => setSelectedPeriod(prev => prev ? ({ ...prev, start_date: e.target.value }) : null)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>End Date:</label>
                <input
                  type="date"
                  value={selectedPeriod.end_date}
                  onChange={(e) => setSelectedPeriod(prev => prev ? ({ ...prev, end_date: e.target.value }) : null)}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Type:</label>
                <select
                  value={selectedPeriod.type}
                  onChange={(e) => setSelectedPeriod(prev => prev ? ({ ...prev, type: e.target.value }) : null)}
                  className={styles.formSelect}
                >
                  <option value="unavailable">Unavailable</option>
                  <option value="vacation">Vacation</option>
                  <option value="sick_leave">Sick Leave</option>
                  <option value="training">Training</option>
                  <option value="conference">Conference</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reason:</label>
                <textarea
                  value={selectedPeriod.reason}
                  onChange={(e) => setSelectedPeriod(prev => prev ? ({ ...prev, reason: e.target.value }) : null)}
                  className={styles.formTextarea}
                  placeholder="Optional reason or notes..."
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={updateUnavailabilityPeriod}
              >
                Update Period
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirm Deletion</h3>
              <button
                className={styles.closeButton}
                onClick={() => setDeleteConfirmModal({ isOpen: false, periodId: null, periodText: '' })}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to delete this unavailability period?</p>
              <div className={styles.confirmDetails}>
                <strong>{deleteConfirmModal.periodText}</strong>
              </div>
              <p>This action cannot be undone.</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setDeleteConfirmModal({ isOpen: false, periodId: null, periodText: '' })}
              >
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                onClick={deleteUnavailabilityPeriod}
              >
                Delete Period
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface UnavailabilityPeriodCardProps {
  period: UnavailabilityPeriod;
  formatDate: (dateString: string) => string;
  styles: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  isCurrent: boolean;
}

const UnavailabilityPeriodCard: React.FC<UnavailabilityPeriodCardProps> = ({
  period,
  formatDate,
  styles,
  onEdit,
  onDelete,
  isCurrent
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vacation': return '🏖️';
      case 'sick_leave': return '🤒';
      case 'training': return '📚';
      case 'conference': return '🎤';
      case 'other': return '📋';
      default: return '🚫';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vacation': return '#4CAF50';
      case 'sick_leave': return '#FF9800';
      case 'training': return '#2196F3';
      case 'conference': return '#9C27B0';
      case 'other': return '#607D8B';
      default: return '#F44336';
    }
  };

  return (
    <div className={`${styles.periodCard} ${isCurrent ? styles.currentPeriod : ''}`}>
      <div className={styles.periodHeader}>
        <div className={styles.periodType}>
          <span className={styles.typeIcon}>{getTypeIcon(period.type)}</span>
          <span className={styles.typeLabel} style={{ color: getTypeColor(period.type) }}>
            {period.type.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div className={styles.periodActions}>
          <button className={styles.editButton} onClick={onEdit}>
            ✏️
          </button>
          <button className={styles.deleteButton} onClick={onDelete}>
            🗑️
          </button>
        </div>
      </div>
      <div className={styles.periodDates}>
        <span className={styles.dateRange}>
          {formatDate(period.start_date)} → {formatDate(period.end_date)}
        </span>
        <span className={styles.duration}>
          {Math.ceil((new Date(period.end_date).getTime() - new Date(period.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
        </span>
      </div>
      {period.reason && (
        <div className={styles.periodReason}>
          {period.reason}
        </div>
      )}
    </div>
  );
};