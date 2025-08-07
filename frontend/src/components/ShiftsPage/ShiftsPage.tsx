import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';
import { User } from '../../types/auth';
import styles from './ShiftsPage.module.css';

interface ShiftType {
  id: string;
  name: string;
  location: string;
  type: 'clinical' | 'non_clinical';
  duration_hours: number;
  penalty_points: number;
  is_leadership: boolean;
  description: string;
  requirements: string[];
}

interface ShiftConfig {
  clinical_shifts: string[];
  non_clinical_shifts: string[];
}

export const ShiftsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'clinical' | 'non_clinical' | 'penalties'>('overview');
  
  // Check authentication
  useEffect(() => {
    const userData = localStorage.getItem('shift_happens_user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Load shift configuration
  useEffect(() => {
    if (user) {
      loadShiftConfiguration();
    }
  }, [user]);

  const loadShiftConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/roster/shift-types');
      const result = await response.json();
      
      if (result.success) {
        setShiftConfig(result.data);
      } else {
        console.error('Failed to load shift configuration:', result.error);
      }
    } catch (error) {
      console.error('Error loading shift configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('shift_happens_user');
    localStorage.removeItem('shift_happens_token');
    navigate('/login');
  };

  const parseShiftDetails = (shiftName: string): ShiftType => {
    const parts = shiftName.split(' ');
    const location = parts[0] || '';
    const role = parts[1] || '';
    const timeType = parts[2] || '';
    
    const isLeadership = role === 'Blue' || role === 'Green';
    const isRosebud = location === 'Rosebud';
    const isPM = timeType === 'PM';
    
    // Calculate penalty points based on shift characteristics
    let penaltyPoints = 0;
    if (isLeadership) penaltyPoints += 3; // Leadership roles are harder
    if (isRosebud) penaltyPoints += 1; // Rosebud is further away
    if (isPM) penaltyPoints += 1; // PM shifts are less desirable
    
    return {
      id: shiftName.replace(/\s+/g, '_').toLowerCase(),
      name: shiftName,
      location: location,
      type: shiftName.includes('Admin') ? 'non_clinical' : 'clinical',
      duration_hours: shiftName.includes('Admin') ? 8 : 10,
      penalty_points: penaltyPoints,
      is_leadership: isLeadership,
      description: `${location} ${role} ${timeType} shift`,
      requirements: isLeadership ? ['Leadership experience', 'Senior level'] : ['Active medical license']
    };
  };

  const getClinicalShifts = (): ShiftType[] => {
    return (shiftConfig?.clinical_shifts || []).map(parseShiftDetails);
  };

  const getNonClinicalShifts = (): ShiftType[] => {
    return (shiftConfig?.non_clinical_shifts || []).map(parseShiftDetails);
  };

  const getAllShifts = (): ShiftType[] => {
    return [...getClinicalShifts(), ...getNonClinicalShifts()];
  };

  const getShiftTypeColor = (type: 'clinical' | 'non_clinical') => {
    return type === 'clinical' ? '#2196F3' : '#FF9800';
  };

  const getLocationColor = (location: string) => {
    return location === 'Frankston' ? '#4CAF50' : '#9C27B0';
  };

  const renderShiftCard = (shift: ShiftType) => (
    <div key={shift.id} className={styles.shiftCard}>
      <div className={styles.shiftHeader}>
        <div className={styles.shiftName}>{shift.name}</div>
        <div className={styles.shiftBadges}>
          <span 
            className={styles.typeBadge}
            style={{ backgroundColor: getShiftTypeColor(shift.type) }}
          >
            {shift.type.replace('_', ' ').toUpperCase()}
          </span>
          <span 
            className={styles.locationBadge}
            style={{ backgroundColor: getLocationColor(shift.location) }}
          >
            {shift.location}
          </span>
          {shift.is_leadership && (
            <span className={styles.leadershipBadge}>👑 Leadership</span>
          )}
        </div>
      </div>
      
      <div className={styles.shiftDetails}>
        <div className={styles.detailRow}>
          <span className={styles.label}>Duration:</span>
          <span className={styles.value}>{shift.duration_hours} hours</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.label}>Penalty Points:</span>
          <span className={`${styles.value} ${shift.penalty_points > 2 ? styles.highPenalty : styles.lowPenalty}`}>
            {shift.penalty_points}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.label}>Description:</span>
          <span className={styles.value}>{shift.description}</span>
        </div>
      </div>
      
      {shift.requirements.length > 0 && (
        <div className={styles.requirements}>
          <span className={styles.requirementsLabel}>Requirements:</span>
          <ul className={styles.requirementsList}>
            {shift.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderOverview = () => {
    const allShifts = getAllShifts();
    const clinicalShifts = getClinicalShifts();
    const nonClinicalShifts = getNonClinicalShifts();
    const leadershipShifts = allShifts.filter(s => s.is_leadership);
    const highPenaltyShifts = allShifts.filter(s => s.penalty_points > 2);
    
    return (
      <div className={styles.overviewContainer}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{allShifts.length}</div>
            <div className={styles.statLabel}>Total Shifts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{clinicalShifts.length}</div>
            <div className={styles.statLabel}>Clinical Shifts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{nonClinicalShifts.length}</div>
            <div className={styles.statLabel}>Non-Clinical Shifts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{leadershipShifts.length}</div>
            <div className={styles.statLabel}>Leadership Shifts</div>
          </div>
        </div>
        
        <div className={styles.analysisSection}>
          <h3>Shift Analysis</h3>
          <div className={styles.analysisGrid}>
            <div className={styles.analysisCard}>
              <h4>🏥 Hospital Distribution</h4>
              <div className={styles.distributionList}>
                <div className={styles.distributionItem}>
                  <span>Frankston:</span>
                  <span>{allShifts.filter(s => s.location === 'Frankston').length} shifts</span>
                </div>
                <div className={styles.distributionItem}>
                  <span>Rosebud:</span>
                  <span>{allShifts.filter(s => s.location === 'Rosebud').length} shifts</span>
                </div>
              </div>
            </div>
            
            <div className={styles.analysisCard}>
              <h4>⚠️ High-Penalty Shifts</h4>
              <div className={styles.highPenaltyList}>
                {highPenaltyShifts.slice(0, 3).map(shift => (
                  <div key={shift.id} className={styles.penaltyItem}>
                    <span>{shift.name}</span>
                    <span className={styles.penaltyPoints}>{shift.penalty_points} pts</span>
                  </div>
                ))}
                {highPenaltyShifts.length > 3 && (
                  <div className={styles.moreItems}>
                    +{highPenaltyShifts.length - 3} more
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.analysisCard}>
              <h4>👑 Leadership Positions</h4>
              <div className={styles.leadershipList}>
                {leadershipShifts.map(shift => (
                  <div key={shift.id} className={styles.leadershipItem}>
                    <span>{shift.name}</span>
                    <span className={styles.locationTag}>{shift.location}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.shiftsContainer}>
      {/* Navigation Bar */}
      <nav className={styles.navigationBar}>
        <div className={styles.navContent}>
          <div className={styles.navLogo}>
            <Logo size="small" showText={true} />
          </div>
          
          <div className={styles.navMenu}>
            <button className={styles.navItem} onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
            <button className={styles.navItem} onClick={() => navigate('/schedule')}>
              Schedules
            </button>
            <button className={styles.navItem} onClick={() => navigate('/doctors')}>
              Doctors
            </button>
            <button className={styles.navItem} onClick={() => navigate('/reports')}>Reports</button>
            <button className={`${styles.navItem} ${styles.navItemActive}`}>
              Shifts
            </button>
            <button className={styles.navItem} onClick={() => navigate('/config')}>Config</button>
          </div>
          
          <div className={styles.navActions}>
            <span className={styles.userGreeting}>
              Hi, {user.fullName.split(' ')[0]}!
            </span>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Shift Management</h1>
            <p className={styles.pageSubtitle}>
              Manage shift types, configurations, and scheduling parameters
            </p>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.refreshButton}
              onClick={loadShiftConfiguration}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'clinical', label: 'Clinical Shifts', icon: '🏥' },
              { id: 'non_clinical', label: 'Non-Clinical Shifts', icon: '📋' },
              { id: 'penalties', label: 'Penalty System', icon: '⚖️' }
            ].map(tab => (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <span className={styles.tabIcon}>{tab.icon}</span>
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p>Loading shift configuration...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              
              {activeTab === 'clinical' && (
                <div className={styles.shiftsGrid}>
                  <div className={styles.sectionHeader}>
                    <h2>Clinical Shifts</h2>
                    <p>Patient-facing roles requiring medical expertise</p>
                  </div>
                  <div className={styles.cardsGrid}>
                    {getClinicalShifts().map(renderShiftCard)}
                  </div>
                </div>
              )}
              
              {activeTab === 'non_clinical' && (
                <div className={styles.shiftsGrid}>
                  <div className={styles.sectionHeader}>
                    <h2>Non-Clinical Shifts</h2>
                    <p>Administrative and support roles</p>
                  </div>
                  <div className={styles.cardsGrid}>
                    {getNonClinicalShifts().map(renderShiftCard)}
                  </div>
                </div>
              )}
              
              {activeTab === 'penalties' && (
                <div className={styles.penaltiesSection}>
                  <div className={styles.sectionHeader}>
                    <h2>Penalty Point System</h2>
                    <p>How the scheduling algorithm assigns fairness scores to shifts</p>
                  </div>
                  
                  <div className={styles.penaltyExplanation}>
                    <div className={styles.penaltyCard}>
                      <h3>🎯 How Penalty Points Work</h3>
                      <p>The scheduling algorithm uses penalty points to ensure fair distribution of challenging shifts among doctors. Higher penalty points indicate more demanding or less desirable shifts.</p>
                      
                      <div className={styles.penaltyRules}>
                        <div className={styles.rule}>
                          <span className={styles.ruleIcon}>👑</span>
                          <div className={styles.ruleContent}>
                            <strong>Leadership Roles (+3 points)</strong>
                            <p>Blue and Green shifts require additional responsibility and experience</p>
                          </div>
                        </div>
                        
                        <div className={styles.rule}>
                          <span className={styles.ruleIcon}>🚗</span>
                          <div className={styles.ruleContent}>
                            <strong>Rosebud Location (+1 point)</strong>
                            <p>Further travel distance from Melbourne</p>
                          </div>
                        </div>
                        
                        <div className={styles.rule}>
                          <span className={styles.ruleIcon}>🌙</span>
                          <div className={styles.ruleContent}>
                            <strong>PM Shifts (+1 point)</strong>
                            <p>Evening shifts are generally less preferred</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className={styles.penaltyDistribution}>
                      <h3>📊 Current Penalty Distribution</h3>
                      <div className={styles.distributionChart}>
                        {[0, 1, 2, 3, 4, 5].map(penaltyLevel => {
                          const shiftsAtLevel = getAllShifts().filter(s => s.penalty_points === penaltyLevel);
                          const percentage = getAllShifts().length > 0 ? (shiftsAtLevel.length / getAllShifts().length) * 100 : 0;
                          
                          return (
                            <div key={penaltyLevel} className={styles.distributionBar}>
                              <div className={styles.barLabel}>
                                {penaltyLevel} points ({shiftsAtLevel.length} shifts)
                              </div>
                              <div className={styles.barContainer}>
                                <div 
                                  className={styles.barFill}
                                  style={{ 
                                    width: `${percentage}%`,
                                    backgroundColor: penaltyLevel > 2 ? '#f44336' : penaltyLevel > 0 ? '#ff9800' : '#4caf50'
                                  }}
                                />
                              </div>
                              <div className={styles.barPercentage}>
                                {Math.round(percentage)}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ShiftsPage;