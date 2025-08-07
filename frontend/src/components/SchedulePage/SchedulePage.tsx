import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../Logo';
import { User } from '../../types/auth';
import {
  RosterGenerationRequest,
  BackendRosterRequest,
  RosterStatusResponse,
  ScheduleData,
  ShiftModification,
  ExportFormat
} from '../../types/schedule';
import {
  generateRoster,
  getRosterStatus,
  addShiftsToRoster,
  removeShiftsFromRoster,
  reassignShift,
  exportRosterCSV,
  exportRosterPDF,
  downloadFile,
  cancelRosterGeneration,
  pollRosterStatus,
  finalizeRoster,
  unfinalizeRoster,
  getDistributionStatus
} from '../../services/rosterApi';
import { getAllDoctors } from '../../services/doctorApi';
import { DoctorProfile } from '../../types/doctor';
import { RosterModal } from './RosterModal';
import { RosterHistoryList } from './RosterHistoryList';
import { RosterGenerationModal } from './RosterGenerationModal';
import EmailDistributionModal from './EmailDistributionModal';
import { 
  saveRoster, 
  getRosters, 
  deleteRoster, 
  toggleArchiveRoster,
  recalculateAllRosterStats,
  SavedRoster 
} from '../../services/rosterStorageApi';
import styles from './SchedulePage.module.css';

interface RosterJobState {
  jobId: string | null;
  status: RosterStatusResponse | null;
  isGenerating: boolean;
  error: string | null;
}

