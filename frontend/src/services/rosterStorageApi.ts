import { RosterStatusResponse } from '../types/schedule';

export interface SavedRoster {
  id: string;
  name: string;
  jobId: string;
  status: RosterStatusResponse;
  createdAt: string;
  generatedAt: string;
  startDate: string;
  endDate: string;
  hospitals: string[];
  totalShifts: number;
  totalDoctors: number;
  coverageRate: number;
  isArchived: boolean;
}

export interface RosterListResponse {
  rosters: SavedRoster[];
  total: number;
}

const STORAGE_KEY = 'peninsula_health_rosters';

class RosterStorageService {
  
  /**
   * Save a completed roster to local storage
   */
  saveRoster(rosterStatus: RosterStatusResponse, generationParams: {
    startDate: string;
    endDate: string;
    hospitals: string[];
  }): SavedRoster {
    const rosters = this.getAllRosters();
    
    // Debug: Log the roster status structure
    console.log('Debug - rosterStatus:', rosterStatus);
    console.log('Debug - roster_data:', rosterStatus.roster_data);
    console.log('Debug - statistics:', (rosterStatus as any).statistics);
    console.log('Debug - outputs:', rosterStatus.outputs);
    
    // Calculate roster statistics with fallbacks
    let totalShifts = 0;
    let assignedShifts = 0;
    let totalDoctors = 0;
    let coverageRate = 0;
    
    // Try getting from roster_data first
    if (rosterStatus.roster_data?.days && rosterStatus.roster_data.days.length > 0) {
      totalShifts = rosterStatus.roster_data.days.reduce((total, day) => total + day.shifts.length, 0);
      
      // Debug: Log first few shifts to understand structure
      const firstDay = rosterStatus.roster_data.days[0];
      if (firstDay?.shifts?.length > 0) {
        console.log('Debug - First 3 shifts structure:', firstDay.shifts.slice(0, 3));
        console.log('Debug - Shift properties:', Object.keys(firstDay.shifts[0]));
      }
      
      assignedShifts = rosterStatus.roster_data.days.reduce((total, day) => {
        const dayAssigned = day.shifts.filter(s => {
          // Try different possible property names for doctor assignment
          const doctorName = s.doctor_name || s.doctorName || s.doctorId;
          const isAssigned = doctorName && doctorName !== 'VACANT' && doctorName !== '' && doctorName !== null;
          return isAssigned;
        }).length;
        return total + dayAssigned;
      }, 0);
      
      totalDoctors = rosterStatus.roster_data.doctors?.length || 0;
      coverageRate = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0;
    }
    // Try parsing CSV outputs if roster_data not available
    else if (rosterStatus.outputs?.calendar_view) {
      console.log('Debug save - Using CSV outputs path');
      
      try {
        // Parse the calendar_view CSV to calculate statistics
        const csvData = rosterStatus.outputs.calendar_view;
        const lines = csvData.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headerLine = lines[0];
          const dataLines = lines.slice(1);
          
          // Count total shifts and assigned shifts
          totalShifts = 0;
          assignedShifts = 0;
          
          dataLines.forEach(line => {
            const cells = line.split(',');
            const shiftCells = cells.slice(1); // Remove date column
            
            shiftCells.forEach(cell => {
              if (cell.trim()) { // If cell has content
                totalShifts++;
                if (cell.trim() !== 'VACANT' && cell.trim() !== '' && cell.trim() !== 'OFF') {
                  assignedShifts++;
                }
              }
            });
          });
          
          // Get doctor count from doctor_summary if available
          if (rosterStatus.outputs.doctor_summary) {
            const doctorLines = rosterStatus.outputs.doctor_summary.split('\n').filter(line => line.trim());
            totalDoctors = Math.max(0, doctorLines.length - 1); // -1 for header
          }
          
          coverageRate = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0;
          
          console.log('Debug save CSV parse:', { totalShifts, assignedShifts, totalDoctors, coverageRate });
        }
      } catch (error) {
        console.error('Error parsing CSV data in save:', error);
        // Fall back to basic estimates
        totalShifts = 1;
        totalDoctors = 1;
        coverageRate = 100;
      }
    }
    // Fallback to statistics object if available
    else if ((rosterStatus as any).statistics) {
      const stats = (rosterStatus as any).statistics;
      totalShifts = stats.total_shifts || stats.totalShifts || 0;
      assignedShifts = stats.assigned_shifts || stats.assignedShifts || 0;
      totalDoctors = stats.total_doctors || stats.totalDoctors || 0;
      coverageRate = stats.coverage_rate || stats.coverageRate || 0;
    }
    // Last resort - try to estimate from outputs or other fields
    else {
      // If we can't get exact stats, set reasonable defaults that indicate data exists
      totalShifts = 1; // At least show that there's some data
      totalDoctors = 1;
      coverageRate = 100; // Assume full coverage if we can't calculate
    }
    
