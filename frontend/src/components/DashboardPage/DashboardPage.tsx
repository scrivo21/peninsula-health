import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';
import { User } from '../../types/auth';
import { RosterGeneratorModal } from '../SchedulePage/RosterGeneratorModal';
import styles from './DashboardPage.module.css';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);

  useEffect(() => {
    // Get user from localStorage (simple auth for demo)
    const userData = localStorage.getItem('shift_happens_user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        // Redirect to login if user data is invalid
        navigate('/login');
      }
    } else {
      // Redirect to login if no user is found
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    // Clear user data and redirect to login
    localStorage.removeItem('shift_happens_user');
    localStorage.removeItem('shift_happens_token');
    navigate('/login');
  };

  const handleRosterGenerated = (rosterData: any) => {
    // Close the modal first
    setIsGeneratorModalOpen(false);
    
    // Navigate to schedule page to show the generated roster
    navigate('/schedule');
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
    <div className={styles.dashboardContainer}>
      {/* Navigation Menu Bar */}
      <nav className={styles.navigationBar}>
        <div className={styles.navContent}>
          <div className={styles.navLogo}>
            <Logo size="small" showText={true} />
          </div>
          
          <div className={styles.navMenu}>
            <button className={`${styles.navItem} ${styles.navItemActive}`}>Dashboard</button>
            <button className={styles.navItem} onClick={() => navigate('/schedule')}>Schedules</button>
            <button className={styles.navItem} onClick={() => navigate('/doctors')}>Doctors</button>
            <button className={styles.navItem} onClick={() => navigate('/reports')}>Reports</button>
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

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        <div className={styles.welcomeSection}>
          {/* Large Centered Logo */}
          <div className={styles.logoContainer}>
            <img 
              src="/logo.png" 
              alt="Shift Happens Logo" 
              className={styles.welcomeLogo}
              onError={(e) => {
                console.warn('Logo failed to load on dashboard');
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          
          {/* Welcome Message */}
          <div className={styles.welcomeMessage}>
            <h1 className={styles.welcomeTitle}>
              Welcome to Shift Happens {user.fullName}!
            </h1>
            <p className={styles.welcomeSubtitle}>
              Your hospital roster management system is ready to use.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.quickActions}>
          <div className={styles.actionCard}>
            <h3>Generate New Roster</h3>
            <p>Create optimized schedules for your medical staff</p>
            <button 
              className={styles.actionButton}
              onClick={() => setIsGeneratorModalOpen(true)}
            >
              Get Started
            </button>
          </div>
          
          <div className={styles.actionCard}>
            <h3>View Current Schedule</h3>
            <p>Check today's shift assignments and coverage</p>
            <button className={styles.actionButton} onClick={() => navigate('/schedule')}>View Schedule</button>
          </div>
          
          <div className={styles.actionCard}>
            <h3>Manage Doctors</h3>
            <p>Update doctor preferences and availability</p>
            <button className={styles.actionButton} onClick={() => navigate('/doctors')}>Manage Staff</button>
          </div>
          
          <div className={styles.actionCard}>
            <h3>Manage Shifts</h3>
            <p>Configure clinical and non-clinical shift types and schedules</p>
            <button className={styles.actionButton} onClick={() => navigate('/shifts')}>Manage Shifts</button>
          </div>
          
          <div className={styles.actionCard}>
            <h3>Manage Config File</h3>
            <p>Edit system configuration: shifts, penalties, and quotes</p>
            <button className={styles.actionButton} onClick={() => navigate('/config')}>Edit Configuration</button>
          </div>
        </div>
      </main>

      {/* Roster Generator Modal */}
      {isGeneratorModalOpen && (
        <RosterGeneratorModal
          onClose={() => setIsGeneratorModalOpen(false)}
          onRosterGenerated={handleRosterGenerated}
        />
      )}
    </div>
  );
};

export default DashboardPage;