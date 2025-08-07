import React, { useState, useEffect } from 'react';
import { UndesirableShift, UndesirableShiftSummary, DoctorUndesirableLoad, ReportView, ReportTimeframe } from '../../types/reports';
import { RosterAnalyticsService } from '../../services/rosterAnalyticsApi';
import styles from './UndesirableShiftsReport.module.css';

export const UndesirableShiftsReport: React.FC = () => {
  const [undesirableShifts, setUndesirableShifts] = useState<UndesirableShift[]>([]);
  const [shiftSummary, setShiftSummary] = useState<UndesirableShiftSummary[]>([]);
  const [doctorLoads, setDoctorLoads] = useState<DoctorUndesirableLoad[]>([]);
  const [selectedView, setSelectedView] = useState<ReportView>('shifts');
  const [selectedTimeframe, setSelectedTimeframe] = useState<ReportTimeframe>('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUndesirableShiftsData();
  }, [selectedTimeframe]);

  const loadUndesirableShiftsData = async () => {
    setIsLoading(true);
    
    try {
      if (!RosterAnalyticsService.isRosterDataAvailable()) {
        setUndesirableShifts([]);
        setShiftSummary([]);
        setDoctorLoads([]);
        setIsLoading(false);
        return;
      }

      const { shifts, summary, doctorLoads } = RosterAnalyticsService.getUndesirableShiftsData();
      
      setUndesirableShifts(shifts);
      setShiftSummary(summary);
      setDoctorLoads(doctorLoads.sort((a, b) => b.penalty_points - a.penalty_points));
    } catch (error) {
      console.error('Failed to load undesirable shifts data:', error);
      setUndesirableShifts([]);
      setShiftSummary([]);
      setDoctorLoads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPenaltyColor = (score: number) => {
    if (score >= 3.0) return '#dc3545';
    if (score >= 2.0) return '#fd7e14';
    if (score >= 1.0) return '#ffc107';
    return '#28a745';
  };

  const getFairnessColor = (ratio: number) => {
    if (ratio > 1.3) return '#dc3545'; // Very unfair - too many
    if (ratio > 1.1) return '#fd7e14'; // Somewhat unfair
    if (ratio >= 0.9) return '#28a745'; // Fair
    if (ratio >= 0.7) return '#ffc107'; // Needs more
    return '#dc3545'; // Very unfair - too few
  };

  const totalUndesirableShifts = shiftSummary.reduce((sum, item) => sum + item.total_assignments, 0);
  const averagePenaltyScore = shiftSummary.length > 0 
    ? (shiftSummary.reduce((sum, item) => sum + (item.penalty_score * item.total_assignments), 0) / totalUndesirableShifts)
    : 0;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading undesirable shifts analysis...</p>
      </div>
    );
  }

  // Check if no roster data is available
  const hasRosterData = RosterAnalyticsService.isRosterDataAvailable();
  const rosterInfo = RosterAnalyticsService.getRosterGenerationInfo();

  if (!hasRosterData) {
    return (
      <div className={styles.undesirableContainer}>
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>📊</div>
          <h3>No Roster Data Available</h3>
          <p>Generate a roster in the Schedule page to view undesirable shifts analysis.</p>
          <button 
            className={styles.generateButton}
            onClick={() => window.location.href = '/schedule'}
          >
            Go to Schedule Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.undesirableContainer}>
      {/* Header */}
      <div className={styles.reportHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.reportTitle}>⚠️ Undesirable Shifts Analysis</h2>
          <p className={styles.reportDescription}>
            Analyze challenging shift assignments and ensure fair distribution across all doctors
          </p>
        </div>
        
        <div className={styles.headerControls}>
          <div className={styles.controlGroup}>
            <label>View:</label>
            <select 
              value={selectedView} 
              onChange={(e) => setSelectedView(e.target.value as any)}
              className={styles.select}
            >
              <option value="shifts">Current Shifts</option>
              <option value="doctors">Doctor Loads</option>
              <option value="analysis">Fairness Analysis</option>
            </select>
          </div>
          
          <div className={styles.controlGroup}>
            <label>Timeframe:</label>
            <select 
              value={selectedTimeframe} 
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className={styles.select}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>⚠️</div>
          <div className={styles.summaryContent}>
            <h3 className={styles.summaryNumber}>{totalUndesirableShifts}</h3>
            <p className={styles.summaryLabel}>Total Undesirable Shifts</p>
          </div>
        </div>
        
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📊</div>
          <div className={styles.summaryContent}>
            <h3 className={styles.summaryNumber}>{averagePenaltyScore.toFixed(1)}</h3>
            <p className={styles.summaryLabel}>Avg Penalty Score</p>
          </div>
        </div>
        
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>👥</div>
          <div className={styles.summaryContent}>
            <h3 className={styles.summaryNumber}>{doctorLoads.length}</h3>
            <p className={styles.summaryLabel}>Doctors Affected</p>
          </div>
        </div>
        
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>⚖️</div>
          <div className={styles.summaryContent}>
            <h3 className={styles.summaryNumber}>
              {doctorLoads.filter(d => d.fairness_ratio > 1.1 || d.fairness_ratio < 0.9).length}
            </h3>
            <p className={styles.summaryLabel}>Fairness Imbalances</p>
          </div>
        </div>
      </div>

      {/* Content based on selected view */}
      {selectedView === 'shifts' && (
        <div className={styles.contentSection}>
          <h3 className={styles.sectionTitle}>📋 Upcoming Undesirable Shifts</h3>
          <div className={styles.shiftsList}>
            {undesirableShifts.map((shift, index) => (
              <div key={index} className={styles.shiftCard}>
                <div 
                  className={styles.penaltyIndicator}
                  style={{ backgroundColor: getPenaltyColor(shift.penalty_score) }}
                >
                  {shift.penalty_score.toFixed(1)}
                </div>
                
                <div className={styles.shiftDetails}>
                  <div className={styles.shiftHeader}>
                    <h4 className={styles.shiftType}>{shift.shift_type}</h4>
                    <span className={styles.hospitalBadge} data-hospital={shift.hospital.toLowerCase()}>
                      {shift.hospital}
                    </span>
                  </div>
                  
                  <div className={styles.doctorAssignment}>
                    <span className={styles.doctorAvatar}>{shift.doctor_avatar}</span>
                    <span className={styles.doctorName}>{shift.doctor_name}</span>
                  </div>
                  
                  <div className={styles.shiftMeta}>
                    <span className={styles.shiftDate}>📅 {shift.date}</span>
                    <span className={styles.shiftTimes}>⏰ {shift.start_time} - {shift.end_time}</span>
                  </div>
                  
                  <div className={styles.reasonsList}>
                    {shift.reasons.map((reason, idx) => (
                      <span key={idx} className={styles.reasonTag}>{reason}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'doctors' && (
        <div className={styles.contentSection}>
          <h3 className={styles.sectionTitle}>👥 Doctor Undesirable Load Distribution</h3>
          <div className={styles.doctorLoadsList}>
            {doctorLoads.map((doctor, index) => (
              <div key={index} className={styles.doctorLoadCard}>
                <div className={styles.doctorHeader}>
                  <div className={styles.doctorInfo}>
                    <span className={styles.doctorAvatar}>{doctor.doctor_avatar}</span>
                    <span className={styles.doctorName}>{doctor.doctor_name}</span>
                  </div>
                  <div 
                    className={styles.fairnessIndicator}
                    style={{ backgroundColor: getFairnessColor(doctor.fairness_ratio) }}
                  >
                    {doctor.fairness_ratio.toFixed(1)}x
                  </div>
                </div>
                
                <div className={styles.loadMetrics}>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Undesirable Shifts:</span>
                    <span className={styles.metricValue}>{doctor.total_undesirable}</span>
                  </div>
                  <div className={styles.metric}>
                    <span className={styles.metricLabel}>Penalty Points:</span>
                    <span className={styles.metricValue}>{doctor.penalty_points.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className={styles.shiftTypes}>
                  {doctor.shift_types.map((type, idx) => (
                    <span key={idx} className={styles.shiftTypeTag}>{type}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'analysis' && (
        <div className={styles.contentSection}>
          <h3 className={styles.sectionTitle}>📈 Shift Type Analysis</h3>
          <div className={styles.analysisGrid}>
            {shiftSummary.map((summary, index) => (
              <div key={index} className={styles.analysisCard}>
                <div className={styles.analysisHeader}>
                  <h4 className={styles.analysisTitle}>{summary.shift_type}</h4>
                  <div 
                    className={styles.penaltyBadge}
                    style={{ backgroundColor: getPenaltyColor(summary.penalty_score) }}
                  >
                    {summary.penalty_score.toFixed(1)}
                  </div>
                </div>
                
                <div className={styles.analysisMetrics}>
                  <div className={styles.analysisMetric}>
                    <span className={styles.analysisNumber}>{summary.total_assignments}</span>
                    <span className={styles.analysisLabel}>Assignments</span>
                  </div>
                  <div className={styles.analysisMetric}>
                    <span className={styles.analysisNumber}>{summary.frequency.toFixed(1)}%</span>
                    <span className={styles.analysisLabel}>Coverage Rate</span>
                  </div>
                </div>
                
                <div className={styles.reasonsList}>
                  <strong>Undesirable Factors:</strong>
                  {summary.reasons.map((reason, idx) => (
                    <span key={idx} className={styles.reasonTag}>{reason}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className={styles.recommendations}>
        <h3 className={styles.sectionTitle}>💡 Fairness Recommendations</h3>
        <div className={styles.recommendationsList}>
          <div className={styles.recommendationCard}>
            <span className={styles.recommendationIcon}>⚖️</span>
            <div className={styles.recommendationContent}>
              <h4>Balance Leadership Roles</h4>
              <p>
                Blue and Green leadership shifts show high penalty scores. Consider rotating these roles 
                more frequently among qualified doctors to distribute the burden.
              </p>
            </div>
          </div>
          
          <div className={styles.recommendationCard}>
            <span className={styles.recommendationIcon}>🏥</span>
            <div className={styles.recommendationContent}>
              <h4>Rosebud Assignment Strategy</h4>
              <p>
                Red PM shifts at Rosebud are highly undesirable. Consider incentives or limit consecutive 
                assignments to the same doctor to improve fairness.
              </p>
            </div>
          </div>
          
          <div className={styles.recommendationCard}>
            <span className={styles.recommendationIcon}>📅</span>
            <div className={styles.recommendationContent}>
              <h4>Friday PM Distribution</h4>
              <p>
                Friday evening shifts affect work-life balance. Ensure these are distributed evenly 
                and consider compensation or time-off adjustments.
              </p>
            </div>
          </div>
          
          <div className={styles.recommendationCard}>
            <span className={styles.recommendationIcon}>🔄</span>
            <div className={styles.recommendationContent}>
              <h4>Rotation Schedule</h4>
              <p>
                Implement a systematic rotation to ensure no doctor receives disproportionate 
                undesirable assignments over time. Monitor fairness ratios monthly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UndesirableShiftsReport;