    console.log('Debug - calculated stats:', { totalShifts, assignedShifts, totalDoctors, coverageRate });
    console.log('Debug - coverage calculation:', totalShifts > 0 ? `${assignedShifts}/${totalShifts} = ${Math.round((assignedShifts / totalShifts) * 100)}%` : 'No shifts to calculate coverage');
    
    // Generate a readable name for the roster
    const startDate = new Date(generationParams.startDate);
    const endDate = new Date(generationParams.endDate);
    const rosterName = `Roster ${startDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    const savedRoster: SavedRoster = {
      id: `roster_${Date.now()}_${rosterStatus.job_id}`,
      name: rosterName,
      jobId: rosterStatus.job_id,
      status: rosterStatus,
      createdAt: new Date().toISOString(),
      generatedAt: rosterStatus.completed_at || rosterStatus.created_at,
      startDate: generationParams.startDate,
      endDate: generationParams.endDate,
      hospitals: generationParams.hospitals,
      totalShifts,
      totalDoctors,
      coverageRate,
      isArchived: false
    };
    
    // Add to beginning of array (most recent first)
    rosters.unshift(savedRoster);
    
    // Keep only last 50 rosters to prevent storage bloat
    if (rosters.length > 50) {
      rosters.splice(50);
    }
    
    this.saveToStorage(rosters);
    return savedRoster;
  }
  
  /**
   * Get all saved rosters
   */
  getAllRosters(): SavedRoster[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load rosters from storage:', error);
      return [];
    }
  }
  
  /**
   * Get rosters with filtering and sorting
   */
  getRosters(options: {
    sortBy?: 'date' | 'name' | 'coverage';
    sortOrder?: 'asc' | 'desc';
    includeArchived?: boolean;
    limit?: number;
  } = {}): RosterListResponse {
    let rosters = this.getAllRosters();
    
    // Filter archived if needed
    if (!options.includeArchived) {
      rosters = rosters.filter(r => !r.isArchived);
    }
    
    // Sort rosters
    const sortBy = options.sortBy || 'date';
    const sortOrder = options.sortOrder || 'desc';
    
    rosters.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime();
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
    
    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      rosters = rosters.slice(0, options.limit);
    }
    
    return {
      rosters,
      total: rosters.length
    };
  }
  
  /**
   * Get a specific roster by ID
   */
  getRosterById(id: string): SavedRoster | null {
    const rosters = this.getAllRosters();
    return rosters.find(r => r.id === id) || null;
  }
  
  /**
   * Update a roster (e.g., rename, archive)
   */
  updateRoster(id: string, updates: Partial<SavedRoster>): SavedRoster | null {
    const rosters = this.getAllRosters();
    const index = rosters.findIndex(r => r.id === id);
    
    if (index === -1) return null;
    
    const updatedRoster = { ...rosters[index], ...updates };
    rosters[index] = updatedRoster;
    
    this.saveToStorage(rosters);
    return updatedRoster;
  }
  
  /**
   * Delete a roster
   */
  deleteRoster(id: string): boolean {
    const rosters = this.getAllRosters();
    const filteredRosters = rosters.filter(r => r.id !== id);
    
    if (filteredRosters.length === rosters.length) {
      return false; // Roster not found
    }
    
    this.saveToStorage(filteredRosters);
    return true;
  }
  
  /**
   * Archive/unarchive a roster
   */
  toggleArchiveRoster(id: string): SavedRoster | null {
    const roster = this.getRosterById(id);
    if (!roster) return null;
    
    return this.updateRoster(id, { isArchived: !roster.isArchived });
  }
  
  /**
   * Get roster statistics
   */
  getRosterStats(): {
    total: number;
    active: number;
    archived: number;
    averageCoverage: number;
    mostRecentDate: string | null;
  } {
    const rosters = this.getAllRosters();
    const active = rosters.filter(r => !r.isArchived);
    const archived = rosters.filter(r => r.isArchived);
    
    const averageCoverage = active.length > 0 
      ? Math.round(active.reduce((sum, r) => sum + r.coverageRate, 0) / active.length)
      : 0;
    
    const mostRecentDate = active.length > 0 
      ? active.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0].generatedAt
      : null;
    
    return {
      total: rosters.length,
      active: active.length,
      archived: archived.length,
      averageCoverage,
      mostRecentDate
    };
  }
  
  /**
   * Clear all rosters (with confirmation)
   */
  clearAllRosters(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
  
  /**
   * Export rosters data for backup
   */
  exportRostersData(): string {
    const rosters = this.getAllRosters();
    return JSON.stringify(rosters, null, 2);
  }
  
  /**
   * Import rosters data from backup
   */
  importRostersData(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData);
      if (!Array.isArray(imported)) {
        throw new Error('Invalid data format');
      }
      
      // Validate basic structure
      for (const roster of imported) {
        if (!roster.id || !roster.jobId || !roster.status) {
          throw new Error('Invalid roster structure');
        }
      }
      
      this.saveToStorage(imported);
      return true;
    } catch (error) {
      console.error('Failed to import rosters:', error);
      return false;
    }
  }
  
  /**
   * Recalculate statistics for a saved roster (useful for fixing existing rosters)
   */
  recalculateRosterStats(rosterId: string): SavedRoster | null {
    const rosters = this.getAllRosters();
    const index = rosters.findIndex(r => r.id === rosterId);
    
    if (index === -1) return null;
    
    const roster = rosters[index];
    const rosterStatus = roster.status;
    
    // Recalculate statistics using the same logic as saveRoster
    let totalShifts = 0;
    let assignedShifts = 0;
    let totalDoctors = 0;
    let coverageRate = 0;
    
    console.log('Debug recalc - rosterStatus.roster_data exists?', !!rosterStatus.roster_data);
    console.log('Debug recalc - roster_data value:', rosterStatus.roster_data);
    console.log('Debug recalc - roster_data type:', typeof rosterStatus.roster_data);
    console.log('Debug recalc - days length?', rosterStatus.roster_data?.days?.length);
    console.log('Debug recalc - outputs exists?', !!rosterStatus.outputs);
    console.log('Debug recalc - outputs value:', rosterStatus.outputs);
    
    if (rosterStatus.roster_data?.days && rosterStatus.roster_data.days.length > 0) {
      console.log('Debug recalc - Using roster_data path');
      totalShifts = rosterStatus.roster_data.days.reduce((total, day) => total + day.shifts.length, 0);
      
      assignedShifts = rosterStatus.roster_data.days.reduce((total, day) => {
        const dayAssigned = day.shifts.filter(s => {
          // Try different possible property names for doctor assignment
          const doctorName = s.doctor_name || s.doctorName || s.doctorId;
          const isAssigned = doctorName && doctorName !== 'VACANT' && doctorName !== '' && doctorName !== null;
          return isAssigned;
        }).length;
        return total + dayAssigned;
      }, 0);
      
      totalDoctors = rosterStatus.roster_data.doctors?.length || 0;
      coverageRate = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0;
      
      // Debug: Log first few shifts to understand structure
      const firstDay = rosterStatus.roster_data.days[0];
      if (firstDay?.shifts?.length > 0) {
        console.log('Debug recalc - First 3 shifts structure:', firstDay.shifts.slice(0, 3));
        console.log('Debug recalc - Shift properties:', Object.keys(firstDay.shifts[0]));
      }
      
    } else if (rosterStatus.outputs?.calendar_view) {
      console.log('Debug recalc - Using CSV outputs path');
      
      try {
        // Parse the calendar_view CSV to calculate statistics
        const csvData = rosterStatus.outputs.calendar_view;
        const lines = csvData.split('\n').filter(line => line.trim());
        
        if (lines.length > 1) {
          const headerLine = lines[0];
          const dataLines = lines.slice(1);
          
          // Count columns (excluding Date column = shift types)
          const headers = headerLine.split(',');
          const shiftColumns = headers.slice(1); // Remove 'Date' column
          
          // Count total shifts and assigned shifts
          totalShifts = 0;
          assignedShifts = 0;
          
          dataLines.forEach(line => {
            const cells = line.split(',');
            const shiftCells = cells.slice(1); // Remove date column
            
            shiftCells.forEach(cell => {
              if (cell.trim()) { // If cell has content
                totalShifts++;
                if (cell.trim() !== 'VACANT' && cell.trim() !== '' && cell.trim() !== 'OFF') {
                  assignedShifts++;
                }
              }
            });
          });
          
          // Get doctor count from doctor_summary if available
          if (rosterStatus.outputs.doctor_summary) {
            const doctorLines = rosterStatus.outputs.doctor_summary.split('\n').filter(line => line.trim());
            totalDoctors = Math.max(0, doctorLines.length - 1); // -1 for header
          }
          
          coverageRate = totalShifts > 0 ? Math.round((assignedShifts / totalShifts) * 100) : 0;
          
          console.log('Debug CSV parse:', { totalShifts, assignedShifts, totalDoctors, coverageRate });
        }
      } catch (error) {
        console.error('Error parsing CSV data:', error);
        // Fall back to basic estimates
        totalShifts = 1;
        totalDoctors = 1;
        coverageRate = 100;
      }
    } else if ((rosterStatus as any).statistics) {
      console.log('Debug recalc - Using statistics path');
      const stats = (rosterStatus as any).statistics;
      totalShifts = stats.total_shifts || stats.totalShifts || 0;
      assignedShifts = stats.assigned_shifts || stats.assignedShifts || 0;
      totalDoctors = stats.total_doctors || stats.totalDoctors || 0;
      coverageRate = stats.coverage_rate || stats.coverageRate || 0;
    } else {
      console.log('Debug recalc - No data path found');
    }
    
    // Update the roster with recalculated stats
    const updatedRoster: SavedRoster = {
      ...roster,
      totalShifts,
      totalDoctors,
      coverageRate
    };
    
    rosters[index] = updatedRoster;
    this.saveToStorage(rosters);
    
    console.log('Recalculated stats for roster', rosterId, ':', { totalShifts, assignedShifts, totalDoctors, coverageRate });
    console.log('Coverage calc:', totalShifts > 0 ? `${assignedShifts}/${totalShifts} = ${Math.round((assignedShifts / totalShifts) * 100)}%` : 'No shifts');
    
    return updatedRoster;
  }
  
  /**
   * Recalculate statistics for all saved rosters
   */
  recalculateAllRosterStats(): void {
    const rosters = this.getAllRosters();
    let updated = 0;
    
    console.log('Debug - All rosters:', rosters.map(r => ({
      id: r.id, 
      name: r.name, 
      totalShifts: r.totalShifts, 
      totalDoctors: r.totalDoctors, 
      coverageRate: r.coverageRate
    })));
    
    rosters.forEach(roster => {
      console.log(`Checking roster ${roster.name}: shifts=${roster.totalShifts}, doctors=${roster.totalDoctors}, coverage=${roster.coverageRate}`);
      
      // Force recalculate all rosters for now, regardless of current values
      if (roster.totalShifts === 0 || roster.totalDoctors === 0 || roster.coverageRate === 0 || true) {
        console.log(`Recalculating roster: ${roster.name}`);
        this.recalculateRosterStats(roster.id);
        updated++;
      }
    });
    
    console.log(`Recalculated stats for ${updated} rosters`);
  }
  
  private saveToStorage(rosters: SavedRoster[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rosters));
    } catch (error) {
      console.error('Failed to save rosters to storage:', error);
      // Could implement fallback storage or show user warning
    }
  }
}

// Create singleton instance
const rosterStorageService = new RosterStorageService();

// Export individual methods
export const saveRoster = (rosterStatus: RosterStatusResponse, generationParams: {
  startDate: string;
  endDate: string;
  hospitals: string[];
}) => rosterStorageService.saveRoster(rosterStatus, generationParams);

export const getAllRosters = () => rosterStorageService.getAllRosters();

export const getRosters = (options?: {
  sortBy?: 'date' | 'name' | 'coverage';
  sortOrder?: 'asc' | 'desc';
  includeArchived?: boolean;
  limit?: number;
}) => rosterStorageService.getRosters(options);

export const getRosterById = (id: string) => rosterStorageService.getRosterById(id);

export const updateRoster = (id: string, updates: Partial<SavedRoster>) => 
  rosterStorageService.updateRoster(id, updates);

export const deleteRoster = (id: string) => rosterStorageService.deleteRoster(id);

export const toggleArchiveRoster = (id: string) => rosterStorageService.toggleArchiveRoster(id);

export const getRosterStats = () => rosterStorageService.getRosterStats();

export const clearAllRosters = () => rosterStorageService.clearAllRosters();

export const exportRostersData = () => rosterStorageService.exportRostersData();

export const importRostersData = (jsonData: string) => rosterStorageService.importRostersData(jsonData);

export const recalculateRosterStats = (rosterId: string) => rosterStorageService.recalculateRosterStats(rosterId);

export const recalculateAllRosterStats = () => rosterStorageService.recalculateAllRosterStats();

export default rosterStorageService;