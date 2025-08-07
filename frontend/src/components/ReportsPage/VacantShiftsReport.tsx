import React, { useState, useEffect } from 'react';
import { VacantShift, VacantShiftSummary, ReportTimeframe, ReportHospital } from '../../types/reports';
import { RosterAnalyticsService } from '../../services/rosterAnalyticsApi';
import styles from './VacantShiftsReport.module.css';

export const VacantShiftsReport: React.FC = () => {
  const [vacantShifts, setVacantShifts] = useState<VacantShift[]>([]);
  const [shiftSummary, setShiftSummary] = useState<VacantShiftSummary[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState<ReportTimeframe>('month');
  const [selectedHospital, setSelectedHospital] = useState<ReportHospital>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVacantShiftsData();
  }, [selectedDateRange, selectedHospital]);

  const loadVacantShiftsData = async () => {
    setIsLoading(true);
    
    try {
      if (!RosterAnalyticsService.isRosterDataAvailable()) {
        // If no roster data is available, show empty state with helpful message
        setVacantShifts([]);
        setShiftSummary([]);
        setIsLoading(false);
        return;
      }

      const { shifts, summary } = RosterAnalyticsService.getVacantShiftsData();
      
      // Filter by selected hospital
      const filteredShifts = selectedHospital === 'all' ? shifts : 
        shifts.filter(shift => shift.hospital === selectedHospital);
      
      setVacantShifts(filteredShifts);
      setShiftSummary(summary);
    } catch (error) {
      console.error('Failed to load vacant shifts data:', error);
      setVacantShifts([]);
      setShiftSummary([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '📋';
      default: return '📋';
    }
  };

  const totalVacancies = shiftSummary.reduce((sum, item) => sum + item.vacant_count, 0);
  const averageVacancyRate = shiftSummary.length > 0 
    ? (shiftSummary.reduce((sum, item) => sum + item.vacancy_rate, 0) / shiftSummary.length).toFixed(1)
    : '0';

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading vacant shifts data...</p>
      </div>
    );
  }

  // Check if no roster data is available
  const hasRosterData = RosterAnalyticsService.isRosterDataAvailable();
  const rosterInfo = RosterAnalyticsService.getRosterGenerationInfo();

  if (!hasRosterData) {
    return (
      <div className={styles.vacantShiftsContainer}>
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>🔄</div>
          <h3>No Roster Data Available</h3>
          <p>Generate a roster in the Schedule page to view vacant shifts analysis.</p>
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
    <div className={styles.vacantShiftsContainer}>
      {/* Header with Controls */}
      <div className={styles.reportHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.reportTitle}>🕳️ Vacant Shifts Analysis</h2>
          <p className={styles.reportDescription}>
            Identify unfilled shifts and understand coverage gaps across both hospitals
          </p>
          {rosterInfo && (
            <p className={styles.rosterInfo}>
              📅 Roster Period: {new Date(rosterInfo.startDate).toLocaleDateString()} ({rosterInfo.weeks} weeks) • 
              Generated: {new Date(rosterInfo.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        
        <div className={styles.headerControls}>
          <div className={styles.controlGroup}>
            <label>Time Range:</label>
            <select 
              value={selectedDateRange} 
              onChange={(e) => setSelectedDateRange(e.target.value as any)}
              className={styles.select}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
          
          <div className={styles.controlGroup}>
            <label>Hospital:</label>
            <select 
              value={selectedHospital} 
              onChange={(e) => setSelectedHospital(e.target.value as any)}
              className={styles.select}
            >
              <option value="all">All Hospitals</option>
              <option value="Frankston">Frankston</option>
              <option value="Rosebud">Rosebud</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>🕳️</div>
          <div className={styles.summaryContent}>
            <h3 className={styles.summaryNumber}>{totalVacancies}</h3>
            <p className={styles.summaryLabel}>Total Vacant Shifts</p>
          </div>
        </div>
        
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>📊</div>
          <div className={styles.summaryContent}>
            <h3 className={styles.summaryNumber}>{averageVacancyRate}%</h3>
            <p className={styles.summaryLabel}>Average Vacancy Rate</p>
          </div>
        </div>
        
        <div className={styles.summaryCard}>
          <div className={styles.summaryIcon}>🚨</div>
          <div className={styles.summaryContent}>
            <h3 className={styles.summaryNumber}>
              {vacantShifts.filter(s => s.urgency === 'critical' || s.urgency === 'high').length}
            </h3>
            <p className={styles.summaryLabel}>High Priority Vacancies</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className={styles.contentGrid}>
        {/* Vacant Shifts by Type Chart */}
        <div className={styles.chartContainer}>
          <h3 className={styles.sectionTitle}>Vacancy Rate by Shift Type</h3>
          <div className={styles.chartBars}>
            {shiftSummary.map((item) => (
              <div key={item.shift_type} className={styles.chartBar}>
                <div className={styles.barLabel}>{item.shift_type}</div>
                <div className={styles.barContainer}>
                  <div 
                    className={styles.barFill}
                    style={{ 
                      width: `${item.vacancy_rate}%`,
                      backgroundColor: item.vacancy_rate > 50 ? '#dc3545' : 
                                     item.vacancy_rate > 25 ? '#fd7e14' : '#28a745'
                    }}
                  />
                  <span className={styles.barValue}>{item.vacancy_rate.toFixed(1)}%</span>
                </div>
                <div className={styles.barCount}>
                  {item.vacant_count}/{item.total_shifts} shifts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Vacant Shifts */}
        <div className={styles.upcomingContainer}>
          <h3 className={styles.sectionTitle}>Upcoming Vacant Shifts</h3>
          <div className={styles.shiftsList}>
            {vacantShifts.length === 0 ? (
              <div className={styles.noData}>
                <span className={styles.noDataIcon}>✅</span>
                <p>No vacant shifts found for the selected period!</p>
              </div>
            ) : (
              vacantShifts.map((shift, index) => (
                <div key={index} className={styles.shiftCard}>
                  <div 
                    className={styles.urgencyIndicator}
                    style={{ backgroundColor: getUrgencyColor(shift.urgency) }}
                  >
                    {getUrgencyIcon(shift.urgency)}
                  </div>
                  
                  <div className={styles.shiftDetails}>
                    <div className={styles.shiftHeader}>
                      <h4 className={styles.shiftType}>{shift.shift_type}</h4>
                      <span className={styles.hospitalBadge} data-hospital={shift.hospital.toLowerCase()}>
                        {shift.hospital}
                      </span>
                    </div>
                    
                    <div className={styles.shiftMeta}>
                      <span className={styles.shiftDate}>📅 {shift.date}</span>
                      <span className={styles.shiftTimes}>⏰ {shift.start_time} - {shift.end_time}</span>
                    </div>
                    
                    {shift.reason && (
                      <p className={styles.shiftReason}>💡 {shift.reason}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VacantShiftsReport;