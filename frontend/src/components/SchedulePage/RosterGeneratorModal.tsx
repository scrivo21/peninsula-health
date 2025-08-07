import React, { useState } from 'react';
import { generateRoster, getRosterStatus, downloadRosterOutput, checkRosterOverlap } from '../../services/doctorApi';
import styles from './RosterGeneratorModal.module.css';

interface RosterGeneratorModalProps {
  onClose: () => void;
  onRosterGenerated: (rosterData: any) => void;
}

export const RosterGeneratorModal: React.FC<RosterGeneratorModalProps> = ({
  onClose,
  onRosterGenerated
}) => {
  const [weeks, setWeeks] = useState<number>(4);
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to next Monday
    const today = new Date();
    const daysAhead = (7 - today.getDay() + 1) % 7 || 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysAhead);
    return nextMonday.toISOString().split('T')[0];
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showOverlapWarning, setShowOverlapWarning] = useState(false);
  const [overlapData, setOverlapData] = useState<{
    overlappingRosters: Array<{
      jobId: string;
      startDate: string;
      weeks: number;
      endDate: string;
      createdAt: string;
      finalized: boolean;
    }>;
    requestedPeriod: {
      startDate: string;
      endDate: string;
      weeks: number;
    };
  } | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<{weeks: number, startDate: string} | null>(null);

  const handleGenerate = async () => {
    setError(null);
    
    // Check for roster overlap using server-side validation
    if (!pendingGeneration) {
      try {
        const overlapResponse = await checkRosterOverlap(weeks, startDate);
        
        if (!overlapResponse.success) {
          setError(overlapResponse.error || 'Failed to check for roster overlap');
          return;
        }
        
        if (overlapResponse.data?.hasOverlap) {
          // Set overlap data and show warning
          setOverlapData({
            overlappingRosters: overlapResponse.data.overlappingRosters,
            requestedPeriod: overlapResponse.data.requestedPeriod
          });
          setPendingGeneration({ weeks, startDate });
          setShowOverlapWarning(true);
          return;
        }
      } catch (error) {
        console.warn('Could not check roster overlap:', error);
        // Continue with generation if overlap check fails
      }
    }

    await generateRosterNow(weeks, startDate);
  };

  const generateRosterNow = async (weeksToGenerate: number, startDateToUse: string) => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress('Starting roster generation...');
    setShowOverlapWarning(false);
    setPendingGeneration(null);
    setOverlapData(null);

    try {
      // Generate roster
      const generateResponse = await generateRoster(weeksToGenerate, startDateToUse);
      
      if (!generateResponse.success) {
        throw new Error(generateResponse.error || 'Failed to generate roster');
      }

      // Handle both possible response formats (wrapped in data or direct)
      const jobId = generateResponse.data?.jobId || (generateResponse as any).jobId;
      const statistics = generateResponse.data?.statistics || (generateResponse as any).statistics;
      
      if (!jobId) {
        throw new Error('No job ID returned from roster generation');
      }
      
      setGenerationProgress('Roster generated successfully! Retrieving outputs...');

      // Get job status to confirm completion
      const statusResponse = await getRosterStatus(jobId);
      
      if (!statusResponse.success) {
        throw new Error('Failed to get roster status');
      }

      setGenerationProgress('Downloading roster outputs...');

      // Download all three outputs
      const [calendarView, doctorView, doctorSummary] = await Promise.all([
        downloadRosterOutput(jobId, 'calendar_view'),
        downloadRosterOutput(jobId, 'doctor_view'),
        downloadRosterOutput(jobId, 'doctor_summary')
      ]);

      const rosterData = {
        jobId,
        startDate,
        weeks,
        statistics,
        outputs: {
          calendar_view: calendarView,
          doctor_view: doctorView,
          doctor_summary: doctorSummary
        },
        generatedAt: new Date().toISOString()
      };

      setGenerationProgress('Roster generation completed!');
      
      // Pass the data back to parent component
      onRosterGenerated(rosterData);
      
      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Error generating roster:', error);
      let errorMessage = 'Failed to generate roster';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if it's a specific error we can provide more context for
        if (error.message.includes('Endpoint not found')) {
          errorMessage = 'Roster generation endpoint not found. Please ensure the backend server is running on port 3001.';
        } else if (error.message.includes('Failed to connect')) {
          errorMessage = 'Cannot connect to backend server. Please ensure the server is running on http://localhost:3001';
        }
      }
      
      setError(errorMessage);
      setGenerationProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  const getNextMonday = (date: Date): string => {
    const result = new Date(date);
    const daysAhead = (7 - result.getDay() + 1) % 7 || 7;
    result.setDate(result.getDate() + daysAhead);
    return result.toISOString().split('T')[0];
  };

  const handleStartDateChange = (value: string) => {
    const selectedDate = new Date(value);
    const dayOfWeek = selectedDate.getDay();
    
    // If not Monday, suggest next Monday
    if (dayOfWeek !== 1) {
      const nextMonday = getNextMonday(selectedDate);
      if (window.confirm(`Selected date is not a Monday. Would you like to use ${nextMonday} (next Monday) instead?`)) {
        setStartDate(nextMonday);
        return;
      }
    }
    
    setStartDate(value);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Generate Roster</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {error && (
            <div className={styles.errorMessage}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {showOverlapWarning && pendingGeneration && overlapData && (
            <div className={styles.warningMessage}>
              <h4>⚠️ Roster Overlap Warning</h4>
              <p>
                Your requested roster period (<strong>{overlapData.requestedPeriod.startDate}</strong> to{' '}
                <strong>{overlapData.requestedPeriod.endDate}</strong>, {overlapData.requestedPeriod.weeks} weeks) 
                overlaps with {overlapData.overlappingRosters.length} existing roster{overlapData.overlappingRosters.length > 1 ? 's' : ''}:
              </p>
              <div className={styles.overlapDetails}>
                {overlapData.overlappingRosters.map((roster, index) => (
                  <div key={roster.jobId} className={styles.overlapRoster}>
                    <strong>Roster {index + 1}:</strong> {roster.startDate} to {roster.endDate} ({roster.weeks} weeks)
                    <span className={styles.rosterStatus}>
                      {roster.finalized ? ' • Finalized' : ' • Draft'}
                    </span>
                  </div>
                ))}
              </div>
              <p className={styles.warningNote}>
                <strong>Warning:</strong> Generating a new roster will not automatically remove existing rosters. 
                You may end up with conflicting schedules.
              </p>
              <div className={styles.warningActions}>
                <button 
                  className={styles.cancelWarningButton}
                  onClick={() => {
                    setShowOverlapWarning(false);
                    setPendingGeneration(null);
                    setOverlapData(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className={styles.proceedButton}
                  onClick={() => generateRosterNow(pendingGeneration.weeks, pendingGeneration.startDate)}
                  disabled={isGenerating}
                >
                  Generate Anyway
                </button>
              </div>
            </div>
          )}

          {generationProgress && (
            <div className={styles.progressMessage}>
              {generationProgress}
            </div>
          )}

          {!showOverlapWarning && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="weeks">Number of Weeks:</label>
                <select
                  id="weeks"
                  value={weeks}
                  onChange={(e) => setWeeks(parseInt(e.target.value))}
                  disabled={isGenerating}
                  className={styles.select}
                >
              {Array.from({length: 52}, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>
                  {week} {week === 1 ? 'week' : 'weeks'}
                </option>
              ))}
            </select>
            <small className={styles.helpText}>
              {weeks <= 4 ? 'Single-period optimization' : 'Multi-period optimization with unified constraints'}
            </small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="startDate">Start Date:</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              disabled={isGenerating}
              className={styles.dateInput}
            />
            <small className={styles.helpText}>
              Roster will start on this date. Mondays are recommended for weekly scheduling.
            </small>
          </div>

          <div className={styles.infoSection}>
            <h3>What will be generated:</h3>
            <ul>
              <li><strong>Calendar View:</strong> Matrix showing shifts by date and type</li>
              <li><strong>Doctor View:</strong> Individual doctor schedules</li>
              <li><strong>Statistics:</strong> Workload distribution and fairness metrics</li>
            </ul>
          </div>

              {isGenerating && (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p>Generating roster using Peninsula Health optimization algorithm...</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.modalActions}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button 
            className={styles.generateButton} 
            onClick={handleGenerate}
            disabled={isGenerating || !startDate}
          >
            {isGenerating ? 'Generating...' : 'Generate Roster'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RosterGeneratorModal;