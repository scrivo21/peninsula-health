import React from 'react';
import { ShiftTypeInfo, ShiftAnalytics } from '../../types/shifts';
import styles from './ShiftAnalyticsView.module.css';

interface ShiftAnalyticsViewProps {
  shift: ShiftTypeInfo;
  analytics?: ShiftAnalytics;
}

export const ShiftAnalyticsView: React.FC<ShiftAnalyticsViewProps> = ({
  shift,
  analytics
}) => {
  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'Low':
        return '🟢';
      case 'Medium':
        return '🟡';
      case 'High':
        return '🔴';
      default:
        return '⚫';
    }
  };

  return (
    <div className={styles.analyticsView}>
      <div className={styles.header}>
        <h2 className={styles.shiftTitle}>{shift.name}</h2>
        <div className={styles.headerBadges}>
          {shift.is_leadership && (
            <span className={`${styles.badge} ${styles.leadership}`}>
              👑 Leadership
            </span>
          )}
          {shift.is_clinical && (
            <span className={`${styles.badge} ${styles.clinical}`}>
              🏥 Clinical
            </span>
          )}
          <span className={`${styles.badge} ${styles.difficulty}`}>
            {getDifficultyIcon(shift.difficulty_level)} {shift.difficulty_level}
          </span>
        </div>
      </div>

      <div className={styles.basicInfo}>
        <div className={styles.infoCard}>
          <h3 className={styles.cardTitle}>Basic Information</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Location</span>
              <span className={styles.value}>{shift.location}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Hours</span>
              <span className={styles.value}>{shift.hours}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Type</span>
              <span className={styles.value}>
                {shift.is_clinical ? 'Clinical' : 'Non-Clinical'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Difficulty</span>
              <span className={styles.value}>
                {getDifficultyIcon(shift.difficulty_level)} {shift.difficulty_level}
              </span>
            </div>
          </div>
          
          {shift.description && (
            <div className={styles.description}>
              <span className={styles.label}>Description</span>
              <p className={styles.descriptionText}>{shift.description}</p>
            </div>
          )}

          {shift.requirements && shift.requirements.length > 0 && (
            <div className={styles.requirements}>
              <span className={styles.label}>Requirements</span>
              <ul className={styles.requirementsList}>
                {shift.requirements.map((requirement, index) => (
                  <li key={index} className={styles.requirementItem}>
                    {requirement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {analytics && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{analytics.total_assignments}</div>
              <div className={styles.statLabel}>Total Assignments</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{analytics.unique_doctors}</div>
              <div className={styles.statLabel}>Unique Doctors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>
                {analytics.avg_per_doctor.toFixed(1)}
              </div>
              <div className={styles.statLabel}>Avg per Doctor</div>
            </div>
            <div className={styles.statCard}>
              <div 
                className={styles.statValue}
                style={{ 
                  color: analytics.undesirable_rate > 0.3 ? '#ef4444' : '#10b981' 
                }}
              >
                {Math.round(analytics.undesirable_rate * 100)}%
              </div>
              <div className={styles.statLabel}>Undesirable Rate</div>
            </div>
          </div>

          {analytics.recent_assignments && analytics.recent_assignments.length > 0 && (
            <div className={styles.recentAssignments}>
              <h3 className={styles.sectionTitle}>Recent Assignments</h3>
              <div className={styles.assignmentsList}>
                {analytics.recent_assignments.slice(0, 10).map((assignment, index) => (
                  <div key={index} className={styles.assignmentItem}>
                    <div className={styles.assignmentDate}>
                      {new Date(assignment.date).toLocaleDateString()}
                    </div>
                    <div className={styles.assignmentDoctor}>
                      {assignment.doctor_name}
                    </div>
                    <div className={styles.assignmentLocation}>
                      {assignment.location}
                    </div>
                    {assignment.is_undesirable && (
                      <div className={styles.undesirableFlag}>⚠️ Undesirable</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.trends && analytics.trends.length > 0 && (
            <div className={styles.trendsSection}>
              <h3 className={styles.sectionTitle}>Assignment Trends</h3>
              <div className={styles.trendsList}>
                {analytics.trends.map((trend, index) => (
                  <div key={index} className={styles.trendItem}>
                    <div className={styles.trendPeriod}>{trend.period}</div>
                    <div className={styles.trendStats}>
                      <span className={styles.trendAssignments}>
                        {trend.assignments} assignments
                      </span>
                      <span 
                        className={styles.trendRate}
                        style={{ 
                          color: trend.undesirable_rate > 0.3 ? '#ef4444' : '#10b981' 
                        }}
                      >
                        {Math.round(trend.undesirable_rate * 100)}% undesirable
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!analytics && (
        <div className={styles.noAnalytics}>
          <div className={styles.noAnalyticsIcon}>📊</div>
          <h3>No Analytics Available</h3>
          <p>Analytics data is not available for this shift type yet.</p>
        </div>
      )}
    </div>
  );
};