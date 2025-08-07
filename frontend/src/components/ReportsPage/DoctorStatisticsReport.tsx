import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorProfile } from '../../types/doctor';
import { DoctorStatistics, TeamStatistics, SortMetric, SortOrder, StatisticMetric } from '../../types/reports';
import { getAllDoctors } from '../../services/doctorApi';
import { RosterAnalyticsService } from '../../services/rosterAnalyticsApi';
import styles from './DoctorStatisticsReport.module.css';

export const DoctorStatisticsReport: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStatistics[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStatistics | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<StatisticMetric>('utilization');
  const [sortBy, setSortBy] = useState<SortMetric>('utilization');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to normalize names for better matching
  const normalizeName = (name: string): string => {
    return name.toLowerCase().replace(/^dr\.?\s*/i, '').trim();
  };

  // Find doctor profile with fuzzy name matching
  const findDoctorProfile = (doctorName: string): DoctorProfile | undefined => {
    if (!doctorName || doctors.length === 0) return undefined;
    
    console.log(`Looking for profile for: "${doctorName}"`);
    console.log('Available doctors:', doctors.map(d => `"${d.name}" -> ${d.avatar}`));
    
    // First try exact match
    let profile = doctors.find(d => d.name === doctorName);
    if (profile) {
      console.log(`Exact match found: ${profile.name} -> ${profile.avatar}`);
      return profile;
    }
    
    // Try normalized name match (remove "Dr." prefix, case insensitive)
    const normalizedSearchName = normalizeName(doctorName);
    console.log(`Normalized search name: "${normalizedSearchName}"`);
    
    profile = doctors.find(d => {
      const normalizedProfileName = normalizeName(d.name);
      console.log(`Comparing "${normalizedSearchName}" with "${normalizedProfileName}"`);
      return normalizedProfileName === normalizedSearchName;
    });
    
    if (profile) {
      console.log(`Normalized match found: ${profile.name} -> ${profile.avatar}`);
      return profile;
    }
    
    // Try partial match (useful for different formats)
    profile = doctors.find(d => {
      const profileNormalized = normalizeName(d.name);
      const matches = profileNormalized.includes(normalizedSearchName) || 
                     normalizedSearchName.includes(profileNormalized);
      if (matches) {
        console.log(`Partial match found: ${d.name} -> ${d.avatar}`);
      }
      return matches;
    });
    
    if (!profile) {
      console.log(`No match found for: "${doctorName}"`);
    }
    
    return profile;
  };

  useEffect(() => {
    loadDoctorStatistics();
  }, []);

  const loadDoctorStatistics = async () => {
    setIsLoading(true);
    
    try {
      if (!RosterAnalyticsService.isRosterDataAvailable()) {
        // If no roster data, still try to load basic doctor info
        const response = await getAllDoctors();
        if (response.success && response.data) {
          setDoctors(response.data);
        }
        setDoctorStats([]);
        setTeamStats(null);
        setIsLoading(false);
        return;
      }

      // Load doctor statistics from roster data
      const { doctorStats: rosterStats, teamStats: rosterTeamStats } = RosterAnalyticsService.getDoctorStatistics();
      console.log('Roster doctor names:', rosterStats.map(s => s.doctor_name));
      
      // Load basic doctor info for avatars and other details
      const response = await getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
        console.log('Doctor profiles loaded:', response.data.map(d => `${d.name} -> ${d.avatar}`));
        
        // Enhance roster stats with doctor profile data
        const enhancedStats = rosterStats.map(stat => {
          const doctorProfile = findDoctorProfile(stat.doctor_name);
          console.log(`Avatar matching for ${stat.doctor_name}:`, doctorProfile?.avatar || 'No avatar found');
          return {
            ...stat,
            avatar: doctorProfile?.avatar || '👨‍⚕️'
          };
        });
        
        setDoctorStats(enhancedStats);
      } else {
        setDoctorStats(rosterStats);
      }
      
      setTeamStats(rosterTeamStats);
    } catch (error) {
      console.error('Failed to load doctor statistics:', error);
      setDoctorStats([]);
      setTeamStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const sortedDoctors = React.useMemo(() => {
    const sorted = [...doctorStats].sort((a, b) => {
      let aValue: number;
      let bValue: number;
      
      switch (sortBy) {
        case 'name':
          return sortOrder === 'asc' 
            ? a.doctor_name.localeCompare(b.doctor_name)
            : b.doctor_name.localeCompare(a.doctor_name);
        case 'eft':
          aValue = a.eft;
          bValue = b.eft;
          break;
        case 'utilization':
          aValue = a.eft_utilization;
          bValue = b.eft_utilization;
          break;
        case 'shifts':
          aValue = a.total_shifts;
          bValue = b.total_shifts;
          break;
        case 'fairness':
          aValue = a.fairness_score;
          bValue = b.fairness_score;
          break;
        default:
          aValue = a.eft_utilization;
          bValue = b.eft_utilization;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    return sorted;
  }, [doctorStats, sortBy, sortOrder]);

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 95) return '#dc3545'; // Over-utilized
    if (utilization >= 85) return '#28a745'; // Well utilized
    if (utilization >= 70) return '#ffc107'; // Under-utilized
    return '#6c757d'; // Very under-utilized
  };

  const getFairnessColor = (score: number) => {
    if (score >= 85) return '#28a745';
    if (score >= 70) return '#ffc107';
    return '#dc3545';
  };

  const navigateToDoctor = (doctorName: string) => {
    // Find the doctor profile to get the ID using fuzzy matching
    const doctorProfile = findDoctorProfile(doctorName);
    if (doctorProfile) {
      // Navigate to doctors page with the doctor ID as a search parameter
      navigate(`/doctors?id=${encodeURIComponent(doctorProfile.id)}`);
    } else {
      // Fallback: just navigate to doctors page
      navigate('/doctors');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading doctor statistics...</p>
      </div>
    );
  }

  // Check if no roster data is available
  const hasRosterData = RosterAnalyticsService.isRosterDataAvailable();
  const rosterInfo = RosterAnalyticsService.getRosterGenerationInfo();

  if (!hasRosterData) {
    return (
      <div className={styles.statisticsContainer}>
        <div className={styles.noDataContainer}>
          <div className={styles.noDataIcon}>👨‍⚕️</div>
          <h3>No Roster Data Available</h3>
          <p>Generate a roster in the Schedule page to view detailed doctor statistics and analytics.</p>
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
    <div className={styles.statisticsContainer}>
      {/* Header */}
      <div className={styles.reportHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.reportTitle}>📊 Doctor Statistics</h2>
          <p className={styles.reportDescription}>
            Individual and team performance metrics for roster optimization
          </p>
        </div>
        
        <div className={styles.headerControls}>
          <div className={styles.controlGroup}>
            <label>View:</label>
            <select 
              value={selectedMetric} 
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className={styles.select}
            >
              <option value="utilization">EFT Utilisation</option>
              <option value="workload">Workload Distribution</option>
              <option value="fairness">Fairness Analysis</option>
            </select>
          </div>
          
          <div className={styles.controlGroup}>
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className={styles.select}
            >
              <option value="name">Name</option>
              <option value="eft">EFT</option>
              <option value="utilization">EFT Utilisation</option>
              <option value="shifts">Total Shifts</option>
              <option value="fairness">Fairness Score</option>
            </select>
          </div>
          
          <button 
            className={styles.sortOrderButton}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '⬆️' : '⬇️'}
          </button>
        </div>
      </div>

      {/* Team Overview Cards */}
      {teamStats && (
        <div className={styles.teamOverview}>
          <h3 className={styles.sectionTitle}>🏥 Team Overview</h3>
          <div className={styles.overviewCards}>
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>👥</div>
              <div className={styles.cardContent}>
                <h4>{teamStats.active_doctors}/{teamStats.total_doctors}</h4>
                <p>Active Doctors</p>
              </div>
            </div>
            
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>⚡</div>
              <div className={styles.cardContent}>
                <h4>{teamStats.total_eft_capacity.toFixed(1)}</h4>
                <p>Total EFT Capacity</p>
              </div>
            </div>
            
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>📈</div>
              <div className={styles.cardContent}>
                <h4>{teamStats.average_utilization.toFixed(1)}%</h4>
                <p>Avg EFT Utilisation</p>
              </div>
            </div>
            
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>📋</div>
              <div className={styles.cardContent}>
                <h4>{teamStats.total_shifts_assigned}</h4>
                <p>Total Shifts</p>
              </div>
            </div>
            
            <div className={styles.overviewCard}>
              <div className={styles.cardIcon}>⚖️</div>
              <div className={styles.cardContent}>
                <h4>{teamStats.average_fairness_score.toFixed(1)}</h4>
                <p>Fairness Score</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Statistics Table */}
      <div className={styles.statisticsTable}>
        <h3 className={styles.sectionTitle}>👨‍⚕️ Individual Doctor Statistics</h3>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>EFT</th>
                <th>EFT Utilisation</th>
                <th>Total Shifts</th>
                <th>Undesirable</th>
                {selectedMetric === 'workload' && (
                  <>
                    <th>Clinical</th>
                    <th>Admin</th>
                  </>
                )}
                {selectedMetric === 'fairness' && (
                  <th>Fairness Score</th>
                )}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedDoctors.map((doctor) => (
                <tr key={doctor.doctor_name} className={styles.tableRow}>
                  <td className={styles.doctorCell}>
                    <div 
                      className={styles.doctorInfo}
                      onDoubleClick={() => navigateToDoctor(doctor.doctor_name)}
                      style={{ cursor: 'pointer' }}
                      title="Double-click to view doctor details"
                    >
                      <span className={styles.doctorAvatar}>{doctor.avatar}</span>
                      <span className={styles.doctorName}>{doctor.doctor_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.eftBadge}>
                      {(doctor.eft * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <div className={styles.utilizationCell}>
                      <div 
                        className={styles.utilizationBar}
                        style={{ backgroundColor: getUtilizationColor(doctor.eft_utilization) }}
                      >
                        <div 
                          className={styles.utilizationFill}
                          style={{ width: `${doctor.eft_utilization}%` }}
                        />
                      </div>
                      <span className={styles.utilizationText}>
                        {doctor.eft_utilization.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.shiftCount}>{doctor.total_shifts}</span>
                  </td>
                  <td>
                    <span 
                      className={styles.undesirableBadge}
                      style={{ 
                        backgroundColor: doctor.undesirable_shifts > 5 ? '#dc3545' : 
                                        doctor.undesirable_shifts > 2 ? '#ffc107' : '#28a745'
                      }}
                    >
                      {doctor.undesirable_shifts}
                    </span>
                  </td>
                  {selectedMetric === 'workload' && (
                    <>
                      <td>{doctor.clinical_shifts}</td>
                      <td>{doctor.admin_shifts}</td>
                    </>
                  )}
                  {selectedMetric === 'fairness' && (
                    <td>
                      <span 
                        className={styles.fairnessBadge}
                        style={{ backgroundColor: getFairnessColor(doctor.fairness_score) }}
                      >
                        {doctor.fairness_score.toFixed(1)}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className={styles.statusIndicator}>
                      {doctor.eft_utilization > 95 ? '⚠️ Over' : 
                       doctor.eft_utilization > 85 ? '✅ Good' :
                       doctor.eft_utilization > 70 ? '📊 Under' : '❌ Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className={styles.insights}>
        <h3 className={styles.sectionTitle}>💡 Key Insights</h3>
        <div className={styles.insightsList}>
          <div className={styles.insightCard}>
            <span className={styles.insightIcon}>⚠️</span>
            <div className={styles.insightContent}>
              <h4>High EFT Utilisation Alert</h4>
              <p>
{sortedDoctors.filter(d => d.eft_utilization > 95).length} doctors are over-utilized (&gt;95%). 
                Consider redistributing workload or increasing EFT allocations.
              </p>
            </div>
          </div>
          
          <div className={styles.insightCard}>
            <span className={styles.insightIcon}>📊</span>
            <div className={styles.insightContent}>
              <h4>Undesirable Shift Distribution</h4>
              <p>
Average of {((teamStats?.total_undesirable_shifts || 0) / (teamStats?.total_doctors || 1)).toFixed(1)} undesirable shifts per doctor. 
                Focus on balancing these assignments more evenly.
              </p>
            </div>
          </div>
          
          <div className={styles.insightCard}>
            <span className={styles.insightIcon}>🎯</span>
            <div className={styles.insightContent}>
              <h4>Optimization Opportunities</h4>
              <p>
                {sortedDoctors.filter(d => d.eft_utilization < 70).length} doctors are under-utilized. 
                Consider adjusting shift assignments to improve efficiency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorStatisticsReport;