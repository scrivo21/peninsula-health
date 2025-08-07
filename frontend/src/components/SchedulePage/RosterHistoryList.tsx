import React, { useState, useMemo } from 'react';
import { SavedRoster } from '../../services/rosterStorageApi';
import styles from './RosterHistoryList.module.css';

interface RosterHistoryListProps {
  rosters: SavedRoster[];
  selectedRosterId?: string;
  onRosterSelect: (roster: SavedRoster) => void;
  onRosterDelete?: (rosterId: string) => void;
  onRosterArchive?: (rosterId: string) => void;
  isLoading?: boolean;
}

export const RosterHistoryList: React.FC<RosterHistoryListProps> = ({
  rosters,
  selectedRosterId,
  onRosterSelect,
  onRosterDelete,
  onRosterArchive,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'coverage'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showArchived, setShowArchived] = useState(false);

  // Filter and sort rosters
  const filteredAndSortedRosters = useMemo(() => {
    let filtered = rosters.filter(roster => {
      const matchesSearch = roster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           roster.hospitals.some(h => h.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesArchived = showArchived || !roster.isArchived;
      
      return matchesSearch && matchesArchived;
    });

    // Sort rosters
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'coverage':
          comparison = a.coverageRate - b.coverageRate;
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [rosters, searchTerm, sortBy, sortOrder, showArchived]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${end.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}`;
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return 'var(--color-success)';
    if (coverage >= 75) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const getStatusIcon = (roster: SavedRoster) => {
    if (roster.isArchived) return '📦';
    if (roster.status.status === 'completed') return '✅';
    if (roster.status.status === 'failed') return '❌';
    return '⏳';
  };

  const handleSortChange = (newSortBy: 'date' | 'name' | 'coverage') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleRosterAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading rosters...</p>
      </div>
    );
  }

  return (
    <div className={styles.historyContainer}>
      <div className={styles.historyHeader}>
        <h3>Roster History</h3>
        <span className={styles.rosterCount}>
          {filteredAndSortedRosters.length} roster{filteredAndSortedRosters.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search and Filters */}
      <div className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search rosters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>🔍</span>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.sortControls}>
            <label className={styles.sortLabel}>Sort by:</label>
            <div className={styles.sortButtons}>
              <button
                className={`${styles.sortButton} ${sortBy === 'date' ? styles.active : ''}`}
                onClick={() => handleSortChange('date')}
              >
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                className={`${styles.sortButton} ${sortBy === 'name' ? styles.active : ''}`}
                onClick={() => handleSortChange('name')}
              >
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                className={`${styles.sortButton} ${sortBy === 'coverage' ? styles.active : ''}`}
                onClick={() => handleSortChange('coverage')}
              >
                Coverage {sortBy === 'coverage' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>

          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <span className={styles.checkboxLabel}>Show archived</span>
          </label>
        </div>
      </div>

      {/* Roster List */}
      <div className={styles.rosterList}>
        {filteredAndSortedRosters.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📅</div>
            <h4>No rosters found</h4>
            <p>
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Generate your first roster to see it here'
              }
            </p>
          </div>
        ) : (
          filteredAndSortedRosters.map((roster) => (
            <div
              key={roster.id}
              className={`${styles.rosterItem} ${
                selectedRosterId === roster.id ? styles.selected : ''
              } ${roster.isArchived ? styles.archived : ''}`}
              onClick={() => onRosterSelect(roster)}
            >
              <div className={styles.rosterHeader}>
                <div className={styles.rosterTitle}>
                  <span className={styles.statusIcon}>
                    {getStatusIcon(roster)}
                  </span>
                  <span className={styles.rosterName}>{roster.name}</span>
                </div>
                
                <div className={styles.rosterActions}>
                  {onRosterArchive && (
                    <button
                      className={styles.actionButton}
                      onClick={(e) => handleRosterAction(e, () => onRosterArchive(roster.id))}
                      title={roster.isArchived ? 'Unarchive roster' : 'Archive roster'}
                    >
                      {roster.isArchived ? '📤' : '📦'}
                    </button>
                  )}
                  {onRosterDelete && (
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={(e) => handleRosterAction(e, () => onRosterDelete(roster.id))}
                      title="Delete roster"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.rosterDetails}>
                <div className={styles.dateRange}>
                  <span className={styles.dateIcon}>📅</span>
                  <span>{formatDateRange(roster.startDate, roster.endDate)}</span>
                </div>
                
                <div className={styles.hospitals}>
                  <span className={styles.hospitalIcon}>🏥</span>
                  <span>{roster.hospitals.join(', ')}</span>
                </div>
              </div>

              <div className={styles.rosterStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Shifts:</span>
                  <span className={styles.statValue}>{roster.totalShifts}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Doctors:</span>
                  <span className={styles.statValue}>{roster.totalDoctors}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Coverage:</span>
                  <span 
                    className={styles.statValue}
                    style={{ color: getCoverageColor(roster.coverageRate) }}
                  >
                    {roster.coverageRate}%
                  </span>
                </div>
              </div>

              <div className={styles.rosterMeta}>
                <span className={styles.createdDate}>
                  Generated {formatDate(roster.generatedAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RosterHistoryList;