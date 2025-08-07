import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';
import { User } from '../../types/auth';
import { JsonEditor } from './JsonEditor';
import styles from './SettingsPage.module.css';

interface ConfigData {
  shifts?: {
    clinical_shifts?: any[];
    non_clinical_shifts?: any[];
  };
  medical_quotes_and_facts?: {
    quotes?: string[];
  };
  shift_penalties?: {
    [key: string]: any;
  };
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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

  // Load config data
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/config');
        if (!response.ok) {
          throw new Error('Failed to load configuration');
        }
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load configuration');
        }
        
        setConfigData(result.data);
      } catch (error) {
        console.error('Failed to load config:', error);
        setError('Failed to load configuration. Please try refreshing the page.');
        
        // Mock data for development
        setConfigData({
          shifts: {
            clinical_shifts: [],
            non_clinical_shifts: []
          },
          medical_quotes_and_facts: {
            quotes: []
          },
          shift_penalties: {}
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadConfig();
    }
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('shift_happens_user');
    localStorage.removeItem('shift_happens_token');
    navigate('/login');
  };

  const toggleSection = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const handleSectionUpdate = (sectionKey: string, newData: any) => {
    setConfigData(prev => {
      if (!prev) return null;
      
      const updated = { ...prev };
      const keyParts = sectionKey.split('.');
      
      if (keyParts.length === 1) {
        updated[keyParts[0] as keyof ConfigData] = newData;
      } else if (keyParts.length === 2) {
        const [parent, child] = keyParts;
        if (parent === 'shifts') {
          updated.shifts = {
            ...updated.shifts,
            [child]: newData
          };
        } else if (parent === 'medical_quotes_and_facts') {
          updated.medical_quotes_and_facts = {
            ...updated.medical_quotes_and_facts,
            [child]: newData
          };
        }
      }
      
      return updated;
    });
  };

  const saveConfig = async () => {
    if (!configData) return;
    
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData)
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to save configuration');
      }
      
      setSuccessMessage('Configuration saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to save configuration: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetSection = async (sectionKey: string) => {
    if (!window.confirm(`Are you sure you want to reset the ${sectionKey.replace(/[._]/g, ' ')} section to default values?`)) {
      return;
    }
    
    try {
      setError(null);
      setSuccessMessage(null);
      
      // Get default values for this section
      const response = await fetch(`/api/config/defaults/${encodeURIComponent(sectionKey)}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to get default values');
      }
      
      // Update the section with default values
      handleSectionUpdate(sectionKey, result.data);
      
      setSuccessMessage(`${sectionKey.replace(/[._]/g, ' ')} section reset to defaults`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to reset section:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to reset section: ${errorMessage}`);
    }
  };

  if (!user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
    );
  }

  const settingSections = [
    {
      key: 'shifts.clinical_shifts',
      title: 'Clinical Shifts',
      description: 'Configure clinical shift types, times, and penalties',
      icon: '🏥',
      data: configData?.shifts?.clinical_shifts || []
    },
    {
      key: 'shifts.non_clinical_shifts',
      title: 'Non-Clinical Shifts',
      description: 'Configure administrative and non-clinical shift types',
      icon: '📋',
      data: configData?.shifts?.non_clinical_shifts || []
    },
    {
      key: 'shift_penalties',
      title: 'Shift Penalties',
      description: 'Configure penalty weights for different shift types',
      icon: '⚖️',
      data: configData?.shift_penalties || {}
    },
    {
      key: 'medical_quotes_and_facts.quotes',
      title: 'Medical Quotes & Facts',
      description: 'Manage the collection of medical quotes and facts',
      icon: '💭',
      data: configData?.medical_quotes_and_facts?.quotes || []
    }
  ];

  return (
    <div className={styles.settingsContainer}>
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
            <button className={styles.navItem} onClick={() => navigate('/reports')}>
              Reports
            </button>
            <button className={`${styles.navItem} ${styles.navItemActive}`}>
              Settings
            </button>
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
            <h1 className={styles.pageTitle}>System Settings</h1>
            <p className={styles.pageSubtitle}>
              Configure shifts, penalties, and system content
            </p>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.saveButton}
              onClick={saveConfig}
              disabled={isSaving}
            >
              {isSaving ? '💾 Saving...' : '💾 Save All Changes'}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className={styles.errorMessage}>
            <span className={styles.messageIcon}>⚠️</span>
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className={styles.successMessage}>
            <span className={styles.messageIcon}>✅</span>
            {successMessage}
          </div>
        )}

        {/* Settings Sections */}
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p>Loading configuration...</p>
          </div>
        ) : (
          <div className={styles.settingsContent}>
            <div className={styles.settingsSections}>
              {settingSections.map((section) => (
                <div key={section.key} className={styles.settingSection}>
                  <div 
                    className={styles.sectionHeader}
                    onClick={() => toggleSection(section.key)}
                  >
                    <div className={styles.sectionInfo}>
                      <span className={styles.sectionIcon}>{section.icon}</span>
                      <div className={styles.sectionTitleArea}>
                        <h3 className={styles.sectionTitle}>{section.title}</h3>
                        <p className={styles.sectionDescription}>{section.description}</p>
                      </div>
                    </div>
                    <div className={styles.sectionControls}>
                      <button
                        className={styles.resetButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          resetSection(section.key);
                        }}
                        title="Reset to defaults"
                      >
                        🔄
                      </button>
                      <span className={styles.expandIcon}>
                        {expandedSections.has(section.key) ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>
                  
                  {expandedSections.has(section.key) && (
                    <div className={styles.sectionContent}>
                      <JsonEditor
                        data={section.data}
                        onChange={(newData) => handleSectionUpdate(section.key, newData)}
                        sectionType={section.key}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsPage;