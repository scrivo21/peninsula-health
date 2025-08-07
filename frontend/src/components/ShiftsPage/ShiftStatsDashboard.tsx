import React from 'react';
import { ShiftTypesResponse, ShiftAnalytics } from '../../types/shifts';
import styles from './ShiftStatsDashboard.module.css';

interface ShiftStatsDashboardProps {
  shiftTypes: ShiftTypesResponse | null;
  analytics: ShiftAnalytics[];
}

export const ShiftStatsDashboard: React.FC<ShiftStatsDashboardProps> = ({
  shiftTypes,
  analytics
}) => {
  const getTotalAssignments = () => {
    return analytics.reduce((sum, shift) => sum + shift.total_assignments, 0);
  };

  const getAverageUndesirableRate = () => {
    if (analytics.length === 0) return 0;
    const totalRate = analytics.reduce((sum, shift) => sum + shift.undesirable_rate, 0);
    return totalRate / analytics.length;
  };

  const getMostAssignedShift = () => {
    return analytics.reduce((max, shift) => 
      shift.total_assignments > max.total_assignments ? shift : max, 
      analytics[0] || { shift_type: 'N/A', total_assignments: 0 }
    );
  };

  const getLeastAssignedShift = () => {
    return analytics.reduce((min, shift) => 
      shift.total_assignments < min.total_assignments ? shift : min, 
      analytics[0] || { shift_type: 'N/A', total_assignments: 0 }
    );
  };

  const getShiftsByLocation = () => {
    if (!shiftTypes) return { Frankston: 0, Rosebud: 0 };
    
    const allShifts = [...shiftTypes.clinical_shifts, ...shiftTypes.non_clinical_shifts];
    return allShifts.reduce((acc, shift) => {
      acc[shift.location as keyof typeof acc] = (acc[shift.location as keyof typeof acc] || 0) + 1;
      return acc;
    }, { Frankston: 0, Rosebud: 0 });
  };

  const getHighestUndesirableShift = () => {
    return analytics.reduce((max, shift) => 
      shift.undesirable_rate > max.undesirable_rate ? shift : max, 
      analytics[0] || { shift_type: 'N/A', undesirable_rate: 0 }
    );
  };

  const mostAssigned = getMostAssignedShift();
  const leastAssigned = getLeastAssignedShift();
  const locationBreakdown = getShiftsByLocation();
  const highestUndesirable = getHighestUndesirableShift();

  return (
    <div className={styles.dashboard}>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Overall Statistics</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{getTotalAssignments()}</div>
            <div className={styles.statLabel}>Total Assignments</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {shiftTypes?.statistics?.total_shift_types || 0}
            </div>
            <div className={styles.statLabel}>Shift Types</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {Math.round(getAverageUndesirableRate() * 100)}%
            </div>
            <div className={styles.statLabel}>Avg Undesirable Rate</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {analytics.reduce((sum, shift) => sum + shift.unique_doctors, 0)}
            </div>
            <div className={styles.statLabel}>Total Doctor Assignments</div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🏥 Location Breakdown</h2>
        <div className={styles.locationGrid}>
          <div className={styles.locationCard}>
            <div className={styles.locationHeader}>
              <div className={styles.locationName}>Frankston Hospital</div>
              <div className={styles.locationIcon}>🏥</div>
            </div>
            <div className={styles.locationStats}>
              <div className={styles.locationStat}>
                <span className={styles.locationValue}>{locationBreakdown.Frankston}</span>
                <span className={styles.locationLabel}>Shift Types</span>
              </div>
              <div className={styles.locationStat}>
                <span className={styles.locationValue}>
                  {analytics
                    .filter(shift => shift.shift_type.includes('Frankston') || 
                                   shift.shift_type.includes('Blue') || 
                                   shift.shift_type.includes('Green') ||
                                   shift.shift_type.includes('Yellow') ||
                                   shift.shift_type.includes('Orange'))
                    .reduce((sum, shift) => sum + shift.total_assignments, 0)}
                </span>
                <span className={styles.locationLabel}>Assignments</span>
              </div>
            </div>
          </div>
          
          <div className={styles.locationCard}>
            <div className={styles.locationHeader}>
              <div className={styles.locationName}>Rosebud Hospital</div>
              <div className={styles.locationIcon}>🏥</div>
            </div>
            <div className={styles.locationStats}>
              <div className={styles.locationStat}>
                <span className={styles.locationValue}>{locationBreakdown.Rosebud}</span>
                <span className={styles.locationLabel}>Shift Types</span>
              </div>
              <div className={styles.locationStat}>
                <span className={styles.locationValue}>
                  {analytics
                    .filter(shift => shift.shift_type.includes('Rosebud') || 
                                   shift.shift_type.includes('Red'))
                    .reduce((sum, shift) => sum + shift.total_assignments, 0)}
                </span>
                <span className={styles.locationLabel}>Assignments</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🎯 Key Insights</h2>
        <div className={styles.insightsGrid}>
          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>📈</div>
            <div className={styles.insightContent}>
              <div className={styles.insightTitle}>Most Assigned</div>
              <div className={styles.insightValue}>{mostAssigned.shift_type}</div>
              <div className={styles.insightSubtext}>
                {mostAssigned.total_assignments} assignments
              </div>
            </div>
          </div>

          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>📉</div>
            <div className={styles.insightContent}>
              <div className={styles.insightTitle}>Least Assigned</div>
              <div className={styles.insightValue}>{leastAssigned.shift_type}</div>
              <div className={styles.insightSubtext}>
                {leastAssigned.total_assignments} assignments
              </div>
            </div>
          </div>

          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>⚠️</div>
            <div className={styles.insightContent}>
              <div className={styles.insightTitle}>Highest Undesirable</div>
              <div className={styles.insightValue}>{highestUndesirable.shift_type}</div>
              <div className={styles.insightSubtext}>
                {Math.round(highestUndesirable.undesirable_rate * 100)}% undesirable
              </div>
            </div>
          </div>

          <div className={styles.insightCard}>
            <div className={styles.insightIcon}>👑</div>
            <div className={styles.insightContent}>
              <div className={styles.insightTitle}>Leadership Shifts</div>
              <div className={styles.insightValue}>
                {shiftTypes?.statistics?.leadership_types || 0}
              </div>
              <div className={styles.insightSubtext}>
                out of {shiftTypes?.statistics?.total_shift_types || 0} total
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📋 Detailed Shift Analytics</h2>
        <div className={styles.detailedTable}>
          <div className={styles.tableHeader}>
            <div className={styles.tableCell}>Shift Type</div>
            <div className={styles.tableCell}>Assignments</div>
            <div className={styles.tableCell}>Doctors</div>
            <div className={styles.tableCell}>Avg/Doctor</div>
            <div className={styles.tableCell}>Undesirable Rate</div>
          </div>
          {analytics
            .sort((a, b) => b.total_assignments - a.total_assignments)
            .map((shift, index) => (
              <div key={index} className={styles.tableRow}>
                <div className={styles.tableCell}>
                  <div className={styles.shiftName}>{shift.shift_type}</div>
                </div>
                <div className={styles.tableCell}>
                  <span className={styles.assignmentCount}>
                    {shift.total_assignments}
                  </span>
                </div>
                <div className={styles.tableCell}>
                  <span className={styles.doctorCount}>
                    {shift.unique_doctors}
                  </span>
                </div>
                <div className={styles.tableCell}>
                  <span className={styles.avgAssignments}>
                    {shift.avg_per_doctor.toFixed(1)}
                  </span>
                </div>
                <div className={styles.tableCell}>
                  <span 
                    className={styles.undesirableRate}
                    style={{ 
                      color: shift.undesirable_rate > 0.3 ? '#ef4444' : 
                             shift.undesirable_rate > 0.1 ? '#f59e0b' : '#10b981'
                    }}
                  >
                    {Math.round(shift.undesirable_rate * 100)}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};