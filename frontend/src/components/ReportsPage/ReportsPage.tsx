import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';
import { User } from '../../types/auth';
import { VacantShiftsReport } from './VacantShiftsReport';
import { DoctorStatisticsReport } from './DoctorStatisticsReport';
import { UndesirableShiftsReport } from './UndesirableShiftsReport';
import { TodayRosterReport } from './TodayRosterReport';
import styles from './ReportsPage.module.css';

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeReport, setActiveReport] = useState<'today' | 'vacant' | 'statistics' | 'undesirable'>('today');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleLogout = () => {
    localStorage.removeItem('shift_happens_user');
    localStorage.removeItem('shift_happens_token');
    navigate('/login');
  };

  if (!user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
    );
  }

  const reportTabs = [
    {
      id: 'today' as const,
      title: 'Today\'s Roster',
      description: 'Who is working today at each location',
      icon: '📅'
    },
    {
      id: 'vacant' as const,
      title: 'Vacant Shifts',
      description: 'Identify unfilled shifts in the schedule',
      icon: '🕳️'
    },
    {
      id: 'statistics' as const,
      title: 'Doctor Statistics',
      description: 'Individual and team performance metrics',
      icon: '📊'
    },
    {
      id: 'undesirable' as const,
      title: 'Undesirable Shifts',
      description: 'Analysis of challenging shift assignments',
      icon: '⚠️'
    }
  ];

  return (
    <div className={styles.reportsContainer}>
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
            <button className={`${styles.navItem} ${styles.navItemActive}`}>
              Reports
            </button>
            <button className={styles.navItem} onClick={() => navigate('/shifts')}>Shifts</button>
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
            <h1 className={styles.pageTitle}>Reports & Analytics</h1>
            <p className={styles.pageSubtitle}>
              Comprehensive insights into roster performance and scheduling metrics
            </p>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.refreshButton} 
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => {
                  setIsLoading(false);
                  window.location.reload();
                }, 500);
              }}
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Report Tabs */}
        <div className={styles.reportTabs}>
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.reportTab} ${activeReport === tab.id ? styles.reportTabActive : ''}`}
              onClick={() => setActiveReport(tab.id)}
            >
              <div className={styles.tabIcon}>{tab.icon}</div>
              <div className={styles.tabContent}>
                <h3 className={styles.tabTitle}>{tab.title}</h3>
                <p className={styles.tabDescription}>{tab.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Report Content */}
        <div className={styles.reportContent}>
          {isLoading && (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p>Loading report data...</p>
            </div>
          )}

          {!isLoading && (
            <>
              {activeReport === 'today' && <TodayRosterReport />}
              {activeReport === 'vacant' && <VacantShiftsReport />}
              {activeReport === 'statistics' && <DoctorStatisticsReport />}
              {activeReport === 'undesirable' && <UndesirableShiftsReport />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;