export const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Roster history state
  const [savedRosters, setSavedRosters] = useState<SavedRoster[]>([]);
  const [selectedHistoryRoster, setSelectedHistoryRoster] = useState<SavedRoster | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  
  // Roster generation state
  const [rosterJob, setRosterJob] = useState<RosterJobState>({
    jobId: null,
    status: null,
    isGenerating: false,
    error: null
  });
  
  // No longer need form state - moved to modal
  
  // Export state
  const [isExporting, setIsExporting] = useState<Record<string, boolean>>({});
  
  // Shift modifications state
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [modificationMode, setModificationMode] = useState<'none' | 'add' | 'remove'>('none');
  const [isReassigning, setIsReassigning] = useState(false);
  
  // Modal states
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  
  // Finalization state
  const [isFinalized, setIsFinalized] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [distributionStatus, setDistributionStatus] = useState<any>(null);

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

  // Check finalization status when roster is selected
  useEffect(() => {
    const checkFinalizationStatus = async () => {
      const jobId = rosterJob.jobId || selectedHistoryRoster?.id;
      if (jobId) {
        try {
          const response = await getDistributionStatus(jobId);
          if (response.success && response.data) {
            setIsFinalized(response.data.finalized || false);
          }
        } catch (error) {
          // If the endpoint doesn't exist yet, default to false
          setIsFinalized(false);
        }
      }
    };
    
    checkFinalizationStatus();
  }, [rosterJob.jobId, selectedHistoryRoster?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load doctors and roster history
  useEffect(() => {
    if (user) {
      loadDoctors();
      loadRosterHistory();
    }
  }, [user]);

  // Default dates are now handled in the modal

  const loadDoctors = async () => {
    try {
      const response = await getAllDoctors();
      if (response.success && response.data) {
        setDoctors(response.data);
      } else {
        console.error('Failed to load doctors:', response.error);
      }
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadRosterHistory = async () => {
    setIsHistoryLoading(true);
    try {
      // First, recalculate stats for any rosters that might have zero values
      recalculateAllRosterStats();
      
      const response = getRosters({ sortBy: 'date', sortOrder: 'asc' });
      setSavedRosters(response.rosters);
      
      // Debug: Make recalculate function available in console
      (window as any).recalculateAllRosterStats = recalculateAllRosterStats;
      (window as any).refreshRosterHistory = loadRosterHistory;
      
    } catch (error) {
      console.error('Error loading roster history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleGenerateRoster = async (request: RosterGenerationRequest) => {
    if (!request.start_date || !request.end_date) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(request.end_date) <= new Date(request.start_date)) {
      alert('End date must be after start date');
      return;
    }
    
    // Close the generation modal
    setIsGenerationModalOpen(false);

    setIsLoading(true);
    setRosterJob({
      jobId: null,
      status: null,
      isGenerating: true,
      error: null
    });

    try {
      // Transform the request data to match backend expectations
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const weeks = Math.ceil(timeDiff / (1000 * 3600 * 24 * 7)); // Convert to weeks
      
      const backendRequest: BackendRosterRequest = {
        start_date: request.start_date,
        weeks: weeks
      };
      
      const response = await generateRoster(backendRequest);
      
      if (response.success && response.data) {
        const jobId = response.data.job_id;
        setRosterJob(prev => ({
          ...prev,
          jobId,
          status: {
            job_id: jobId,
            status: 'pending',
            progress: 0,
            message: 'Starting roster generation...',
            created_at: new Date().toISOString()
          }
        }));

        // Start polling for status
        try {
          const finalStatus = await pollRosterStatus(jobId, (status) => {
            setRosterJob(prev => ({
              ...prev,
              status
            }));
          });

          const updatedJob = {
            ...rosterJob,
            isGenerating: false,
            status: finalStatus
          };
          
          setRosterJob(updatedJob);
          
          // Save completed roster to history
          if (finalStatus.status === 'completed') {
            try {
              const savedRoster = saveRoster(finalStatus, {
                startDate: request.start_date,
                endDate: request.end_date,
                hospitals: request.hospitals || []
              });
              
              // Also save the current active roster data for reports to use
              const activeRosterData = {
                jobId: finalStatus.job_id,
                startDate: request.start_date,
                weeks: weeks,
                statistics: finalStatus.statistics || {},
                outputs: finalStatus.outputs,
                generatedAt: finalStatus.completed_at || finalStatus.created_at
              };
              localStorage.setItem('peninsula_health_generated_roster', JSON.stringify(activeRosterData));
              
              // Refresh roster history
              loadRosterHistory();
              
              // Auto-select the newly created roster
              setSelectedHistoryRoster(savedRoster);
            } catch (saveError) {
              console.error('Failed to save roster to history:', saveError);
            }
          }
        } catch (pollError) {
          setRosterJob(prev => ({
            ...prev,
            isGenerating: false,
            error: pollError instanceof Error ? pollError.message : 'Generation failed'
          }));
        }
      } else {
        setRosterJob(prev => ({
          ...prev,
          isGenerating: false,
          error: response.error || 'Failed to start roster generation'
        }));
      }
    } catch (error) {
      setRosterJob(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate roster'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRosterSelect = (roster: SavedRoster) => {
    setSelectedHistoryRoster(roster);
    // Update current roster job to show the selected roster
    setRosterJob({
      jobId: roster.jobId,
      status: roster.status,
      isGenerating: false,
      error: null
    });
    
    // Also sync the active roster data for reports to use
    if (roster.status.status === 'completed') {
      const activeRosterData = {
        jobId: roster.status.job_id,
        startDate: roster.startDate,
        weeks: Math.ceil((new Date(roster.endDate).getTime() - new Date(roster.startDate).getTime()) / (1000 * 3600 * 24 * 7)),
        statistics: (roster.status as any).statistics || {},
        outputs: roster.status.outputs,
        generatedAt: roster.status.completed_at || roster.status.created_at
      };
      localStorage.setItem('peninsula_health_generated_roster', JSON.stringify(activeRosterData));
    }
    
    // Clear any current generation form to avoid confusion
    setModificationMode('none');
    setSelectedShifts([]);
  };

  const handleRosterDelete = async (rosterId: string) => {
    if (window.confirm('Are you sure you want to delete this roster? This action cannot be undone.')) {
      const success = deleteRoster(rosterId);
      if (success) {
        loadRosterHistory();
        // If the deleted roster was selected, clear the selection
        if (selectedHistoryRoster?.id === rosterId) {
          setSelectedHistoryRoster(null);
          setRosterJob({
            jobId: null,
            status: null,
            isGenerating: false,
            error: null
          });
          // Clear the active roster data for reports
          localStorage.removeItem('peninsula_health_generated_roster');
        }
      }
    }
  };

  const handleRosterArchive = async (rosterId: string) => {
    const updatedRoster = toggleArchiveRoster(rosterId);
    if (updatedRoster) {
      loadRosterHistory();
      // Update selected roster if it's the one being archived
      if (selectedHistoryRoster?.id === rosterId) {
        setSelectedHistoryRoster(updatedRoster);
      }
    }
  };

  const handleCancelGeneration = async () => {
    if (!rosterJob.jobId) return;

    try {
      const response = await cancelRosterGeneration(rosterJob.jobId);
      if (response.success) {
        setRosterJob(prev => ({
          ...prev,
          isGenerating: false,
          status: prev.status ? {
            ...prev.status,
            status: 'cancelled',
            message: 'Generation cancelled by user'
          } : null
        }));
      }
    } catch (error) {
      console.error('Failed to cancel generation:', error);
    }
  };

  const handleFinalizeRoster = async () => {
    // Get the job ID from either the active roster or selected history roster
    const jobId = rosterJob.jobId || selectedHistoryRoster?.id;
    
    if (!jobId) {
      alert('Please select or generate a roster first');
      return;
    }

    setIsFinalizing(true);
    try {
      const response = await finalizeRoster(jobId, user?.fullName);
      if (response.success) {
        setIsFinalized(true);
        alert('Roster has been finalized successfully');
        
        // Update the selected history roster if applicable
        if (selectedHistoryRoster) {
          // Just update the finalized state, don't modify the roster object
          // The finalized state is tracked separately
        }
      } else {
        alert(`Failed to finalize roster: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to finalize roster:', error);
      alert('Failed to finalize roster');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleUnfinalizeRoster = async () => {
    const jobId = rosterJob.jobId || selectedHistoryRoster?.id;
    if (!jobId) return;

    setIsFinalizing(true);
    try {
      const response = await unfinalizeRoster(jobId);
      if (response.success) {
        setIsFinalized(false);
        alert('Roster is now editable again');
        
        // Update the selected history roster if applicable
        if (selectedHistoryRoster) {
          // Just update the finalized state, don't modify the roster object
          // The finalized state is tracked separately
        }
      } else {
        alert(`Failed to unfinalize roster: ${response.error}`);
      }
    } catch (error) {
      console.error('Failed to unfinalize roster:', error);
      alert('Failed to unfinalize roster');
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleExport = async (format: 'all' | 'distribution' | 'management', type: 'csv' | 'pdf') => {
    if (!rosterJob.jobId || rosterJob.status?.status !== 'completed') {
      alert('Please generate a roster first');
      return;
    }

    const exportKey = `${type}_${format}`;
    setIsExporting(prev => ({ ...prev, [exportKey]: true }));

    try {
      // Build export URL directly since backend streams files directly
      const exportUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/roster/${rosterJob.jobId}/export/${type}/${format}`;
      
      // Create filename based on current date
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `peninsula_health_${format}_roster_${timestamp}.${type}`;
      
      // Download file directly using the existing downloadFile function
      await downloadFile(exportUrl, filename);
      
    } catch (error) {
      console.error(`Export failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Not Found') || errorMessage.includes('404')) {
        alert(`Export failed: Roster job not found. This may happen if the server was restarted. Please generate a new roster and try again.`);
      } else {
        alert(`Failed to export ${type.toUpperCase()}: ${errorMessage}`);
      }
    } finally {
      setIsExporting(prev => ({ ...prev, [exportKey]: false }));
    }
  };

  const handleShiftModification = async (action: 'add' | 'remove') => {
    if (!rosterJob.jobId || selectedShifts.length === 0) {
      alert('Please select shifts first');
      return;
    }

    const modifications: ShiftModification[] = selectedShifts.map(shiftId => ({
      shift_id: shiftId,
      action: action === 'add' ? 'add' : 'remove'
    }));

    try {
      const modifyFunction = action === 'add' ? addShiftsToRoster : removeShiftsFromRoster;
      const response = await modifyFunction(rosterJob.jobId, {
        modifications,
        reason: `${action === 'add' ? 'Added' : 'Removed'} ${modifications.length} shifts via UI`
      });

      if (response.success) {
        alert(`Successfully ${action === 'add' ? 'added' : 'removed'} ${response.data?.updated_shifts} shifts`);
        setSelectedShifts([]);
        setModificationMode('none');
        
        // Refresh roster status to get updated data
        const statusResponse = await getRosterStatus(rosterJob.jobId);
        if (statusResponse.success && statusResponse.data) {
          setRosterJob(prev => ({
            ...prev,
            status: statusResponse.data!
          }));
        }
      } else {
        alert(`Failed to ${action} shifts: ${response.error}`);
      }
    } catch (error) {
      console.error(`Shift modification failed:`, error);
      alert(`Failed to ${action} shifts`);
    }
  };

  const handleShiftReassign = async (
    date: string, 
    shiftName: string, 
    currentDoctor: string, 
    newDoctor: string
  ) => {
    if (!rosterJob.jobId) {
      throw new Error('No active roster job');
    }

    setIsReassigning(true);
    
    try {
      // Use the new reassignShift API that tracks modifications
      const response = await reassignShift(
        rosterJob.jobId,
        date,
        shiftName,
        currentDoctor,
        newDoctor
      );
      
      if (!response.success) {
        throw new Error(`Failed to reassign shift: ${response.error}`);
      }
      
      // Refresh roster status to get updated data including modified shifts
      const statusResponse = await getRosterStatus(rosterJob.jobId);
      if (statusResponse.success) {
        setRosterJob(prev => ({
          ...prev,
          status: statusResponse.data!
        }));
      }
      
      alert(`Successfully reassigned ${shiftName} on ${date} from ${currentDoctor} to ${newDoctor}`);
      
    } catch (error) {
      console.error('Shift reassignment failed:', error);
      throw error; // Re-throw for RosterView to handle
    } finally {
      setIsReassigning(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('shift_happens_user');
    localStorage.removeItem('shift_happens_token');
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#16a34a';
      case 'running': return '#f59e0b';
      case 'failed': case 'cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⏳';
      case 'failed': return '❌';
      case 'cancelled': return '🛑';
      case 'pending': return '⏱️';
      default: return '❓';
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

  return (
    <div className={styles.scheduleContainer}>
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
            <button className={`${styles.navItem} ${styles.navItemActive}`}>
              Schedules
            </button>
            <button className={styles.navItem} onClick={() => navigate('/doctors')}>
              Doctors
            </button>
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

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Schedule Management</h1>
            <p className={styles.pageSubtitle}>
              Generate and manage hospital rosters with automated optimization
            </p>
          </div>
          <div className={styles.headerActions}>
            {rosterJob.isGenerating && (
              <button 
                className={styles.cancelButton} 
                onClick={handleCancelGeneration}
              >
                🛑 Cancel Generation
              </button>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className={styles.actionBar}>
          <div className={styles.actionButtons}>
            <button
              className="btnPrimary"
              onClick={() => setIsGenerationModalOpen(true)}
              disabled={isLoading || rosterJob.isGenerating}
            >
              📊 Generate New Roster
            </button>
            <button
              className="btnSecondary"
              onClick={() => setIsRosterModalOpen(true)}
              disabled={!rosterJob.status || rosterJob.status.status !== 'completed'}
            >
              📅 View Active Roster
            </button>
            {rosterJob.isGenerating && (
              <button
                className="btnDanger btnSm"
                onClick={handleCancelGeneration}
              >
                🛑 Cancel Generation
              </button>
            )}
          </div>
          
          {rosterJob.isGenerating && (
            <div className={styles.progressIndicator}>
              <div className={styles.progressInfo}>
                <span className={styles.progressLabel}>
                  Generating... {rosterJob.status?.progress || 0}%
                </span>
                <span className={styles.progressMessage}>
                  {rosterJob.status?.message || 'Processing...'}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${rosterJob.status?.progress || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className={styles.contentLayout}>
          {/* Left Panel - Roster History (Smaller) */}
          <div className={styles.leftPanel}>
            <RosterHistoryList
              rosters={savedRosters}
              selectedRosterId={selectedHistoryRoster?.id}
              onRosterSelect={handleRosterSelect}
              onRosterDelete={handleRosterDelete}
              onRosterArchive={handleRosterArchive}
              isLoading={isHistoryLoading}
            />
          </div>

          {/* Right Panel - Roster Status & Management */}
          <div className={styles.rightPanel}>
            {rosterJob.status ? (
              <>
                <div className={styles.panelHeader}>
                  <h2>Roster Status</h2>
                  <div 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(rosterJob.status.status) }}
                  >
                    {getStatusIcon(rosterJob.status.status)} {rosterJob.status.status.toUpperCase()}
                  </div>
                </div>

                <div className={styles.statusSection}>
                  <div className={styles.statusRow}>
                    <span className={styles.statusLabel}>Job ID:</span>
                    <code className={styles.jobId}>{rosterJob.status.job_id}</code>
                  </div>
                  
                  <div className={styles.statusRow}>
                    <span className={styles.statusLabel}>Created:</span>
                    <span>{formatDate(rosterJob.status.created_at)}</span>
                  </div>

                  {rosterJob.status.completed_at && (
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>Completed:</span>
                      <span>{formatDate(rosterJob.status.completed_at)}</span>
                    </div>
                  )}

                  <div className={styles.statusRow}>
                    <span className={styles.statusLabel}>Progress:</span>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ width: `${rosterJob.status.progress}%` }}
                        />
                      </div>
                      <span className={styles.progressText}>{rosterJob.status.progress}%</span>
                    </div>
                  </div>

                  {rosterJob.status.message && (
                    <div className={styles.statusRow}>
                      <span className={styles.statusLabel}>Message:</span>
                      <span className={styles.statusMessage}>{rosterJob.status.message}</span>
                    </div>
                  )}

                  {rosterJob.status.error && (
                    <div className={styles.errorMessage}>
                      <strong>Error:</strong> {rosterJob.status.error}
                    </div>
                  )}
                </div>

                {/* Finalization and Distribution Section */}
                {(rosterJob.status?.status === 'completed' || selectedHistoryRoster) && (
                  <div className={styles.finalizationSection}>
                    <h3>Roster Distribution</h3>
                    <div className={styles.distributionActions}>
                      {!isFinalized ? (
                        <button
                          className="btnPrimary"
                          onClick={handleFinalizeRoster}
                          disabled={isFinalizing}
                        >
                          {isFinalizing ? 'Finalizing...' : '✓ Finalize Roster'}
                        </button>
                      ) : (
                        <>
                          <button
                            className="btnSecondary"
                            onClick={handleUnfinalizeRoster}
                            disabled={isFinalizing}
                          >
                            ✏️ Edit Roster
                          </button>
                          <button
                            className="btnPrimary"
                            onClick={() => setIsEmailModalOpen(true)}
                          >
                            📧 Distribute via Email
                          </button>
                        </>
                      )}
                    </div>
                    {isFinalized && (
                      <p className={styles.finalizationNote}>
                        ✅ Roster has been finalized and is ready for distribution
                      </p>
                    )}
                  </div>
                )}

                {/* Export Section */}
                {rosterJob.status.status === 'completed' && (
                  <div className={styles.exportSection}>
                    <h3>Export Options</h3>
                    <div className={styles.exportGrid}>
                      {['all', 'distribution', 'management'].map((format) => (
                        <div key={format} className={styles.exportRow}>
                          <span className={styles.exportFormat}>{format.charAt(0).toUpperCase() + format.slice(1)}:</span>
                          <div className={styles.exportButtons}>
                            <button
                              className={styles.exportButton}
                              onClick={() => handleExport(format as any, 'csv')}
                              disabled={isExporting[`csv_${format}`]}
                            >
                              {isExporting[`csv_${format}`] ? '⏳' : '📊'} CSV
                            </button>
                            <button
                              className={styles.exportButton}
                              onClick={() => handleExport(format as any, 'pdf')}
                              disabled={isExporting[`pdf_${format}`]}
                            >
                              {isExporting[`pdf_${format}`] ? '⏳' : '📄'} PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roster Preview */}
                {rosterJob.status.status === 'completed' && rosterJob.status.roster_data && (
                  <div className={styles.rosterPreview}>
                    <h3>Roster Summary</h3>
                    <div className={styles.summaryStats}>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Period:</span>
                        <span>{formatDate(rosterJob.status.roster_data.period_start)} - {formatDate(rosterJob.status.roster_data.period_end)}</span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Days:</span>
                        <span>{rosterJob.status.roster_data.days.length}</span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Total Shifts:</span>
                        <span>{rosterJob.status.roster_data.days.reduce((total, day) => total + day.shifts.length, 0)}</span>
                      </div>
                      <div className={styles.summaryItem}>
                        <span className={styles.summaryLabel}>Doctors:</span>
                        <span>{rosterJob.status.roster_data.doctors.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Roster View Section */}
                {rosterJob.status.status === 'completed' && rosterJob.status.outputs?.calendar_view && (
                  <div className={styles.rosterViewSection}>
                    <div className={styles.rosterViewHeader}>
                      <h3>Roster View</h3>
                      <button
                        className="btnPrimary"
                        onClick={() => setIsRosterModalOpen(true)}
                      >
                        📅 View Roster
                      </button>
                    </div>
                    <p className={styles.rosterDescription}>
                      Click "View Roster" to see the complete schedule in a clean, interactive view.
                    </p>
                  </div>
                )}

                {/* Enhanced Shift Management Section */}
                {rosterJob.status.status === 'completed' && rosterJob.status.outputs?.calendar_view && (
                  <div className={styles.shiftManagement}>
                    <h3>Shift Management Tools</h3>
                    <div className={styles.managementActions}>
                      <button
                        className={`${styles.managementButton} ${modificationMode === 'add' ? styles.active : ''}`}
                        onClick={() => setModificationMode(modificationMode === 'add' ? 'none' : 'add')}
                      >
                        ➕ Add Shifts Mode
                      </button>
                      <button
                        className={`${styles.managementButton} ${modificationMode === 'remove' ? styles.active : ''}`}
                        onClick={() => setModificationMode(modificationMode === 'remove' ? 'none' : 'remove')}
                      >
                        ➖ Remove Shifts Mode
                      </button>
                      <button
                        className={styles.managementButton}
                        onClick={() => {
                          setSelectedShifts([]);
                          setModificationMode('none');
                        }}
                      >
                        🔄 Reset Selection
                      </button>
                    </div>

                    {modificationMode !== 'none' && (
                      <div className={styles.modificationPanel}>
                        <div className={styles.panelHeader}>
                          <h4>
                            {modificationMode === 'add' ? 'Add Shifts to Roster' : 'Remove Shifts from Roster'}
                          </h4>
                          <span className={styles.selectionCount}>
                            {selectedShifts.length} shift{selectedShifts.length !== 1 ? 's' : ''} selected
                          </span>
                        </div>
                        
                        <div className={styles.instructions}>
                          {modificationMode === 'add' ? (
                            <p>💡 Select shifts from the roster view below to add new assignments. You can add vacant shifts or create additional coverage.</p>
                          ) : (
                            <p>💡 Select shifts from the roster view below to remove existing assignments. This will make them vacant.</p>
                          )}
                        </div>

                        {selectedShifts.length > 0 && (
                          <div className={styles.selectedShifts}>
                            <h5>Selected Shifts:</h5>
                            <div className={styles.shiftsList}>
                              {selectedShifts.map(shiftId => (
                                <div key={shiftId} className={styles.selectedShift}>
                                  <span className={styles.shiftLabel}>{shiftId}</span>
                                  <button
                                    className={styles.removeSelection}
                                    onClick={() => setSelectedShifts(prev => prev.filter(id => id !== shiftId))}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                            
                            <div className={styles.actionButtons}>
                              <button
                                className={`${styles.executeButton} ${modificationMode === 'add' ? styles.add : styles.remove}`}
                                onClick={() => handleShiftModification(modificationMode as 'add' | 'remove')}
                                disabled={selectedShifts.length === 0}
                              >
                                {modificationMode === 'add' ? '➕ Add Selected Shifts' : '➖ Remove Selected Shifts'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className={styles.managementStats}>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Total Assignments:</span>
                        <span className={styles.statValue}>
                          {rosterJob.status.roster_data?.days.reduce((total, day) => total + day.shifts.filter(s => s.doctor_name && s.doctor_name !== 'VACANT').length, 0) || 0}
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Vacant Shifts:</span>
                        <span className={styles.statValue}>
                          {rosterJob.status.roster_data?.days.reduce((total, day) => total + day.shifts.filter(s => !s.doctor_name || s.doctor_name === 'VACANT').length, 0) || 0}
                        </span>
                      </div>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Coverage Rate:</span>
                        <span className={styles.statValue}>
                          {(() => {
                            const totalShifts = rosterJob.status.roster_data?.days.reduce((total, day) => total + day.shifts.length, 0) || 0;
                            const assignedShifts = rosterJob.status.roster_data?.days.reduce((total, day) => total + day.shifts.filter(s => s.doctor_name && s.doctor_name !== 'VACANT').length, 0) || 0;
                            return totalShifts > 0 ? `${Math.round((assignedShifts / totalShifts) * 100)}%` : '0%';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noRosterState}>
                <div className={styles.noRosterIcon}>📅</div>
                <h3>No Active Roster</h3>
                <p>Generate a new roster to see status and management options here.</p>
              </div>
            )}
          </div>
        </div>

        {/* Roster Generation Modal */}
        <RosterGenerationModal
          isOpen={isGenerationModalOpen}
          onClose={() => setIsGenerationModalOpen(false)}
          onGenerate={handleGenerateRoster}
          doctors={doctors}
          isLoading={isLoading || rosterJob.isGenerating}
        />

        {/* Roster View Modal */}
        {rosterJob.status && rosterJob.status.status === 'completed' && rosterJob.status.outputs?.calendar_view && (
          <RosterModal
            isOpen={isRosterModalOpen}
            onClose={() => setIsRosterModalOpen(false)}
            rosterStatus={rosterJob.status}
            doctors={doctors}
            onShiftReassign={handleShiftReassign}
            isReassigning={isReassigning}
            onExport={handleExport}
          />
        )}

        {/* Email Distribution Modal */}
        {((rosterJob.status && rosterJob.status.status === 'completed' && rosterJob.jobId) || selectedHistoryRoster) && (
          <EmailDistributionModal
            show={isEmailModalOpen}
            onHide={() => setIsEmailModalOpen(false)}
            rosterData={
              rosterJob.status?.outputs ? {
                outputs: rosterJob.status.outputs,
                startDate: rosterJob.status.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                weeks: 4,
                jobId: rosterJob.jobId
              } : selectedHistoryRoster ? {
                outputs: selectedHistoryRoster.status.outputs,
                startDate: selectedHistoryRoster.startDate,
                weeks: Math.ceil((new Date(selectedHistoryRoster.endDate).getTime() - new Date(selectedHistoryRoster.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)),
                jobId: selectedHistoryRoster.id
              } : null
            }
            jobId={rosterJob.jobId || selectedHistoryRoster?.id || ''}
          />
        )}
      </main>
    </div>
  );
};

export default SchedulePage;