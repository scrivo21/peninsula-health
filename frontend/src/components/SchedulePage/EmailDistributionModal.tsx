import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Send, AlertTriangle, Mail, User } from 'lucide-react';
import { distributeRoster, testEmailConfiguration, getEmailStatus } from '../../services/rosterApi';
import '../../styles/components.css';
import styles from './EmailDistributionModal.module.css';

interface EmailDistributionModalProps {
  show: boolean;
  onHide: () => void;
  rosterData: any;
  jobId: string;
}

interface Doctor {
  name: string;
  email: string;
  shiftsCount: number;
  hasEmail: boolean;
}

interface DistributionResult {
  successful: Array<{ doctor: string; email: string }>;
  failed: Array<{ doctor: string; email: string; error: string }>;
  skipped: Array<{ doctor: string; reason: string }>;
}

const EmailDistributionModal: React.FC<EmailDistributionModalProps> = ({
  show,
  onHide,
  rosterData,
  jobId
}) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null);
  const [isDistributing, setIsDistributing] = useState(false);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSent, setTestSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (show) {
      checkEmailConfiguration();
      extractDoctorList();
      setDistributionResult(null);
      setTestSent(false);
      setError(null);
      setProgress(0);
    }
  }, [show, rosterData]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkEmailConfiguration = async () => {
    try {
      const response = await getEmailStatus();
      if (response.success && response.data) {
        setEmailConfigured(response.data.configured);
      } else {
        setEmailConfigured(false);
      }
    } catch (err) {
      console.error('Failed to check email configuration:', err);
      setEmailConfigured(false);
    }
  };

  const extractDoctorList = () => {
    try {
      // Parse doctor_view CSV to get list of doctors
      if (!rosterData?.outputs?.doctor_view) {
        setDoctors([]);
        return;
      }

      const lines = rosterData.outputs.doctor_view.split('\n');
      if (lines.length < 2) {
        setDoctors([]);
        return;
      }

      const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
      const doctorList: Doctor[] = [];

      // Skip the first column (Date) and extract doctor names
      for (let i = 1; i < headers.length; i++) {
        const doctorName = headers[i];
        if (!doctorName || doctorName === '') continue;

        // Count shifts for this doctor
        let shiftsCount = 0;
        for (let j = 1; j < lines.length; j++) {
          const row = lines[j].split(',');
          if (row[i] && row[i].trim() !== '' && row[i].trim() !== 'OFF' && row[i].trim() !== '"OFF"') {
            shiftsCount++;
          }
        }

        // Check if doctor has email in config (this is a simplified check)
        // In production, you'd fetch this from the backend
        const hasEmail = true; // Assume all doctors have emails for now

        doctorList.push({
          name: doctorName,
          email: `${doctorName.toLowerCase().replace(/\s+/g, '.')}@peninsulahealth.org.au`,
          shiftsCount,
          hasEmail
        });
      }

      setDoctors(doctorList);
    } catch (err) {
      console.error('Error extracting doctor list:', err);
      setDoctors([]);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    try {
      setError(null);
      const response = await testEmailConfiguration(testEmail);
      if (response.success) {
        setTestSent(true);
      } else {
        setError(response.error || 'Failed to send test email');
      }
    } catch (err) {
      setError('Failed to send test email');
    }
  };

  const handleDistribute = async () => {
    setIsDistributing(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await distributeRoster(jobId, {
        test_mode: testMode,
        test_email: testMode ? testEmail : undefined
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.success && response.data) {
        setDistributionResult(response.data.results);
      } else {
        setError(response.error || 'Failed to distribute roster');
      }
    } catch (err) {
      setError('Failed to distribute roster emails');
    } finally {
      setIsDistributing(false);
    }
  };

  const getDistributionSummary = () => {
    if (!distributionResult) return null;

    const total = distributionResult.successful.length + 
                  distributionResult.failed.length + 
                  distributionResult.skipped.length;

    return {
      total,
      successful: distributionResult.successful.length,
      failed: distributionResult.failed.length,
      skipped: distributionResult.skipped.length,
      successRate: total > 0 ? Math.round((distributionResult.successful.length / total) * 100) : 0
    };
  };

  const resetModal = () => {
    setDistributionResult(null);
    setTestSent(false);
    setError(null);
    setProgress(0);
    onHide();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      resetModal();
    }
  };

  if (!show) return null;

  return (
    <div className="modalOverlay" onClick={handleOverlayClick}>
      <div className="modalContent" style={{ maxWidth: '800px', width: '90%' }}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Mail className={styles.icon} size={24} />
            Email Roster Distribution
          </h2>
          <button className={styles.closeButton} onClick={resetModal}>
            <XCircle size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Email Configuration Status */}
          {emailConfigured === false && (
            <div className={styles.alertWarning}>
              <AlertTriangle className={styles.icon} size={20} />
              Email service is not configured. Please set up SMTP settings in the configuration.
            </div>
          )}

          {/* Distribution Results */}
          {distributionResult && (
            <div className={styles.resultSection}>
              <h3>Distribution Complete</h3>
              
              {(() => {
                const summary = getDistributionSummary();
                if (!summary) return null;

                return (
                  <>
                    <div className={styles.summaryGrid}>
                      <div className={styles.summaryItem}>
                        <div className={styles.summaryValue + ' ' + styles.success}>{summary.successful}</div>
                        <div className={styles.summaryLabel}>Sent</div>
                      </div>
                      <div className={styles.summaryItem}>
                        <div className={styles.summaryValue + ' ' + styles.error}>{summary.failed}</div>
                        <div className={styles.summaryLabel}>Failed</div>
                      </div>
                      <div className={styles.summaryItem}>
                        <div className={styles.summaryValue + ' ' + styles.warning}>{summary.skipped}</div>
                        <div className={styles.summaryLabel}>Skipped</div>
                      </div>
                      <div className={styles.summaryItem}>
                        <div className={styles.summaryValue + ' ' + styles.primary}>{summary.successRate}%</div>
                        <div className={styles.summaryLabel}>Success Rate</div>
                      </div>
                    </div>

                    {/* Detailed Results */}
                    {distributionResult.failed.length > 0 && (
                      <div className={styles.alertError}>
                        <h4>Failed Emails:</h4>
                        <ul>
                          {distributionResult.failed.map((item, idx) => (
                            <li key={idx}>
                              {item.doctor}: {item.error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {distributionResult.skipped.length > 0 && (
                      <div className={styles.alertWarning}>
                        <h4>Skipped:</h4>
                        <ul>
                          {distributionResult.skipped.map((item, idx) => (
                            <li key={idx}>
                              {item.doctor}: {item.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Main Content - Show when not yet distributed */}
          {!distributionResult && (
            <>
              {/* Roster Information */}
              <div className={styles.infoBox}>
                <h4>Roster Information</h4>
                <div className={styles.infoGrid}>
                  <div><strong>Period:</strong> {rosterData?.startDate} ({rosterData?.weeks} weeks)</div>
                  <div><strong>Job ID:</strong> {jobId}</div>
                  <div><strong>Status:</strong> <span className={styles.badge + ' ' + styles.badgeSuccess}>Finalized</span></div>
                </div>
              </div>

              {/* Doctor List */}
              <div className={styles.doctorSection}>
                <h4>Recipients ({doctors.filter(d => d.hasEmail).length} doctors)</h4>
                <div className={styles.doctorList}>
                  {doctors.map((doctor, idx) => (
                    <div key={idx} className={styles.doctorItem}>
                      <div className={styles.doctorInfo}>
                        <User size={16} className={styles.icon} />
                        <div>
                          <div className={styles.doctorName}>{doctor.name}</div>
                          <div className={styles.doctorEmail}>{doctor.email}</div>
                        </div>
                      </div>
                      <div className={styles.doctorStats}>
                        <span className={styles.badge}>{doctor.shiftsCount} shifts</span>
                        {!doctor.hasEmail && (
                          <span className={styles.badge + ' ' + styles.badgeWarning}>No email</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Mode Options */}
              <div className={styles.testSection}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={testMode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestMode(e.target.checked)}
                  />
                  <span>Test Mode (send to single email address)</span>
                </label>
                
                {testMode && (
                  <div className={styles.testControls}>
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestEmail(e.target.value)}
                    />
                    <button
                      className="btnSecondary btnSm"
                      onClick={handleTestEmail}
                      disabled={!testEmail || testSent}
                    >
                      {testSent ? <CheckCircle size={16} /> : 'Send Test'}
                    </button>
                    {testSent && (
                      <div className={styles.alertSuccess}>
                        Test email sent successfully!
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {isDistributing && (
                <div className={styles.progressSection}>
                  <div className={styles.progressHeader}>
                    <div className="loadingSpinner" />
                    <span>Sending emails...</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className={styles.alertError}>
                  <XCircle className={styles.icon} size={20} />
                  {error}
                </div>
              )}

              {/* Information Alert */}
              <div className={styles.alertInfo}>
                <strong>Note:</strong> Each doctor will receive a personalized email containing only their individual roster assignments. 
                The email includes both HTML format for viewing and a CSV attachment for importing into calendar applications.
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {distributionResult ? (
            <button className="btnPrimary" onClick={resetModal}>
              Close
            </button>
          ) : (
            <>
              <button className="btnSecondary" onClick={resetModal}>
                Cancel
              </button>
              <button
                className="btnPrimary"
                onClick={handleDistribute}
                disabled={isDistributing || emailConfigured === false || doctors.length === 0}
              >
                {isDistributing ? (
                  <>
                    <div className="loadingSpinner" style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                    Distributing...
                  </>
                ) : (
                  <>
                    <Send className={styles.icon} size={18} />
                    {testMode ? 'Send Test Distribution' : `Distribute to ${doctors.filter(d => d.hasEmail).length} Doctors`}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailDistributionModal;