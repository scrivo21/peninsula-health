import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ConfigPage.module.css';
import { configApiService, ConfigData, ShiftConfig, ShiftPenalties } from '../../services/configApi';
import { getAllDoctors } from '../../services/doctorApi';
import { DoctorProfile } from '../../types/doctor';
import { User } from '../../types/auth';
import { Logo } from '../Logo';

interface TabConfig {
  id: string;
  title: string;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'general',
    title: 'General',
    description: 'General system settings and global configuration options'
  },
  {
    id: 'shifts',
    title: 'Shifts',
    description: 'Configure clinical and non-clinical shift types, times, and properties'
  },
  {
    id: 'penalties',
    title: 'Penalties',
    description: 'Adjust penalty weights for different shift types and roles'
  },
  {
    id: 'quotes',
    title: 'Quotes',
    description: 'Manage the collection of medical quotes and facts displayed in the footer'
  },
  {
    id: 'email',
    title: 'Email Server',
    description: 'Configure SMTP settings for email distribution of rosters'
  }
];

const ConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  
  // Editor states for each section
  const [generalJson, setGeneralJson] = useState('');
  const [shiftsJson, setShiftsJson] = useState('');
  const [penaltiesJson, setPenaltiesJson] = useState('');
  const [quotesJson, setQuotesJson] = useState('');
  const [emailJson, setEmailJson] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);
  
  // Test email states
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('shift_happens_user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        loadData();
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

  const loadData = async () => {
    setLoading(true);
    setStatus(null);
    
    try {
      // Load config data
      const configResponse = await configApiService.getConfig();
      if (!configResponse.success) {
        throw new Error(configResponse.error || 'Failed to load config');
      }
      
      // Load doctors data
      const doctorsResponse = await getAllDoctors();
      if (!doctorsResponse.success) {
        throw new Error(doctorsResponse.error || 'Failed to load doctors');
      }

      setConfigData(configResponse.data!);
      setDoctors(doctorsResponse.data || []);
      
      // Set JSON editor content
      updateEditorContent(configResponse.data!, doctorsResponse.data || []);
      
      setStatus({ type: 'success', message: 'Configuration loaded successfully' });
    } catch (error) {
      console.error('Error loading data:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to load configuration' 
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEditorContent = (config: ConfigData, doctorsList: DoctorProfile[]) => {
    // General configuration (system-wide settings)
    const generalConfig = {
      system_name: 'Peninsula Health Hospital Scheduling System',
      max_shifts_per_doctor_per_week: 7,
      min_time_between_shifts_hours: 10,
      enable_overtime_warnings: true,
      enable_preference_scoring: true,
      auto_assign_unfilled_shifts: false,
      notification_settings: {
        email_enabled: true,
        roster_publish_notifications: true,
        shift_change_notifications: true
      }
    };
    
    setGeneralJson(JSON.stringify(generalConfig, null, 2));
    setShiftsJson(JSON.stringify(config.shifts || {}, null, 2));
    setPenaltiesJson(JSON.stringify(config.shift_penalties || {}, null, 2));
    setQuotesJson(JSON.stringify(config.medical_quotes_and_facts?.quotes || [], null, 2));
    
    // Email settings with default values if not present
    const emailSettings = config.email_settings || {
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
      smtp_secure: false,
      smtp_user: 'your-email@gmail.com',
      smtp_pass: 'your-app-password',
      from_name: 'Peninsula Health Scheduling',
      from_email: ''
    };
    setEmailJson(JSON.stringify(emailSettings, null, 2));
    
    setHasUnsavedChanges(false);
  };

  const handleSave = async () => {
    if (showConfirmDialog) {
      setShowConfirmDialog(false);
      return;
    }

    setSaving(true);
    setStatus(null);
    
    try {
      const updatedConfig: ConfigData = {};
      
      // Parse and validate JSON for active tab
      if (activeTab === 'general') {
        try {
          const general = JSON.parse(generalJson);
          // General settings would be stored in a general section
          // For now, we'll skip saving general settings as they don't exist in the API
          setStatus({ 
            type: 'info', 
            message: 'General settings are read-only in this version. Use specific tabs to modify configuration.' 
          });
          setSaving(false);
          return;
        } catch (error) {
          throw new Error('Invalid JSON in General section');
        }
      } else if (activeTab === 'shifts') {
        try {
          const shifts = JSON.parse(shiftsJson);
          updatedConfig.shifts = shifts;
        } catch (error) {
          throw new Error('Invalid JSON in Shifts section');
        }
      } else if (activeTab === 'penalties') {
        try {
          const penalties = JSON.parse(penaltiesJson);
          updatedConfig.shift_penalties = penalties;
        } catch (error) {
          throw new Error('Invalid JSON in Penalties section');
        }
      } else if (activeTab === 'quotes') {
        try {
          const quotes = JSON.parse(quotesJson);
          updatedConfig.medical_quotes_and_facts = { quotes };
        } catch (error) {
          throw new Error('Invalid JSON in Quotes section');
        }
      } else if (activeTab === 'email') {
        try {
          const emailSettings = JSON.parse(emailJson);
          updatedConfig.email_settings = emailSettings;
        } catch (error) {
          throw new Error('Invalid JSON in Email Server section');
        }
      }

      const response = await configApiService.updateConfig(updatedConfig);
      if (!response.success) {
        throw new Error(response.error || 'Failed to save configuration');
      }

      setStatus({ type: 'success', message: 'Configuration saved successfully' });
      setHasUnsavedChanges(false);
      
      // Reload data to reflect changes
      await loadData();
      
    } catch (error) {
      console.error('Error saving config:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save configuration' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    setStatus(null);
    
    try {
      const response = await configApiService.reloadConfig();
      if (!response.success) {
        throw new Error(response.error || 'Failed to reload configuration');
      }
      
      setStatus({ type: 'success', message: 'Configuration cache reloaded successfully' });
      
      // Reload data to reflect changes
      await loadData();
      
    } catch (error) {
      console.error('Error reloading config:', error);
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to reload configuration' 
      });
    } finally {
      setReloading(false);
    }
  };

  const formatJson = (jsonString: string, setter: (value: string) => void) => {
    try {
      const parsed = JSON.parse(jsonString);
      setter(JSON.stringify(parsed, null, 2));
      setStatus({ type: 'success', message: 'JSON formatted successfully' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Invalid JSON format' });
    }
  };

  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges) {
      setPendingTabChange(newTab);
      setShowConfirmDialog(true);
    } else {
      setActiveTab(newTab);
    }
  };

  const confirmTabChange = () => {
    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
      setHasUnsavedChanges(false);
    }
    setShowConfirmDialog(false);
  };

  const cancelTabChange = () => {
    setPendingTabChange(null);
    setShowConfirmDialog(false);
  };

  const handleJsonChange = (value: string, setter: (value: string) => void) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  const renderEditor = (title: string, content: string, setter: (value: string) => void, helpText: string, readOnly: boolean = false) => (
    <div className={styles.editorContainer}>
      <div className={styles.editorHeader}>
        <h4 className={styles.editorTitle}>{title}</h4>
        <div className={styles.buttonGroup}>
          <button 
            className={styles.editorButton}
            onClick={() => formatJson(content, setter)}
            disabled={readOnly}
          >
            Format JSON
          </button>
          {readOnly && <span className={styles.readOnlyBadge}>Read Only</span>}
        </div>
      </div>
      <textarea
        className={`${styles.textArea} ${readOnly ? styles.readOnly : ''}`}
        value={content}
        onChange={(e) => handleJsonChange(e.target.value, setter)}
        placeholder={`Enter ${title.toLowerCase()} configuration as JSON...`}
        readOnly={readOnly}
      />
      <div className={styles.helpText}>
        <p>{helpText}</p>
      </div>
    </div>
  );

  const renderGeneralTab = () => (
    <div className={styles.section}>
      <div className={styles.infoCard}>
        <h4>System Configuration</h4>
        <p>
          General system settings control global behavior of the scheduling system. 
          These settings affect how rosters are generated, notifications are sent, and 
          system-wide constraints are applied.
        </p>
      </div>
      
      {renderEditor('General Configuration', generalJson, setGeneralJson, 
        'System-wide settings including constraints, notifications, and global preferences', true)}
    </div>
  );

  const renderShiftsTab = () => (
    <div className={styles.section}>
      <div className={styles.infoCard}>
        <h4>Shift Type Configuration</h4>
        <p>
          Configure clinical and non-clinical shifts including location, timing, duration, 
          and special properties. Each shift must include location, type, time, start_time, 
          end_time, duration_hours, weighting, and description fields.
        </p>
        <ul className={styles.helpList}>
          <li><strong>Clinical Shifts:</strong> Patient-facing roles with specific requirements</li>
          <li><strong>Non-Clinical Shifts:</strong> Administrative and support functions</li>
          <li><strong>Weighting:</strong> Priority factor for shift assignment (higher = more important)</li>
          <li><strong>Duration:</strong> Must be in hours (e.g., 8.0 for 8-hour shift)</li>
        </ul>
      </div>
      
      {renderEditor('Shifts Configuration', shiftsJson, setShiftsJson, 
        'Define all available shift types with their properties, timing, and constraints')}
    </div>
  );

  const renderPenaltiesTab = () => (
    <div className={styles.section}>
      <div className={styles.infoCard}>
        <h4>Shift Penalty Weights</h4>
        <p>
          Adjust penalty weights for different shift types and conditions. Higher values make 
          assignments more undesirable in the optimization algorithm. These penalties help 
          balance workload distribution and respect doctor preferences.
        </p>
        <ul className={styles.helpList}>
          <li><strong>Base Penalties:</strong> Standard penalty for undesirable shifts</li>
          <li><strong>Role Penalties:</strong> Additional penalties for specific roles or colors</li>
          <li><strong>Time Penalties:</strong> Penalties for specific days or times (e.g., Friday PM)</li>
          <li><strong>Location Penalties:</strong> Site-specific adjustments (e.g., Rosebud)</li>
        </ul>
      </div>
      
      {renderEditor('Penalty Configuration', penaltiesJson, setPenaltiesJson, 
        'Define penalty weights that influence the roster optimization algorithm')}
    </div>
  );

  const renderQuotesTab = () => (
    <div className={styles.section}>
      <div className={styles.infoCard}>
        <h4>Medical Quotes & Facts</h4>
        <p>
          Manage the collection of medical quotes, facts, and inspirational messages 
          that are randomly displayed in the application footer. These help create a 
          positive and educational atmosphere for healthcare professionals.
        </p>
        <ul className={styles.helpList}>
          <li><strong>Medical Facts:</strong> Educational information about healthcare</li>
          <li><strong>Inspirational Quotes:</strong> Motivational messages for staff</li>
          <li><strong>Health Tips:</strong> Wellness advice for medical professionals</li>
          <li><strong>Format:</strong> Each quote should be a complete, meaningful string</li>
        </ul>
      </div>
      
      {renderEditor('Medical Quotes Configuration', quotesJson, setQuotesJson, 
        'Array of medical quotes, facts, and inspirational healthcare messages to display throughout the application')}
    </div>
  );

  const handleTestEmail = async () => {
    if (!testEmail) {
      setStatus({ type: 'error', message: 'Please enter a test email address' });
      return;
    }
    
    setTestingEmail(true);
    try {
      // First save the current email config
      const emailSettings = JSON.parse(emailJson);
      const updatedConfig: ConfigData = { email_settings: emailSettings };
      
      const saveResponse = await configApiService.updateConfig(updatedConfig);
      if (!saveResponse.success) {
        throw new Error(saveResponse.error || 'Failed to save email configuration');
      }
      
      // Then test the email
      const { testEmailConfiguration } = await import('../../services/rosterApi');
      const testResponse = await testEmailConfiguration(testEmail);
      
      if (testResponse.success) {
        setStatus({ type: 'success', message: `Test email sent successfully to ${testEmail}` });
      } else {
        throw new Error(testResponse.error || 'Failed to send test email');
      }
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to send test email' 
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const renderEmailTab = () => {
    return (
      <div className={styles.section}>
        <div className={styles.infoCard}>
          <h4>Email Server Configuration</h4>
          <p>
            Configure SMTP settings for sending roster distribution emails to doctors. 
            The system will send individualized rosters to each doctor's email address 
            when rosters are finalized and distributed.
          </p>
          <ul className={styles.helpList}>
            <li><strong>smtp_host:</strong> SMTP server hostname (e.g., smtp.gmail.com)</li>
            <li><strong>smtp_port:</strong> Server port (typically 587 for TLS, 465 for SSL)</li>
            <li><strong>smtp_secure:</strong> Use SSL/TLS (true for port 465, false for 587)</li>
            <li><strong>smtp_user:</strong> Authentication username/email</li>
            <li><strong>smtp_pass:</strong> Authentication password or app-specific password</li>
            <li><strong>from_name:</strong> Display name for sent emails</li>
            <li><strong>from_email:</strong> From address (optional, uses smtp_user if not set)</li>
          </ul>
          <div className={styles.warningBox}>
            <strong>⚠️ Security Note:</strong> For Gmail, use an app-specific password instead of your regular password. 
            Enable 2-factor authentication and generate an app password from your Google Account settings.
          </div>
          
          <div className={styles.testEmailSection}>
            <h5>Test Email Configuration</h5>
            <div className={styles.testEmailControls}>
              <input
                type="email"
                className={styles.testEmailInput}
                placeholder="Enter test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <button
                className={styles.testEmailButton}
                onClick={handleTestEmail}
                disabled={testingEmail || !testEmail || !emailJson}
              >
                {testingEmail ? 'Sending...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </div>
        
        {renderEditor('Email Server Settings', emailJson, setEmailJson, 
          'SMTP configuration for roster email distribution. Ensure credentials are kept secure.')}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'shifts':
        return renderShiftsTab();
      case 'penalties':
        return renderPenaltiesTab();
      case 'quotes':
        return renderQuotesTab();
      case 'email':
        return renderEmailTab();
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={styles.configPage}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          Loading configuration...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.configPage}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.configPage}>
      {/* Navigation Bar */}
      <nav className={styles.navBar}>
        <div className={styles.navContainer}>
          <div className={styles.navBrand}>
            <Logo />
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
            <button className={styles.navItem} onClick={() => navigate('/shifts')}>
              Shifts
            </button>
            <button className={`${styles.navItem} ${styles.navItemActive}`}>
              Config
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

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.icon}>⚙️</span>
          <div>
            <h1 className={styles.title}>System Configuration</h1>
            <p className={styles.subtitle}>
              Manage system settings, shift definitions, penalties, and medical quotes
            </p>
          </div>
        </div>
      </header>

      {status && (
        <div className={`${styles.statusIndicator} ${styles[status.type]}`}>
          <span>
            {status.type === 'success' && '✅'}
            {status.type === 'error' && '❌'}
            {status.type === 'warning' && '⚠️'}
            {status.type === 'info' && 'ℹ️'}
          </span>
          {status.message}
        </div>
      )}

      <div className={styles.tabContainer}>
        <div className={styles.tabHeader}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''} ${hasUnsavedChanges && activeTab !== tab.id ? styles.disabled : ''}`}
              onClick={() => handleTabChange(tab.id)}
              disabled={hasUnsavedChanges && activeTab !== tab.id}
            >
              {tab.title}
              {hasUnsavedChanges && activeTab === tab.id && <span className={styles.unsavedIndicator}>•</span>}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              {TABS.find(tab => tab.id === activeTab)?.title}
            </h2>
          </div>
          <p className={styles.sectionDescription}>
            {TABS.find(tab => tab.id === activeTab)?.description}
          </p>

          {renderTabContent()}

          <div className={styles.actionButtons}>
            <button 
              className={`${styles.actionButton} ${styles.reload}`}
              onClick={handleReload}
              disabled={reloading}
            >
              {reloading ? (
                <>
                  <div className={styles.spinner}></div>
                  Reloading...
                </>
              ) : (
                <>
                  🔄 Reload Cache
                </>
              )}
            </button>
            
            {activeTab !== 'general' && (
              <button 
                className={`${styles.actionButton} ${styles.save} ${hasUnsavedChanges ? styles.highlight : ''}`}
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
              >
                {saving ? (
                  <>
                    <div className={styles.spinner}></div>
                    Saving...
                  </>
                ) : (
                  <>
                    💾 Save Changes
                    {hasUnsavedChanges && <span className={styles.changesBadge}>!</span>}
                  </>
                )}
              </button>
            )}
            
            {hasUnsavedChanges && (
              <button 
                className={`${styles.actionButton} ${styles.cancel}`}
                onClick={() => loadData()}
                disabled={saving}
              >
                🔄 Reset Changes
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmDialog}>
            <h3 className={styles.dialogTitle}>Unsaved Changes</h3>
            <p className={styles.dialogMessage}>
              You have unsaved changes in the current tab. Do you want to discard these changes and switch tabs?
            </p>
            <div className={styles.dialogActions}>
              <button 
                className={`${styles.dialogButton} ${styles.secondary}`}
                onClick={cancelTabChange}
              >
                Cancel
              </button>
              <button 
                className={`${styles.dialogButton} ${styles.primary}`}
                onClick={confirmTabChange}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigPage;