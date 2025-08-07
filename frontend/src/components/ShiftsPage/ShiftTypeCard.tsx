import React from 'react';
import { ShiftTypeInfo, ShiftAnalytics } from '../../types/shifts';
import styles from './ShiftTypeCard.module.css';

interface ShiftTypeCardProps {
  shift: ShiftTypeInfo;
  analytics?: ShiftAnalytics;
  isSelected: boolean;
  onClick: () => void;
}

export const ShiftTypeCard: React.FC<ShiftTypeCardProps> = ({
  shift,
  analytics,
  isSelected,
  onClick
}) => {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Low':
        return '#10b981';
      case 'Medium':
        return '#f59e0b';
      case 'High':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getShiftTypeColor = () => {
    if (shift.is_leadership) return '#8b5cf6';
    if (shift.is_clinical) return '#3b82f6';
    return '#6b7280';
  };

  return (
    <div
      className={`${styles.shiftTypeCard} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      style={{
        borderLeftColor: getShiftTypeColor(),
        backgroundColor: shift.backgroundColor || '#ffffff',
        color: shift.color || '#000000'
      }}
    >
      <div className={styles.cardHeader}>
        <h3 className={styles.shiftName}>{shift.name}</h3>
        <div className={styles.badges}>
          {shift.is_leadership && (
            <span className={`${styles.badge} ${styles.leadership}`}>
              Leadership
            </span>
          )}
          {shift.is_clinical && (
            <span className={`${styles.badge} ${styles.clinical}`}>
              Clinical
            </span>
          )}
        </div>
      </div>

      <div className={styles.cardContent}>
        <div className={styles.info}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Location:</span>
            <span className={styles.value}>{shift.location}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Hours:</span>
            <span className={styles.value}>{shift.hours}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Difficulty:</span>
            <span 
              className={styles.difficulty}
              style={{ color: getDifficultyColor(shift.difficulty_level) }}
            >
              {shift.difficulty_level}
            </span>
          </div>
        </div>

        {analytics && (
          <div className={styles.analytics}>
            <div className={styles.analyticsItem}>
              <span className={styles.analyticsValue}>
                {analytics.total_assignments}
              </span>
              <span className={styles.analyticsLabel}>Assignments</span>
            </div>
            <div className={styles.analyticsItem}>
              <span className={styles.analyticsValue}>
                {analytics.unique_doctors}
              </span>
              <span className={styles.analyticsLabel}>Doctors</span>
            </div>
            <div className={styles.analyticsItem}>
              <span 
                className={styles.analyticsValue}
                style={{ 
                  color: analytics.undesirable_rate > 0.3 ? '#ef4444' : '#10b981' 
                }}
              >
                {Math.round(analytics.undesirable_rate * 100)}%
              </span>
              <span className={styles.analyticsLabel}>Undesirable</span>
            </div>
          </div>
        )}

        {shift.description && (
          <p className={styles.description}>{shift.description}</p>
        )}
      </div>
    </div>
  );
};