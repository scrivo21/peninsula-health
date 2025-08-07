const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const chokidar = require('chokidar');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Config file path
const CONFIG_FILE_PATH = path.join(__dirname, '../data/config.json');

// In-memory config cache
let configCache = null;
let lastModified = null;
let fileWatcher = null;
let isReloading = false; // Prevent concurrent reloads

// Clear any temporary or backup files that might interfere
async function clearTempFiles() {
  try {
    const backendDir = path.join(__dirname, '..');
    const tempFiles = ['temp_13week.json', 'test_balanced.json', 'test_balanced_final.json', 'test_balanced_v2.json'];
    
    for (const tempFile of tempFiles) {
      const filePath = path.join(backendDir, tempFile);
      if (await fs.pathExists(filePath)) {
        console.log(`🗑️ Removing temp file: ${tempFile}`);
        await fs.remove(filePath);
      }
    }
  } catch (error) {
    console.warn('Warning: Could not clear temp files:', error.message);
  }
}

// Initialize file system watcher for config.json
function initializeConfigWatcher() {
  try {
    // Clean up existing watcher if it exists
    if (fileWatcher) {
      fileWatcher.close();
    }
    
    console.log('🔍 Initializing config file watcher...');
    
    fileWatcher = chokidar.watch(CONFIG_FILE_PATH, {
      persistent: true,
      ignoreInitial: true, // Don't trigger on initial add
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait 100ms for file to stop changing
        pollInterval: 50
      }
    });
    
    fileWatcher.on('change', async (filePath) => {
      if (isReloading) {
        console.log('⏳ Config reload already in progress, skipping...');
        return;
      }
      
      isReloading = true;
      try {
        console.log('🔄 Config file changed externally, reloading cache...');
        
        // Force reload from disk
        configCache = null;
        lastModified = null;
        await loadConfig();
        
        const doctorCount = Object.keys(configCache.DOCTORS || {}).filter(key => !key.startsWith('_')).length;
        console.log(`✅ Config cache refreshed automatically - ${doctorCount} doctors loaded`);
        
      } catch (error) {
        console.error('❌ Error reloading config after file change:', error);
      } finally {
        isReloading = false;
      }
    });
    
    fileWatcher.on('error', (error) => {
      console.error('❌ Config file watcher error:', error);
    });
    
    console.log('✅ Config file watcher initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize config file watcher:', error);
  }
}

// Cleanup watcher on process exit
function cleanupWatcher() {
  if (fileWatcher) {
    console.log('🧹 Cleaning up config file watcher...');
    fileWatcher.close();
    fileWatcher = null;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  cleanupWatcher();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  cleanupWatcher();
  process.exit(0);
});

// Load config into memory
async function loadConfig() {
  try {
    const stats = await fs.stat(CONFIG_FILE_PATH);
    
    // Only reload if file has been modified
    if (!configCache || !lastModified || stats.mtime > lastModified) {
      console.log('Loading config from file...');
      const configData = await fs.readJson(CONFIG_FILE_PATH);
      configCache = configData;
      lastModified = stats.mtime;
      console.log(`Config loaded successfully with ${Object.keys(configData.DOCTORS || {}).filter(key => !key.startsWith('_')).length} doctors`);
    }
    
    return configCache;
  } catch (error) {
    console.error('Error loading config:', error);
    throw new Error('Failed to load configuration file');
  }
}

// Save config to file and update cache
async function saveConfig(newConfig) {
  try {
    console.log('💾 Saving config to file...');
    
    // Temporarily disable watcher during programmatic save to prevent circular reload
    isReloading = true;
    
    await fs.writeJson(CONFIG_FILE_PATH, newConfig, { spaces: 2 });
    
    // Update cache immediately with new config
    configCache = newConfig;
    lastModified = new Date();
    
    console.log('✅ Config saved and cached successfully');
    
    // Brief delay before re-enabling watcher
    setTimeout(() => {
      isReloading = false;
    }, 200);
    
    return true;
  } catch (error) {
    isReloading = false; // Reset on error
    console.error('❌ Error saving config:', error);
    throw new Error('Failed to save configuration file');
  }
}

// Convert config doctor format to frontend doctor profile format
function configToFrontendDoctor(doctorKey, doctorData) {
  const formatName = (key) => {
    return key.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Use stored avatar or generate one from available avatars
  const avatars = ['🦸', '🦹', '🧙', '🧚', '🦁', '🐯', '🦊', '🐺', '🦝', '🐻', '🐼', '🐨', '🐵', '🦒', '🦓', '🦄', '🐉', '🦅', '🦉', '🦜'];
  const avatarIndex = doctorKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % avatars.length;
  const defaultAvatar = avatars[avatarIndex];

  return {
    id: doctorKey.toLowerCase(),
    name: `Dr. ${formatName(doctorKey)}`,
    eft: doctorData.eft || 0.8,
    rosebud_preference: doctorData.rosebud_preference || 0,
    unavailable_dates: doctorData.unavailable_dates || [],
    preferred_shifts: doctorData.preferred_shifts || [],
    email: doctorData.email || `${doctorKey.toLowerCase().replace(/_/g, '.')}@peninsulahealth.org.au`,
    phone: doctorData.phone || '+61 3 9784 7777',
    specialization: doctorData.specialization || 'Emergency Medicine',
    experience_level: doctorData.experience_level || 'senior', // Default to senior if not specified
    hire_date: '2020-01-01',
    status: doctorData.status || 'active',
    avatar: doctorData.avatar || defaultAvatar,
    total_shifts_this_month: Math.floor(Math.random() * 15),
    undesirable_shifts_assigned: Math.floor(Math.random() * 5),
    last_modified: new Date().toISOString(),
    current_shifts: generateSampleShifts(doctorKey.toLowerCase(), Math.floor(Math.random() * 15))
  };
}

// Generate sample shifts for demo purposes
function generateSampleShifts(doctorId, totalShifts) {
  const shiftTypes = [
    { type: 'Blue (Frankston Day Leadership)', hospital: 'Frankston', start: '08:00', end: '18:00', leadership: true },
    { type: 'Yellow (Frankston Day)', hospital: 'Frankston', start: '08:00', end: '18:00' },
    { type: 'Pink (Frankston Day)', hospital: 'Frankston', start: '08:00', end: '18:00' },
    { type: 'Green (Frankston Evening Leadership)', hospital: 'Frankston', start: '18:00', end: '02:00', leadership: true },
    { type: 'Orange (Frankston Evening)', hospital: 'Frankston', start: '18:00', end: '02:00' },
    { type: 'Red AM (Rosebud Day)', hospital: 'Rosebud', start: '08:00', end: '18:00' },
    { type: 'Red PM (Rosebud Evening)', hospital: 'Rosebud', start: '14:00', end: '00:00' },
  ];

  const shifts = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  for (let i = 0; i < totalShifts; i++) {
    const randomDay = Math.floor(Math.random() * 31) + 1;
    const shiftDate = new Date(currentYear, currentMonth, randomDay);
    
    if (shiftDate.getMonth() !== currentMonth || shiftDate < today) continue;
    
    const randomShift = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
    
    shifts.push({
      date: shiftDate.toISOString().split('T')[0],
      shift_type: randomShift.type,
      hospital: randomShift.hospital,
      start_time: randomShift.start,
      end_time: randomShift.end,
      is_leadership: randomShift.leadership || false
    });
  }
  
  return shifts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Convert frontend doctor format back to config format
function frontendToConfigDoctor(doctorData) {
  // Extract the key from the name, removing "Dr. " prefix and converting to uppercase with underscores
  const doctorKey = doctorData.name
    .replace(/^Dr\.\s*/, '')
    .toUpperCase()
    .replace(/\s+/g, '_');

  return {
    key: doctorKey,
    data: {
      eft: doctorData.eft,
      rosebud_preference: doctorData.rosebud_preference,
      unavailable_dates: doctorData.unavailable_dates || [],
      preferred_shifts: doctorData.preferred_shifts || []
    }
  };
}

// API Routes

// Get all doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const config = await loadConfig();
    const doctors = [];
    
    if (config.DOCTORS) {
      Object.entries(config.DOCTORS).forEach(([key, value]) => {
        // Skip comment fields
        if (key.startsWith('_')) return;
        
        const doctor = configToFrontendDoctor(key, value);
        doctors.push(doctor);
      });
    }
    
    res.json({
      success: true,
      data: doctors,
      count: doctors.length
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctors',
      message: error.message
    });
  }
});

// Get single doctor by ID
app.get('/api/doctors/:id', async (req, res) => {
  try {
    const config = await loadConfig();
    const doctorId = req.params.id.toUpperCase();
    
    if (config.DOCTORS && config.DOCTORS[doctorId]) {
      const doctor = configToFrontendDoctor(doctorId, config.DOCTORS[doctorId]);
      res.json({
        success: true,
        data: doctor
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch doctor',
      message: error.message
    });
  }
});

// Add new doctor
app.post('/api/doctors', async (req, res) => {
  try {
    const config = await loadConfig();
    const { name, eft, rosebud_preference, unavailable_dates, preferred_shifts, experience_level } = req.body;
    
    if (!name || typeof eft !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name and eft are required'
      });
    }
    
    // Generate doctor key from name
    const doctorKey = name
      .replace(/^Dr\.\s*/, '')
      .toUpperCase()
      .replace(/\s+/g, '_');
    
    // Check if doctor already exists
    if (config.DOCTORS[doctorKey]) {
      return res.status(409).json({
        success: false,
        error: 'Doctor with this name already exists'
      });
    }
    
    // Add new doctor to config
    config.DOCTORS[doctorKey] = {
      eft: eft,
      rosebud_preference: rosebud_preference || 0,
      unavailable_dates: unavailable_dates || [],
      preferred_shifts: preferred_shifts || [],
      experience_level: (experience_level && ['senior', 'junior'].includes(experience_level.toLowerCase())) 
                        ? experience_level.toLowerCase() : 'senior'
    };
    
    // Save updated config
    await saveConfig(config);
    
    // Return the new doctor in frontend format
    const newDoctor = configToFrontendDoctor(doctorKey, config.DOCTORS[doctorKey]);
    
    res.status(201).json({
      success: true,
      data: newDoctor,
      message: 'Doctor added successfully'
    });
  } catch (error) {
    console.error('Error adding doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add doctor',
      message: error.message
    });
  }
});

// Update existing doctor
app.put('/api/doctors/:id', async (req, res) => {
  try {
    const config = await loadConfig();
    const doctorId = req.params.id.toUpperCase();
    
    if (!config.DOCTORS[doctorId]) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    const { eft, rosebud_preference, unavailable_dates, preferred_shifts, avatar, name, email, phone, specialization, status, experience_level } = req.body;
    
    // Update doctor data
    if (typeof eft === 'number') config.DOCTORS[doctorId].eft = eft;
    if (typeof rosebud_preference === 'number') config.DOCTORS[doctorId].rosebud_preference = rosebud_preference;
    if (Array.isArray(unavailable_dates)) config.DOCTORS[doctorId].unavailable_dates = unavailable_dates;
    if (Array.isArray(preferred_shifts)) config.DOCTORS[doctorId].preferred_shifts = preferred_shifts;
    
    // Update frontend-specific fields that we want to persist
    if (typeof avatar === 'string') config.DOCTORS[doctorId].avatar = avatar;
    if (typeof email === 'string') config.DOCTORS[doctorId].email = email;
    if (typeof phone === 'string') config.DOCTORS[doctorId].phone = phone;
    if (typeof specialization === 'string') config.DOCTORS[doctorId].specialization = specialization;
    if (typeof status === 'string') config.DOCTORS[doctorId].status = status;
    if (typeof experience_level === 'string' && ['senior', 'junior'].includes(experience_level.toLowerCase())) {
      config.DOCTORS[doctorId].experience_level = experience_level.toLowerCase();
    }
    
    // Handle name changes (this requires renaming the doctor key)
    const formatName = (key) => {
      return key.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    };
    
    if (typeof name === 'string' && name !== `Dr. ${formatName(doctorId)}`) {
      const newDoctorKey = name
        .replace(/^Dr\\.\\s*/, '')
        .toUpperCase()
        .replace(/\\s+/g, '_');
      
      if (newDoctorKey !== doctorId && !config.DOCTORS[newDoctorKey]) {
        // Rename the doctor by copying data to new key and removing old key
        config.DOCTORS[newDoctorKey] = { ...config.DOCTORS[doctorId] };
        delete config.DOCTORS[doctorId];
        doctorId = newDoctorKey; // Update for response
      }
    }
    
    // Save updated config
    await saveConfig(config);
    
    // Return updated doctor
    const updatedDoctor = configToFrontendDoctor(doctorId, config.DOCTORS[doctorId]);
    
    res.json({
      success: true,
      data: updatedDoctor,
      message: 'Doctor updated successfully'
    });
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update doctor',
      message: error.message
    });
  }
});

// Delete doctor
app.delete('/api/doctors/:id', async (req, res) => {
  try {
    const config = await loadConfig();
    const doctorId = req.params.id.toUpperCase();
    
    if (!config.DOCTORS[doctorId]) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    console.log(`🗑️ Deleting doctor: ${doctorId}`);
    
    // Remove doctor from config
    delete config.DOCTORS[doctorId];
    
    // Save updated config
    await saveConfig(config);
    
    const remainingDoctors = Object.keys(config.DOCTORS || {}).filter(key => !key.startsWith('_')).length;
    console.log(`✅ Doctor ${doctorId} deleted successfully. Remaining doctors: ${remainingDoctors}`);
    
    res.json({
      success: true,
      message: 'Doctor removed successfully'
    });
  } catch (error) {
    console.error('Error removing doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove doctor',
      message: error.message
    });
  }
});

// Get medical quotes
app.get('/api/quotes', async (req, res) => {
  try {
    const config = await loadConfig();
    const quotes = config.medical_quotes_and_facts?.quotes || [];
    
    res.json({
      success: true,
      data: quotes,
      count: quotes.length
    });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quotes',
      message: error.message
    });
  }
});

// Get random quote
app.get('/api/quotes/random', async (req, res) => {
  try {
    const config = await loadConfig();
    const quotes = config.medical_quotes_and_facts?.quotes || [];
    
    if (quotes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No quotes available'
      });
    }
    
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    res.json({
      success: true,
      data: randomQuote
    });
  } catch (error) {
    console.error('Error fetching random quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch random quote',
      message: error.message
    });
  }
});

// ===========================
// ROSTER GENERATION ENDPOINTS
// ===========================

const { spawn } = require('child_process');

// Persistent job storage
const JOBS_FILE_PATH = path.join(__dirname, '../data/active_jobs.json');
let activeJobs = new Map();

// Load jobs from persistent storage
async function loadJobs() {
  try {
    if (await fs.pathExists(JOBS_FILE_PATH)) {
      const jobsData = await fs.readJson(JOBS_FILE_PATH);
      activeJobs = new Map(Object.entries(jobsData));
      console.log(`📂 Loaded ${activeJobs.size} roster jobs from persistent storage`);
    } else {
      console.log('📂 No existing jobs file found, starting with empty job storage');
    }
  } catch (error) {
    console.error('❌ Error loading jobs from storage:', error);
    activeJobs = new Map(); // Fallback to empty map
  }
}

// Save jobs to persistent storage
async function saveJobs() {
  try {
    // Convert Map to plain object for JSON storage
    const jobsData = Object.fromEntries(activeJobs);
    await fs.writeJson(JOBS_FILE_PATH, jobsData, { spaces: 2 });
    console.log(`💾 Saved ${activeJobs.size} roster jobs to persistent storage`);
  } catch (error) {
    console.error('❌ Error saving jobs to storage:', error);
  }
}

// Add job to storage with persistence
function addJob(jobId, jobData) {
  activeJobs.set(jobId, jobData);
  // Save asynchronously - don't block the response
  saveJobs().catch(error => console.error('Failed to persist job:', error));
}

// Remove job from storage with persistence
function removeJob(jobId) {
  const removed = activeJobs.delete(jobId);
  if (removed) {
    // Save asynchronously
    saveJobs().catch(error => console.error('Failed to persist job removal:', error));
  }
  return removed;
}

// Clean up old jobs (older than 7 days)
function cleanupOldJobs() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  let removedCount = 0;
  for (const [jobId, jobData] of activeJobs.entries()) {
    const createdAt = new Date(jobData.createdAt);
    if (createdAt < sevenDaysAgo) {
      activeJobs.delete(jobId);
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} old roster jobs (older than 7 days)`);
    saveJobs().catch(error => console.error('Failed to persist job cleanup:', error));
  }
}

// Schedule periodic cleanup (daily)
setInterval(cleanupOldJobs, 24 * 60 * 60 * 1000);

// Check for roster overlap endpoint
app.post('/api/roster/check-overlap', (req, res) => {
  try {
    const { weeks = 4, start_date } = req.body;
    
    // Validate input
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      return res.status(400).json({
        success: false,
        error: 'Weeks must be an integer between 1 and 52'
      });
    }
    
    let startDate;
    if (start_date) {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'start_date is required'
      });
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (weeks * 7));
    
    // Check for overlapping rosters
    const overlappingRosters = [];
    for (const [jobId, job] of activeJobs.entries()) {
      const existingStartDate = new Date(job.startDate);
      const existingEndDate = new Date(existingStartDate);
      existingEndDate.setDate(existingStartDate.getDate() + (job.weeks * 7));
      
      // Check if dates overlap: (StartA <= EndB) and (EndA >= StartB)
      if (startDate < existingEndDate && endDate > existingStartDate) {
        overlappingRosters.push({
          jobId: job.jobId,
          startDate: job.startDate,
          weeks: job.weeks,
          endDate: existingEndDate.toISOString().split('T')[0],
          createdAt: job.createdAt,
          finalized: job.finalized || false
        });
      }
    }
    
    res.json({
      success: true,
      hasOverlap: overlappingRosters.length > 0,
      overlappingRosters,
      requestedPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        weeks
      }
    });
    
  } catch (error) {
    console.error('Error checking roster overlap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check roster overlap'
    });
  }
});

// Generate roster endpoint
app.post('/api/roster/generate', async (req, res) => {
  try {
    const { weeks = 4, start_date } = req.body;
    
    // Validate input
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      return res.status(400).json({
        success: false,
        error: 'Weeks must be an integer between 1 and 52'
      });
    }
    
    let startDate;
    if (start_date) {
      startDate = new Date(start_date);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
    } else {
      // Default to next Monday
      const today = new Date();
      const daysAhead = (7 - today.getDay() + 1) % 7 || 7;
      startDate = new Date(today);
      startDate.setDate(today.getDate() + daysAhead);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const jobId = uuidv4();
    
    // Force fresh config reload before roster generation to ensure latest data
    console.log('🔄 Refreshing config cache before roster generation...');
    configCache = null;
    lastModified = null;
    await loadConfig();
    
    const doctorCount = Object.keys(configCache.DOCTORS || {}).filter(key => !key.startsWith('_')).length;
    console.log(`✅ Config refreshed for roster generation - ${doctorCount} doctors loaded`);
    
    // Call Python roster generator
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'roster_generator.py'),
      CONFIG_FILE_PATH,
      weeks.toString(),
      startDateStr
    ]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python process error:', errorOutput);
        return res.status(500).json({
          success: false,
          error: 'Roster generation failed',
          details: errorOutput
        });
      }
      
      try {
        const result = JSON.parse(output);
        
        if (!result.success) {
          return res.status(500).json({
            success: false,
            error: 'Roster generation failed',
            details: result.error
          });
        }
        
        // Store job results with persistence
        // Also store original assignments for change tracking
        const originalAssignments = parseAssignmentsFromCalendarView(result.outputs.calendar_view);
        
        addJob(jobId, {
          jobId,
          createdAt: new Date().toISOString(),
          startDate: startDateStr,
          weeks,
          outputs: result.outputs,
          statistics: result.statistics,
          originalAssignments: originalAssignments,  // Store original state
          modifiedShifts: []  // Track which shifts have been modified (as array for JSON serialization)
        });
        
        res.json({
          success: true,
          data: {
            job_id: jobId,
            message: `Roster generated successfully for ${weeks} weeks starting ${startDateStr}`,
            statistics: result.statistics
          }
        });
        
      } catch (parseError) {
        console.error('Failed to parse Python output:', parseError);
        return res.status(500).json({
          success: false,
          error: 'Failed to parse roster generation results'
        });
      }
    });
    
  } catch (error) {
    console.error('Error generating roster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate roster',
      message: error.message
    });
  }
});

// Get roster status endpoint
app.get('/api/roster/:jobId/status', (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    
    res.json({
      success: true,
      data: {
        job_id: job.jobId,
        status: 'completed',
        progress: 100,
        message: `Roster generation completed successfully`,
        created_at: job.createdAt,
        roster_data: null, // We'll populate this if needed
        outputs: job.outputs,
        availableOutputs: Object.keys(job.outputs),
        weeks: job.weeks,
        startDate: job.startDate,
        statistics: job.statistics,
        modifiedShifts: job.modifiedShifts || []  // Include modified shifts list
      }
    });
    
  } catch (error) {
    console.error('Error getting roster status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get roster status',
      message: error.message
    });
  }
});

// Download roster endpoint
app.get('/api/roster/:jobId/download/:outputType', (req, res) => {
  try {
    const { jobId, outputType } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    
    if (!job.outputs[outputType]) {
      return res.status(400).json({
        success: false,
        error: `Output type '${outputType}' not available`,
        availableTypes: Object.keys(job.outputs)
      });
    }
    
    const filename = `peninsula_health_${outputType}_${job.startDate}_${job.weeks}weeks.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(job.outputs[outputType]);
    
  } catch (error) {
    console.error('Error downloading roster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download roster',
      message: error.message
    });
  }
});

// Delete roster job endpoint
app.delete('/api/roster/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const removed = removeJob(jobId);
    
    if (removed) {
      res.json({
        success: true,
        message: 'Roster job deleted successfully',
        job_id: jobId
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete roster job'
      });
    }
  } catch (error) {
    console.error('Error deleting roster job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete roster job',
      message: error.message
    });
  }
});

// ===========================
// ROSTER FINALIZATION & EMAIL DISTRIBUTION
// ===========================

const emailService = require('./services/emailService');

// Finalize a roster (mark as ready for distribution)
app.post('/api/roster/:jobId/finalize', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    
    // Check if already finalized
    if (job.finalized) {
      return res.status(400).json({
        success: false,
        error: 'Roster already finalized',
        finalized_at: job.finalized_at
      });
    }
    
    // Mark as finalized
    job.finalized = true;
    job.finalized_at = new Date().toISOString();
    job.finalized_by = req.body.user || 'system';
    
    // Persist changes
    addJob(jobId, job);
    
    res.json({
      success: true,
      message: 'Roster finalized successfully',
      data: {
        job_id: jobId,
        finalized: true,
        finalized_at: job.finalized_at,
        finalized_by: job.finalized_by
      }
    });
    
  } catch (error) {
    console.error('Error finalizing roster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize roster',
      message: error.message
    });
  }
});

// Unfinalize a roster (allow edits again)
app.post('/api/roster/:jobId/unfinalize', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    
    if (!job.finalized) {
      return res.status(400).json({
        success: false,
        error: 'Roster is not finalized'
      });
    }
    
    // Remove finalization
    job.finalized = false;
    delete job.finalized_at;
    delete job.finalized_by;
    delete job.distribution_status;
    
    // Persist changes
    addJob(jobId, job);
    
    res.json({
      success: true,
      message: 'Roster unfinalized successfully',
      data: {
        job_id: jobId,
        finalized: false
      }
    });
    
  } catch (error) {
    console.error('Error unfinalizing roster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unfinalize roster',
      message: error.message
    });
  }
});

// Distribute roster via email to all doctors
app.post('/api/roster/:jobId/distribute', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { test_mode = false, test_email = null } = req.body;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    
    // Check if roster is finalized
    if (!job.finalized && !test_mode) {
      return res.status(400).json({
        success: false,
        error: 'Roster must be finalized before distribution'
      });
    }
    
    // Initialize email service
    const initialized = await emailService.initialize();
    if (!initialized) {
      return res.status(503).json({
        success: false,
        error: 'Email service not configured',
        message: 'Please configure SMTP settings in config.json'
      });
    }
    
    // Start distribution
    job.distribution_status = {
      started_at: new Date().toISOString(),
      in_progress: true,
      completed: false
    };
    
    // Persist initial status
    addJob(jobId, job);
    
    // Send test email if requested
    if (test_mode && test_email) {
      try {
        // Send test roster to specified email
        const testDoctor = {
          name: 'Test User',
          email: test_email
        };
        
        const result = await emailService.sendDoctorRoster(testDoctor, job, {
          includeCSV: true
        });
        
        res.json({
          success: true,
          message: 'Test email sent successfully',
          data: {
            test_mode: true,
            recipient: test_email,
            result
          }
        });
        
      } catch (error) {
        console.error('Test email failed:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to send test email',
          message: error.message
        });
      }
      
    } else {
      // Send to all doctors
      try {
        const results = await emailService.sendRosterToAllDoctors(job, {
          includeCSV: true,
          rateLimit: true
        });
        
        // Update distribution status
        job.distribution_status = {
          started_at: job.distribution_status.started_at,
          completed_at: new Date().toISOString(),
          in_progress: false,
          completed: true,
          results: {
            total: results.successful.length + results.failed.length + results.skipped.length,
            successful: results.successful.length,
            failed: results.failed.length,
            skipped: results.skipped.length,
            details: results
          }
        };
        
        // Persist final status
        addJob(jobId, job);
        
        res.json({
          success: true,
          message: `Roster distributed to ${results.successful.length} doctors`,
          data: {
            job_id: jobId,
            distribution_status: job.distribution_status
          }
        });
        
      } catch (error) {
        console.error('Distribution failed:', error);
        
        // Update status to failed
        job.distribution_status.in_progress = false;
        job.distribution_status.completed = false;
        job.distribution_status.error = error.message;
        addJob(jobId, job);
        
        res.status(500).json({
          success: false,
          error: 'Failed to distribute roster',
          message: error.message
        });
      }
    }
    
  } catch (error) {
    console.error('Error distributing roster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to distribute roster',
      message: error.message
    });
  }
});

// Get distribution status for a roster
app.get('/api/roster/:jobId/distribution-status', (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    
    res.json({
      success: true,
      data: {
        job_id: jobId,
        finalized: job.finalized || false,
        finalized_at: job.finalized_at,
        finalized_by: job.finalized_by,
        distribution_status: job.distribution_status || null
      }
    });
    
  } catch (error) {
    console.error('Error getting distribution status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get distribution status',
      message: error.message
    });
  }
});

// Test email configuration
app.post('/api/email/test', async (req, res) => {
  try {
    const { recipient_email } = req.body;
    
    if (!recipient_email) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required'
      });
    }
    
    // Initialize email service
    const initialized = await emailService.initialize();
    if (!initialized) {
      return res.status(503).json({
        success: false,
        error: 'Email service not configured',
        message: 'Please configure SMTP settings in config.json'
      });
    }
    
    // Send test email
    const result = await emailService.sendTestEmail(recipient_email);
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      message: error.message
    });
  }
});

// Get email configuration status (without sensitive data)
app.get('/api/email/status', async (req, res) => {
  try {
    const config = await loadConfig();
    const emailSettings = config.email_settings || {};
    
    const status = {
      configured: !!(emailSettings.smtp_host && emailSettings.smtp_user),
      smtp_host: emailSettings.smtp_host || 'Not configured',
      smtp_port: emailSettings.smtp_port || 'Not configured',
      from_email: emailSettings.from_email || emailSettings.smtp_user || 'Not configured',
      from_name: emailSettings.from_name || 'Not configured'
    };
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('Error getting email status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get email configuration status',
      message: error.message
    });
  }
});

// ===========================
// SHIFT MANAGEMENT ENDPOINTS  
// ===========================

// Add a shift to existing roster
app.post('/api/roster/:jobId/shifts', (req, res) => {
  try {
    const { jobId } = req.params;
    const { date, shift_type, location, doctor_name } = req.body;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    // Validate required fields
    if (!date || !shift_type || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: date, shift_type, and location are required'
      });
    }
    
    const job = activeJobs.get(jobId);
    const shiftId = `${date}_${location}_${shift_type}`;
    
    // Parse and modify the roster data
    try {
      const calendarLines = job.outputs.calendar_view.split('\n');
      const doctorLines = job.outputs.doctor_view.split('\n');
      
      // Add shift to calendar view
      const updatedCalendarView = addShiftToCalendarView(calendarLines, date, shift_type, location, doctor_name);
      const updatedDoctorView = addShiftToDoctorView(doctorLines, date, shift_type, location, doctor_name);
      
      if (updatedCalendarView && updatedDoctorView) {
        job.outputs.calendar_view = updatedCalendarView;
        job.outputs.doctor_view = updatedDoctorView;
        
        // Persist changes
        addJob(jobId, job);
        
        res.json({
          success: true,
          message: 'Shift added successfully',
          shift: {
            id: shiftId,
            date,
            shift_type,
            location,
            doctor_name: doctor_name || 'VACANT'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to add shift - invalid roster format or conflicting assignment'
        });
      }
    } catch (error) {
      console.error('Error modifying roster:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to modify roster data'
      });
    }
  } catch (error) {
    console.error('Error adding shift:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add shift',
      message: error.message
    });
  }
});

// Reassign a shift to a different doctor (tracks modifications)
app.put('/api/roster/:jobId/shifts/reassign', (req, res) => {
  try {
    const { jobId } = req.params;
    const { date, shiftName, currentDoctor, newDoctor } = req.body;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    const shiftKey = `${date}-${shiftName}`;
    
    // Initialize modifiedShifts if it doesn't exist
    if (!job.modifiedShifts) {
      job.modifiedShifts = [];
    }
    
    // Parse and modify the roster data
    try {
      const calendarLines = job.outputs.calendar_view.split('\n');
      const headers = calendarLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const shiftIndex = headers.findIndex(h => h === shiftName);
      
      if (shiftIndex === -1) {
        return res.status(400).json({
          success: false,
          error: 'Shift not found'
        });
      }
      
      // Find the date row and update the assignment
      let updated = false;
      for (let i = 1; i < calendarLines.length; i++) {
        const row = calendarLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        if (row[0] === date) {
          // Update the assignment
          row[shiftIndex] = newDoctor;
          calendarLines[i] = row.map(cell => `"${cell}"`).join(',');
          updated = true;
          
          // Track this shift as modified (add if not already present)
          if (!job.modifiedShifts.includes(shiftKey)) {
            job.modifiedShifts.push(shiftKey);
          }
          break;
        }
      }
      
      if (updated) {
        job.outputs.calendar_view = calendarLines.join('\n');
        
        // Persist changes
        addJob(jobId, job);
        
        res.json({
          success: true,
          message: 'Shift reassigned successfully',
          data: {
            shift: shiftKey,
            previousAssignment: currentDoctor,
            newAssignment: newDoctor,
            isModified: true
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to update shift assignment'
        });
      }
    } catch (error) {
      console.error('Error modifying roster:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to modify roster data'
      });
    }
  } catch (error) {
    console.error('Error reassigning shift:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reassign shift',
      message: error.message
    });
  }
});

// Remove a shift from existing roster
app.delete('/api/roster/:jobId/shifts', (req, res) => {
  try {
    const { jobId } = req.params;
    const { date, shift_type, location } = req.body;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    // Validate required fields
    if (!date || !shift_type || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: date, shift_type, and location are required'
      });
    }
    
    const job = activeJobs.get(jobId);
    const shiftId = `${date}_${location}_${shift_type}`;
    
    // Parse and modify the roster data
    try {
      const calendarLines = job.outputs.calendar_view.split('\n');
      const doctorLines = job.outputs.doctor_view.split('\n');
      
      // Remove shift from calendar view
      const updatedCalendarView = removeShiftFromCalendarView(calendarLines, date, shift_type, location);
      const updatedDoctorView = removeShiftFromDoctorView(doctorLines, date, shift_type, location);
      
      if (updatedCalendarView && updatedDoctorView) {
        job.outputs.calendar_view = updatedCalendarView;
        job.outputs.doctor_view = updatedDoctorView;
        
        // Persist changes
        addJob(jobId, job);
        
        res.json({
          success: true,
          message: 'Shift removed successfully',
          shift: {
            id: shiftId,
            date,
            shift_type,
            location
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to remove shift - shift not found or invalid roster format'
        });
      }
    } catch (error) {
      console.error('Error modifying roster:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to modify roster data'
      });
    }
  } catch (error) {
    console.error('Error removing shift:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove shift',
      message: error.message
    });
  }
});

// Enhanced CSV export with multiple formats
app.get('/api/roster/:jobId/export/csv/:format?', (req, res) => {
  try {
    const { jobId, format = 'all' } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (format === 'all') {
      // Create a ZIP-like response with all formats (simplified as concatenated CSV)
      const allFormats = [];
      
      // Calendar View (for shift managers)
      allFormats.push(`=== CALENDAR VIEW (${job.startDate} - ${job.weeks} weeks) ===`);
      allFormats.push(enhanceCalendarViewForDistribution(job.outputs.calendar_view, job));
      allFormats.push('\n\n');
      
      // Doctor View (for individual doctors)
      allFormats.push(`=== DOCTOR ASSIGNMENTS VIEW ===`);
      allFormats.push(enhanceDoctorViewForDistribution(job.outputs.doctor_view, job));
      allFormats.push('\n\n');
      
      // Summary Statistics
      if (job.outputs.doctor_summary) {
        allFormats.push(`=== ROSTER STATISTICS ===`);
        allFormats.push(job.outputs.doctor_summary);
      }
      
      const filename = `peninsula_health_complete_roster_${job.startDate}_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(allFormats.join('\n'));
      
    } else if (format === 'distribution') {
      // Create distribution-ready format for doctors
      const distributionCsv = createDistributionFormat(job);
      const filename = `peninsula_health_doctor_assignments_${job.startDate}_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(distributionCsv);
      
    } else if (format === 'management') {
      // Create management format for shift supervisors
      const managementCsv = createManagementFormat(job);
      const filename = `peninsula_health_shift_management_${job.startDate}_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(managementCsv);
      
    } else {
      // Original format support
      if (!job.outputs[format]) {
        return res.status(400).json({
          success: false,
          error: `Export format '${format}' not available`,
          availableFormats: ['all', 'distribution', 'management', ...Object.keys(job.outputs)]
        });
      }
      
      const filename = `peninsula_health_${format}_${job.startDate}_${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(job.outputs[format]);
    }
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV',
      message: error.message
    });
  }
});

// Helper functions for enhanced CSV export
function enhanceCalendarViewForDistribution(calendarCsv, job) {
  try {
    const lines = calendarCsv.split('\n');
    if (lines.length < 1) return calendarCsv;
    
    // Add header information
    const header = [
      `# Peninsula Health Roster - Calendar View`,
      `# Generated: ${new Date().toLocaleString('en-AU')}`,
      `# Period: ${job.startDate} (${job.weeks} weeks)`,
      `# Total Shifts: ${Object.keys(job.outputs).length > 0 ? 'Generated' : 'Unknown'}`,
      `#`,
      ``
    ].join('\n');
    
    return header + calendarCsv;
  } catch (error) {
    console.error('Error enhancing calendar view:', error);
    return calendarCsv;
  }
}

function enhanceDoctorViewForDistribution(doctorCsv, job) {
  try {
    const lines = doctorCsv.split('\n');
    if (lines.length < 1) return doctorCsv;
    
    // Add header information
    const header = [
      `# Peninsula Health Roster - Doctor Assignments`,
      `# Generated: ${new Date().toLocaleString('en-AU')}`,
      `# Period: ${job.startDate} (${job.weeks} weeks)`,
      `# Instructions: Each doctor can see their assigned shifts by finding their column`,
      `# OFF = Day off, Other entries = Assigned shift`,
      `#`,
      ``
    ].join('\n');
    
    return header + doctorCsv;
  } catch (error) {
    console.error('Error enhancing doctor view:', error);
    return doctorCsv;
  }
}

function createDistributionFormat(job) {
  try {
    const doctorLines = job.outputs.doctor_view.split('\n');
    if (doctorLines.length < 2) return 'No doctor assignments available';
    
    const headers = doctorLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const doctors = headers.slice(1); // Remove 'Date' column
    
    let distributionCsv = [
      `# PENINSULA HEALTH - INDIVIDUAL DOCTOR SCHEDULES`,
      `# Generated: ${new Date().toLocaleString('en-AU')}`,
      `# Period: ${job.startDate} (${job.weeks} weeks)`,
      `# Each section below shows one doctor's complete schedule`,
      ``,
      `Doctor Name,Date,Shift Assignment,Location,Shift Type,Status`
    ];
    
    // Create individual doctor sections
    doctors.forEach(doctor => {
      if (!doctor || doctor.trim() === '') return;
      
      distributionCsv.push(`\n# === ${doctor.toUpperCase()} SCHEDULE ===`);
      
      for (let i = 1; i < doctorLines.length; i++) {
        const row = doctorLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const date = row[0];
        const doctorIndex = headers.indexOf(doctor);
        const assignment = doctorIndex >= 0 ? row[doctorIndex] : 'OFF';
        
        if (assignment && assignment !== 'OFF') {
          const parts = assignment.split(' ');
          const location = parts[0] || 'Unknown';
          const shiftType = parts.slice(1).join(' ') || 'Unknown';
          const status = assignment.includes('Blue') || assignment.includes('Green') ? 'Leadership' : 'Standard';
          
          distributionCsv.push(`"${doctor}","${date}","${assignment}","${location}","${shiftType}","${status}"`);
        } else {
          distributionCsv.push(`"${doctor}","${date}","Day Off","N/A","N/A","Off"`);
        }
      }
    });
    
    return distributionCsv.join('\n');
  } catch (error) {
    console.error('Error creating distribution format:', error);
    return 'Error generating distribution format';
  }
}

function createManagementFormat(job) {
  try {
    const calendarLines = job.outputs.calendar_view.split('\n');
    if (calendarLines.length < 2) return 'No calendar data available';
    
    const headers = calendarLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const shifts = headers.slice(1); // Remove 'Date' column
    
    let managementCsv = [
      `# PENINSULA HEALTH - SHIFT MANAGEMENT VIEW`,
      `# Generated: ${new Date().toLocaleString('en-AU')}`,
      `# Period: ${job.startDate} (${job.weeks} weeks)`,
      `# Shows daily shift coverage and vacant positions`,
      ``,
      `Date,Shift Type,Location,Assigned Doctor,Coverage Status,Shift Category`
    ];
    
    for (let i = 1; i < calendarLines.length; i++) {
      const row = calendarLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      const date = row[0];
      
      shifts.forEach((shift, index) => {
        const assignedDoctor = row[index + 1] || 'VACANT';
        const parts = shift.split(' ');
        const location = parts[0] || 'Unknown';
        const shiftType = parts.slice(1).join(' ') || 'Unknown';
        const coverageStatus = assignedDoctor === 'VACANT' || assignedDoctor === '' ? 'VACANT' : 'COVERED';
        const category = shift.includes('Admin') ? 'Administrative' : 'Clinical';
        
        managementCsv.push(`"${date}","${shiftType}","${location}","${assignedDoctor}","${coverageStatus}","${category}"`);
      });
    }
    
    return managementCsv.join('\n');
  } catch (error) {
    console.error('Error creating management format:', error);
    return 'Error generating management format';
  }
}

// Debug endpoint to test minimal PDF
app.get('/api/debug/test-pdf', async (req, res) => {
  try {
    const doc = new PDFDocument();
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      console.log('PDF generation completed, buffer size:', Buffer.concat(chunks).length);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="debug-test.pdf"');
      res.send(Buffer.concat(chunks));
    });
    doc.on('error', (error) => {
      console.error('PDF generation error:', error);
      res.status(500).json({ error: 'PDF generation failed', message: error.message });
    });
    
    doc.text('This is a test PDF with just one line of text', 100, 100);
    doc.end();
    
  } catch (error) {
    console.error('Error in debug PDF endpoint:', error);
    res.status(500).json({ error: 'Failed to generate debug PDF', message: error.message });
  }
});

// Debug endpoint to inspect job data
app.get('/api/debug/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    const job = activeJobs.get(jobId);
    
    // Return a sanitized version of job data for inspection
    const debugData = {
      jobId: job.jobId,
      status: job.status,
      startDate: job.startDate,
      weeks: job.weeks,
      hasCalendarView: !!job.outputs?.calendar_view,
      calendarViewLength: job.outputs?.calendar_view?.length || 0,
      calendarViewPreview: job.outputs?.calendar_view?.substring(0, 200) || 'No calendar view',
      outputKeys: Object.keys(job.outputs || {})
    };
    
    res.json({ success: true, data: debugData });
    
  } catch (error) {
    console.error('Error in debug job endpoint:', error);
    res.status(500).json({ error: 'Failed to get debug data', message: error.message });
  }
});

// PDF export endpoint with professional branding
app.get('/api/roster/:jobId/export/pdf/:format?', async (req, res) => {
  try {
    const { jobId, format = 'all' } = req.params;
    
    if (!activeJobs.has(jobId)) {
      return res.status(404).json({
        success: false,
        error: 'Roster job not found'
      });
    }
    
    const job = activeJobs.get(jobId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate PDF based on format
    let pdfBuffer;
    let filename;
    
    if (format === 'all') {
      pdfBuffer = await generateCompletePDFWithJsPDF(job);
      filename = `peninsula_health_complete_roster_${job.startDate}_${timestamp}.pdf`;
    } else if (format === 'distribution') {
      pdfBuffer = await generateDistributionPDF(job);
      filename = `peninsula_health_doctor_assignments_${job.startDate}_${timestamp}.pdf`;
    } else if (format === 'management') {
      pdfBuffer = await generateManagementPDF(job);
      filename = `peninsula_health_shift_management_${job.startDate}_${timestamp}.pdf`;
    } else {
      return res.status(400).json({
        success: false,
        error: `PDF format '${format}' not supported`,
        availableFormats: ['all', 'distribution', 'management']
      });
    }
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export PDF',
      message: error.message
    });
  }
});

// PDF generation helper functions
const PDFDocument = require('pdfkit');
const htmlPdf = require('html-pdf-node');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');
const puppeteer = require('puppeteer');

// Peninsula Health brand colors
const COLORS = {
  primary: '#17a2b8',        // Teal - primary brand color
  secondary: '#343a40',      // Navy - secondary brand color  
  success: '#28a745',        // Green - success states
  warning: '#ffc107',        // Orange - warning/vacant
  danger: '#dc3545',         // Red - error states
  lightGray: '#f8f9fa',      // Light background
  mediumGray: '#6c757d',     // Medium gray text
  darkGray: '#343a40',       // Dark text
  white: '#ffffff',
  vacantOrange: '#fd7e14'    // Orange for vacant shifts
};

function addPeninsulaHealthHeader(doc, title) {
  // Peninsula Health branding and header with enhanced styling
  // Background header area
  doc.rect(0, 0, doc.page.width, 120)
     .fillColor(COLORS.primary)
     .fill();
     
  // Main title
  doc.fontSize(28)
     .fillColor(COLORS.white)
     .font('Helvetica-Bold')
     .text('PENINSULA HEALTH', 60, 25);
     
  // Subtitle
  doc.fontSize(16)
     .fillColor(COLORS.white)
     .font('Helvetica')
     .text('Hospital Scheduling System', 60, 55);
     
  // Document title
  doc.fontSize(18)
     .fillColor(COLORS.white)
     .font('Helvetica-Bold')
     .text(title, 60, 80);
     
  // Generation timestamp in corner
  doc.fontSize(10)
     .fillColor(COLORS.white)
     .font('Helvetica')
     .text(`Generated: ${new Date().toLocaleString('en-AU')}`, doc.page.width - 200, 30);
     
  return 140; // Return Y position for content to start
}

function addPeninsulaHealthFooter(doc, pageNumber = 1) {
  const pageHeight = doc.page.height;
  const pageWidth = doc.page.width;
  
  // Footer background
  doc.rect(0, pageHeight - 50, pageWidth, 50)
     .fillColor(COLORS.lightGray)
     .fill();
     
  // Footer line
  doc.strokeColor(COLORS.primary)
     .lineWidth(2)
     .moveTo(0, pageHeight - 50)
     .lineTo(pageWidth, pageHeight - 50)
     .stroke();
     
  // Footer text
  doc.fontSize(10)
     .fillColor(COLORS.darkGray)
     .font('Helvetica')
     .text(`Peninsula Health Hospital Scheduling System`, 60, pageHeight - 35)
     .text(`Page ${pageNumber}`, pageWidth - 120, pageHeight - 35)
     .fontSize(8)
     .fillColor(COLORS.mediumGray)
     .text(`Confidential Document - For Internal Use Only`, 60, pageHeight - 20);
}

// Extremely simple table function
function addSimpleTable(doc, csvData, startY) {
  try {
    const lines = csvData.split('\n');
    const dataLines = lines.filter(line => line.trim() && !line.startsWith('#')).slice(0, 25); // Limit to first 25 rows
    
    if (dataLines.length === 0) return;
    
    let yPos = startY;
    const rowHeight = 16;
    const colWidth = 70;
    
    dataLines.forEach((line, index) => {
      const cells = line.split(',').map(cell => cell.replace(/"/g, '').trim());
      let xPos = 50;
      
      // Only show first 12 columns to fit on A3 landscape
      cells.slice(0, 12).forEach((cell, cellIndex) => {
        const fontSize = index === 0 ? 9 : 8;
        const textColor = index === 0 ? '#17a2b8' : '#333333';
        const font = index === 0 ? 'Helvetica-Bold' : 'Helvetica';
        
        // Truncate long text
        const displayText = cell.length > 10 ? cell.substring(0, 7) + '...' : cell;
        
        doc.fontSize(fontSize)
           .fillColor(textColor)
           .font(font)
           .text(displayText, xPos, yPos);
           
        xPos += colWidth;
      });
      
      yPos += rowHeight;
      
      // Stop if we're getting too close to bottom of page
      if (yPos > 600) return;
    });
    
  } catch (error) {
    console.error('Error adding simple table:', error);
  }
}

async function generateCompletePDF(job) {
  try {
    console.log('=== PDF GENERATION DEBUG ===');
    console.log('Job ID:', job.jobId);
    console.log('Start Date:', job.startDate);
    console.log('Has calendar view:', !!job.outputs?.calendar_view);
    console.log('Calendar view length:', job.outputs?.calendar_view?.length || 0);
    
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      autoFirstPage: true
    });
    const chunks = [];
    
    return new Promise((resolve, reject) => {
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        console.log('Simple PDF generated, size:', Buffer.concat(chunks).length);
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      
      // Add title
      doc.fontSize(18)
         .fillColor('black')
         .text('Peninsula Health', 50, 50);
         
      doc.fontSize(16)
         .text('Complete Roster Report', 50, 75);
         
      doc.fontSize(12)
         .text(`Period: ${job.startDate} (${job.weeks} weeks)`, 50, 100);
         
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 50, 120);
      
      // Add a separator line
      doc.moveTo(50, 140)
         .lineTo(550, 140)
         .stroke();
      
      // Add table data
      if (job.outputs?.calendar_view) {
        const lines = job.outputs.calendar_view.split('\n').filter(line => line.trim() && !line.startsWith('#')).slice(0, 25);
        let yPos = 160;
        
        lines.forEach((line, index) => {
          if (yPos > 750) return; // Stop before page end
          
          const cells = line.split(',').map(cell => cell.replace(/\"/g, '').trim());
          
          if (index === 0) {
            // Header row
            doc.fontSize(10)
               .fillColor('blue')
               .text('HEADER: ' + cells.slice(0, 5).join(' | '), 50, yPos);
          } else {
            // Data row
            doc.fontSize(9)
               .fillColor('black')
               .text(cells.slice(0, 8).join(' | '), 50, yPos);
          }
          
          yPos += 15;
        });
      } else {
        doc.fontSize(12)
           .fillColor('red')
           .text('No calendar data available', 50, 160);
      }
      
      // Add footer
      doc.fontSize(10)
         .fillColor('gray')
         .text('Peninsula Health Hospital Scheduling System', 50, 750);
      
      doc.end();
    });
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// New jsPDF-based PDF generation function
async function generateCompletePDFWithJsPDF(job) {
  try {
    console.log('=== jsPDF GENERATION ===');
    console.log('Job ID:', job.jobId);
    console.log('Start Date:', job.startDate);
    console.log('Has calendar view:', !!job.outputs?.calendar_view);
    console.log('Calendar view length:', job.outputs?.calendar_view?.length || 0);
    
    // Create new jsPDF document in landscape A3
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3'
    });
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(23, 162, 184); // Peninsula Health teal
    doc.text('PENINSULA HEALTH', 20, 30);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Complete Roster Report', 20, 45);
    
    doc.setFontSize(12);
    doc.text(`Period: ${job.startDate} (${job.weeks} weeks)`, 20, 60);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 70);
    
    // Add table if calendar data exists
    if (job.outputs?.calendar_view) {
      const lines = job.outputs.calendar_view.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length > 0) {
        // Parse CSV data for table
        const headers = lines[0].split(',').map(cell => cell.replace(/"/g, '').trim()).slice(0, 15);
        const rows = lines.slice(1, 31).map(line => {
          return line.split(',').map(cell => cell.replace(/"/g, '').trim()).slice(0, 15);
        });
        
        // Add table manually instead of autoTable
        let yPos = 85;
        const cellHeight = 8;
        const colWidth = (doc.internal.pageSize.width - 40) / headers.length;
        
        // Draw headers
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(23, 162, 184); // Teal background
        doc.rect(20, yPos, doc.internal.pageSize.width - 40, cellHeight, 'F');
        
        headers.forEach((header, index) => {
          doc.text(header.substring(0, 12), 22 + (index * colWidth), yPos + 5);
        });
        
        yPos += cellHeight;
        
        // Draw data rows
        rows.forEach((row, rowIndex) => {
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
          
          // Alternating row colors
          if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 249, 250); // Light gray
            doc.rect(20, yPos, doc.internal.pageSize.width - 40, cellHeight, 'F');
          }
          
          row.forEach((cell, cellIndex) => {
            // Highlight VACANT cells
            if (cell === 'VACANT') {
              doc.setFillColor(253, 126, 20); // Orange
              doc.rect(20 + (cellIndex * colWidth), yPos, colWidth, cellHeight, 'F');
              doc.setTextColor(255, 255, 255);
            } else {
              doc.setTextColor(0, 0, 0);
            }
            
            doc.text(cell.substring(0, 10), 22 + (cellIndex * colWidth), yPos + 5);
          });
          
          yPos += cellHeight;
          
          // Check if we need a new page
          if (yPos > doc.internal.pageSize.height - 50) {
            doc.addPage();
            yPos = 30;
          }
        });
        
        console.log('jsPDF table created successfully');
      } else {
        doc.text('No roster data available', 20, 85);
      }
    } else {
      doc.text('No calendar data available', 20, 85);
    }
    
    // Add footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Peninsula Health Hospital Scheduling System - Confidential', 20, doc.internal.pageSize.height - 10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }
    
    // Convert to buffer
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    console.log('jsPDF generated successfully, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generating jsPDF:', error);
    throw error;
  }
}

function generateRosterHTML(job) {
  const calendarLines = job.outputs.calendar_view ? job.outputs.calendar_view.split('\n').filter(line => line.trim() && !line.startsWith('#')).slice(0, 30) : [];
  
  const tableRows = calendarLines.map((line, index) => {
    const cells = line.split(',').map(cell => cell.replace(/"/g, '').trim());
    const isHeader = index === 0;
    
    const rowCells = cells.slice(0, 12).map(cell => {
      const cellClass = isHeader ? 'header-cell' : (cell === 'VACANT' ? 'vacant-cell' : 'data-cell');
      return `<td class="${cellClass}">${cell}</td>`;
    }).join('');
    
    return `<tr>${rowCells}</tr>`;
  }).join('');
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { 
        font-family: Arial, sans-serif; 
        margin: 0; 
        padding: 20px;
        font-size: 10px;
      }
      .header { 
        text-align: center; 
        margin-bottom: 30px;
        background-color: #17a2b8;
        color: white;
        padding: 15px;
        border-radius: 5px;
      }
      .header h1 { 
        margin: 0; 
        font-size: 24px; 
      }
      .header p { 
        margin: 5px 0 0 0; 
        font-size: 14px; 
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        margin-top: 20px;
      }
      .header-cell {
        background-color: #17a2b8;
        color: white;
        font-weight: bold;
        padding: 8px;
        border: 1px solid #ddd;
        text-align: center;
        font-size: 9px;
      }
      .data-cell {
        padding: 6px;
        border: 1px solid #ddd;
        font-size: 8px;
      }
      .vacant-cell {
        padding: 6px;
        border: 1px solid #ddd;
        background-color: #fd7e14;
        color: white;
        font-weight: bold;
        font-size: 8px;
      }
      tr:nth-child(even) .data-cell {
        background-color: #f8f9fa;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Peninsula Health - Complete Roster Report</h1>
      <p>Period: ${job.startDate} (${job.weeks} weeks) | Generated: ${new Date().toLocaleDateString()}</p>
    </div>
    
    <h2 style="color: #17a2b8; margin-bottom: 10px;">Daily Shift Schedule</h2>
    
    <table>
      ${tableRows}
    </table>
  </body>
  </html>
  `;
}

// Enhanced HTML-to-PDF generation using Puppeteer for better formatting
async function generateEnhancedPDF(job) {
  try {
    console.log('=== ENHANCED PDF GENERATION WITH PUPPETEER ===');
    console.log('Job ID:', job.jobId);
    console.log('Start Date:', job.startDate);
    console.log('Has outputs:', !!job.outputs);
    
    // Generate comprehensive HTML with proper styling
    const html = generateEnhancedRosterHTML(job);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set the HTML content
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });
    
    // Generate PDF with high quality settings
    const pdfBuffer = await page.pdf({
      format: 'A3',
      landscape: true,
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 5px 0; text-align: center; color: #666;">
          <span>Peninsula Health Hospital Scheduling System</span>
        </div>
      `,
      footerTemplate: `
        <div style="width: 100%; font-size: 8px; padding: 5px 0; display: flex; justify-content: space-between; color: #666;">
          <span style="margin-left: 20px;">Confidential Document - For Internal Use Only</span>
          <span style="margin-right: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `
    });
    
    await browser.close();
    
    console.log('Enhanced PDF generated successfully, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    console.error('Error generating enhanced PDF:', error);
    throw error;
  }
}

// Generate comprehensive HTML for the roster with professional styling
function generateEnhancedRosterHTML(job) {
  // Parse the roster data
  const calendarLines = job.outputs?.calendar_view ? 
    job.outputs.calendar_view.split('\n').filter(line => line.trim() && !line.startsWith('#')) : [];
  
  const statsLines = job.outputs?.statistics ? 
    job.outputs.statistics.split('\n').filter(line => line.trim() && !line.startsWith('#')) : [];
  
  const distributionLines = job.outputs?.distribution ? 
    job.outputs.distribution.split('\n').filter(line => line.trim() && !line.startsWith('#')) : [];
  
  // Generate calendar table HTML
  const calendarTableHTML = generateTableHTML(calendarLines, 'calendar');
  
  // Generate statistics table HTML
  const statsTableHTML = generateTableHTML(statsLines, 'stats');
  
  // Generate distribution tables HTML (split by doctor)
  const distributionHTML = generateDistributionHTML(distributionLines);
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      @page {
        size: A3 landscape;
        margin: 15mm 10mm;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
        line-height: 1.4;
        background: white;
      }
      
      .header-section {
        background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
        color: white;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 25px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        page-break-inside: avoid;
      }
      
      .header-section h1 {
        font-size: 28px;
        font-weight: 600;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }
      
      .header-section .subtitle {
        font-size: 18px;
        opacity: 0.95;
        margin-bottom: 12px;
      }
      
      .header-info {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        opacity: 0.9;
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,0.3);
      }
      
      .section {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }
      
      .section-title {
        color: #17a2b8;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 2px solid #17a2b8;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .stat-card {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 6px;
        border-left: 4px solid #17a2b8;
      }
      
      .stat-card .label {
        color: #666;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 5px;
      }
      
      .stat-card .value {
        color: #333;
        font-size: 24px;
        font-weight: 600;
      }
      
      table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 20px;
        font-size: 11px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border-radius: 6px;
        overflow: hidden;
      }
      
      th {
        background: #17a2b8;
        color: white;
        font-weight: 600;
        padding: 10px 8px;
        text-align: left;
        font-size: 12px;
        letter-spacing: 0.3px;
        position: sticky;
        top: 0;
      }
      
      td {
        padding: 8px;
        border-bottom: 1px solid #e9ecef;
        background: white;
      }
      
      tr:nth-child(even) td {
        background: #f8f9fa;
      }
      
      tr:hover td {
        background: #e9ecef;
      }
      
      .vacant-cell {
        background: #fd7e14 !important;
        color: white;
        font-weight: 600;
        text-align: center;
      }
      
      .weekend-cell {
        background: #fff3cd !important;
      }
      
      .doctor-cell {
        font-weight: 500;
        color: #495057;
      }
      
      .shift-location {
        background: #d1ecf1;
        color: #0c5460;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        display: inline-block;
      }
      
      .color-legend {
        display: flex;
        gap: 20px;
        margin: 15px 0;
        padding: 10px;
        background: #f8f9fa;
        border-radius: 6px;
        font-size: 12px;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .legend-color {
        width: 20px;
        height: 20px;
        border-radius: 3px;
        border: 1px solid #dee2e6;
      }
      
      .summary-box {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 25px;
        border: 1px solid #dee2e6;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }
      
      .summary-item {
        text-align: center;
      }
      
      .summary-label {
        color: #666;
        font-size: 12px;
        margin-bottom: 5px;
      }
      
      .summary-value {
        color: #17a2b8;
        font-size: 28px;
        font-weight: 700;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      @media print {
        .section {
          page-break-inside: avoid;
        }
        
        .header-section {
          page-break-after: avoid;
        }
      }
    </style>
  </head>
  <body>
    <div class="header-section">
      <h1>PENINSULA HEALTH</h1>
      <div class="subtitle">Hospital Scheduling System</div>
      <div class="subtitle">Complete Roster Report</div>
      <div class="header-info">
        <span>Roster Period: ${job.startDate || 'Not specified'} (${job.weeks || 13} weeks)</span>
        <span>Status: ${job.status || 'Complete'}</span>
        <span>Generated: ${new Date().toLocaleString('en-AU')}</span>
      </div>
    </div>
    
    ${generateSummaryHTML(job)}
    
    <div class="section">
      <h2 class="section-title">Roster Statistics</h2>
      ${statsTableHTML}
    </div>
    
    <div class="section">
      <h2 class="section-title">Calendar View - Shift Assignments</h2>
      <div class="color-legend">
        <div class="legend-item">
          <div class="legend-color" style="background: #fd7e14;"></div>
          <span>Vacant Shifts</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #17a2b8;"></div>
          <span>Covered/Assigned</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #28a745;"></div>
          <span>Leadership Roles</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #6c757d;"></div>
          <span>Admin/Management</span>
        </div>
        <div class="legend-item">
          <div class="legend-color" style="background: #dc3545;"></div>
          <span>Emergency/Urgent</span>
        </div>
      </div>
      <p style="margin-bottom: 15px; color: #666; font-size: 12px;">
        Complete daily roster showing all shifts and assigned medical staff
      </p>
      ${calendarTableHTML}
    </div>
    
    <div class="page-break"></div>
    
    <div class="section">
      <h2 class="section-title">Individual Doctor Assignments</h2>
      <p style="margin-bottom: 15px; color: #666; font-size: 12px;">
        Individual schedules showing each doctor's assigned shifts across the roster period
      </p>
      ${distributionHTML}
    </div>
  </body>
  </html>
  `;
}

// Helper function to generate HTML tables from CSV data
function generateTableHTML(lines, type = 'default') {
  if (!lines || lines.length === 0) {
    return '<p style="color: #666;">No data available</p>';
  }
  
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = lines.slice(1);
  
  let tableHTML = '<table>';
  
  // Generate headers
  tableHTML += '<thead><tr>';
  headers.forEach(header => {
    tableHTML += `<th>${header}</th>`;
  });
  tableHTML += '</tr></thead>';
  
  // Generate body
  tableHTML += '<tbody>';
  rows.forEach(row => {
    const cells = row.split(',').map(c => c.replace(/"/g, '').trim());
    tableHTML += '<tr>';
    cells.forEach((cell, index) => {
      let cellClass = '';
      if (cell === 'VACANT') {
        cellClass = 'vacant-cell';
      } else if (type === 'calendar' && index === 0) {
        // Date column
        cellClass = 'doctor-cell';
      }
      tableHTML += `<td class="${cellClass}">${cell || ''}</td>`;
    });
    tableHTML += '</tr>';
  });
  tableHTML += '</tbody>';
  tableHTML += '</table>';
  
  return tableHTML;
}

// Generate distribution HTML with individual doctor tables
function generateDistributionHTML(lines) {
  if (!lines || lines.length === 0) {
    return '<p style="color: #666;">No distribution data available</p>';
  }
  
  // Group data by doctor
  const doctorData = {};
  let currentDoctor = null;
  
  lines.forEach(line => {
    if (line.startsWith('Doctor:')) {
      currentDoctor = line.replace('Doctor:', '').trim();
      doctorData[currentDoctor] = [];
    } else if (currentDoctor && line.trim()) {
      doctorData[currentDoctor].push(line);
    }
  });
  
  // If no doctor grouping found, treat as single table
  if (Object.keys(doctorData).length === 0) {
    return generateTableHTML(lines, 'distribution');
  }
  
  // Generate tables for each doctor
  let html = '';
  Object.entries(doctorData).forEach(([doctor, data]) => {
    html += `
      <div style="margin-bottom: 25px;">
        <h3 style="color: #17a2b8; font-size: 16px; margin-bottom: 10px;">Dr. ${doctor}</h3>
        ${generateTableHTML(data, 'distribution')}
      </div>
    `;
  });
  
  return html;
}

// Generate summary statistics HTML
function generateSummaryHTML(job) {
  // Extract key metrics from the job data
  const totalShifts = job.outputs?.calendar_view ? 
    (job.outputs.calendar_view.match(/VACANT/g) || []).length +
    (job.outputs.calendar_view.split('\n').length - 1) * 10 : 0;
  
  const vacantShifts = job.outputs?.calendar_view ? 
    (job.outputs.calendar_view.match(/VACANT/g) || []).length : 0;
  
  const coverageRate = totalShifts > 0 ? 
    ((totalShifts - vacantShifts) / totalShifts * 100).toFixed(1) : 0;
  
  return `
    <div class="summary-box">
      <h2 style="color: #17a2b8; margin-bottom: 15px;">Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total Shifts</div>
          <div class="summary-value">${totalShifts}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Vacant Shifts</div>
          <div class="summary-value" style="color: #fd7e14;">${vacantShifts}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Coverage Rate</div>
          <div class="summary-value">${coverageRate}%</div>
        </div>
      </div>
    </div>
  `;
}

async function generateDistributionPDF(job) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A3',
        layout: 'landscape',
        margin: 50
      });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Simple header
      doc.fontSize(18)
         .fillColor('#17a2b8')
         .font('Helvetica-Bold')
         .text('Peninsula Health - Doctor Assignment Distribution', 50, 50);
         
      doc.fontSize(12)
         .fillColor('#666666')
         .text(`Period: ${job.startDate} (${job.weeks} weeks) | Generated: ${new Date().toLocaleDateString()}`, 50, 80);
      
      // Simple table for distribution data
      const distributionCsv = createDistributionFormat(job);
      if (distributionCsv) {
        doc.fontSize(14)
           .fillColor('#17a2b8')
           .font('Helvetica-Bold')
           .text('Individual Doctor Schedules', 50, 120);
           
        addSimpleTable(doc, distributionCsv, 150);
      }
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

async function generateManagementPDF(job) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A3',
        layout: 'landscape',
        margin: 50
      });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Simple header
      doc.fontSize(18)
         .fillColor('#17a2b8')
         .font('Helvetica-Bold')
         .text('Peninsula Health - Shift Management Overview', 50, 50);
         
      doc.fontSize(12)
         .fillColor('#666666')
         .text(`Analysis Period: ${job.startDate} (${job.weeks} weeks) | Generated: ${new Date().toLocaleDateString()}`, 50, 80);
      
      // Simple table for management data
      const managementCsv = createManagementFormat(job);
      if (managementCsv) {
        doc.fontSize(14)
           .fillColor('#17a2b8')
           .font('Helvetica-Bold')
           .text('Daily Coverage Analysis', 50, 120);
           
        addSimpleTable(doc, managementCsv, 150);
      }
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

function addTableToPDF(doc, csvData, startY) {
  try {
    const lines = csvData.split('\n');
    let yPos = startY;
    const rowHeight = 22;
    
    // Skip comment lines (starting with #)
    const dataLines = lines.filter(line => line.trim() && !line.startsWith('#'));
    if (dataLines.length === 0) return;
    
    // Calculate column widths based on A3 landscape
    const headers = dataLines[0].split(',').map(cell => cell.replace(/"/g, '').trim());
    const totalCols = Math.min(headers.length, 15); // Increase to 15 columns for A3
    const availableWidth = doc.page.width - 120; // Account for margins
    const colWidth = availableWidth / totalCols;
    
    // Track current page number for footers
    let currentPage = 1;
    
    dataLines.forEach((line, index) => {
      // Check if we need a new page - more conservative margin
      if (yPos > doc.page.height - 100) {
        addPeninsulaHealthFooter(doc, currentPage);
        doc.addPage();
        currentPage++;
        yPos = addPeninsulaHealthHeader(doc, 'Continued...') + 20;
      }
      
      const cells = line.split(',').map(cell => cell.replace(/"/g, '').trim());
      let xPos = 60;
      
      // Row background for alternating colors
      let rowBgColor = COLORS.white;
      if (index === 0) {
        // Header row
        rowBgColor = COLORS.primary;
      } else if (index % 2 === 0) {
        // Alternating row
        rowBgColor = COLORS.lightGray;
      }
      
      // Only draw background if we have content
      if (cells.some(cell => cell.trim())) {
        // Draw row background
        doc.rect(xPos, yPos, availableWidth, rowHeight)
           .fillColor(rowBgColor)
           .fill();
        
        // Add subtle border
        doc.rect(xPos, yPos, availableWidth, rowHeight)
           .strokeColor(COLORS.mediumGray)
           .lineWidth(0.3)
           .stroke();
        
        cells.forEach((cell, cellIndex) => {
          if (cellIndex < totalCols) {
            // Determine cell styling
            let fontSize, fillColor, font;
            if (index === 0) {
              // Header row
              fontSize = 9;
              fillColor = COLORS.white;
              font = 'Helvetica-Bold';
            } else {
              // Data rows
              fontSize = 8;
              fillColor = getCellColor(cell);
              font = 'Helvetica';
            }
            
            // Add cell border
            doc.rect(xPos, yPos, colWidth, rowHeight)
               .strokeColor(COLORS.mediumGray)
               .lineWidth(0.2)
               .stroke();
            
            // Add cell text with proper truncation
            const maxLength = Math.floor(colWidth / 5); // Better character width estimate
            const displayText = cell.length > maxLength ? cell.substring(0, maxLength - 3) + '...' : cell;
            
            if (displayText.trim()) {
              doc.fontSize(fontSize)
                 .fillColor(fillColor)
                 .font(font)
                 .text(displayText, xPos + 2, yPos + 4, { 
                   width: colWidth - 4,
                   height: rowHeight - 4,
                   align: index === 0 ? 'center' : 'left'
                 });
            }
               
            xPos += colWidth;
          }
        });
        
        yPos += rowHeight;
      }
    });
    
    // Add final footer if we're still on a page with content
    if (yPos > startY + rowHeight) {
      addPeninsulaHealthFooter(doc, currentPage);
    }
    
  } catch (error) {
    console.error('Error adding table to PDF:', error);
    doc.fontSize(12)
       .fillColor(COLORS.danger)
       .font('Helvetica-Bold')
       .text('Error displaying table data', 60, startY);
  }
}

// Compact table function that avoids blank pages
function addCompactTableToPDF(doc, csvData, startY, tableTitle) {
  try {
    const lines = csvData.split('\n');
    let yPos = startY;
    const rowHeight = 20;
    
    // Skip comment lines and empty lines
    const dataLines = lines.filter(line => line.trim() && !line.startsWith('#'));
    if (dataLines.length === 0) return yPos;
    
    // Calculate optimal column layout
    const headers = dataLines[0].split(',').map(cell => cell.replace(/"/g, '').trim());
    const maxCols = 12; // Limit for readability
    const totalCols = Math.min(headers.length, maxCols);
    const pageWidth = doc.page.width - 120;
    const colWidth = pageWidth / totalCols;
    
    let pageNum = 1;
    let rowsOnCurrentPage = 0;
    const maxRowsPerPage = Math.floor((doc.page.height - startY - 100) / rowHeight);
    
    dataLines.forEach((line, index) => {
      // Check if we need a new page
      if (rowsOnCurrentPage >= maxRowsPerPage && index > 0) {
        // Add footer to current page
        addPeninsulaHealthFooter(doc, pageNum);
        
        // Start new page
        doc.addPage();
        pageNum++;
        yPos = addPeninsulaHealthHeader(doc, `${tableTitle} (continued)`) + 20;
        rowsOnCurrentPage = 0;
      }
      
      const cells = line.split(',').map(cell => cell.replace(/"/g, '').trim());
      
      // Skip completely empty rows
      if (!cells.some(cell => cell.trim())) return;
      
      let xPos = 60;
      
      // Row styling
      const isHeader = index === 0;
      const bgColor = isHeader ? COLORS.primary : (index % 2 === 0 ? COLORS.lightGray : COLORS.white);
      
      // Draw row background
      doc.rect(xPos, yPos, pageWidth, rowHeight)
         .fillColor(bgColor)
         .fill();
      
      // Draw row border
      doc.rect(xPos, yPos, pageWidth, rowHeight)
         .strokeColor(COLORS.mediumGray)
         .lineWidth(0.5)
         .stroke();
      
      // Add cells
      cells.slice(0, totalCols).forEach((cell, cellIndex) => {
        // Cell border
        doc.rect(xPos, yPos, colWidth, rowHeight)
           .strokeColor(COLORS.mediumGray)
           .lineWidth(0.3)
           .stroke();
        
        // Cell text
        if (cell.trim()) {
          const fontSize = isHeader ? 9 : 8;
          const textColor = isHeader ? COLORS.white : getCellColor(cell);
          const font = isHeader ? 'Helvetica-Bold' : 'Helvetica';
          
          // Truncate text to fit
          const maxChars = Math.floor(colWidth / (fontSize * 0.6));
          const displayText = cell.length > maxChars ? cell.substring(0, maxChars - 3) + '...' : cell;
          
          doc.fontSize(fontSize)
             .fillColor(textColor)
             .font(font)
             .text(displayText, xPos + 3, yPos + 3, {
               width: colWidth - 6,
               height: rowHeight - 6,
               align: isHeader ? 'center' : 'left'
             });
        }
        
        xPos += colWidth;
      });
      
      yPos += rowHeight;
      rowsOnCurrentPage++;
    });
    
    // Add final footer
    addPeninsulaHealthFooter(doc, pageNum);
    
    return yPos;
    
  } catch (error) {
    console.error('Error adding compact table to PDF:', error);
    doc.fontSize(12)
       .fillColor(COLORS.danger)
       .text('Error displaying table data', 60, startY);
    return startY + 20;
  }
}

// Helper function to determine cell color based on content
function getCellColor(cellContent) {
  const content = cellContent.toUpperCase();
  
  // Color coding for different shift types and statuses
  if (content.includes('VACANT') || content === 'VACANT') {
    return COLORS.vacantOrange;
  }
  if (content.includes('COVERED') || content.includes('ASSIGNED')) {
    return COLORS.success;
  }
  if (content.includes('ADMIN') || content.includes('MANAGEMENT')) {
    return COLORS.secondary;
  }
  if (content.includes('EMERGENCY') || content.includes('URGENT')) {
    return COLORS.danger;
  }
  if (content.includes('LEADERSHIP') || content.includes('SENIOR')) {
    return COLORS.primary;
  }
  
  return COLORS.darkGray; // Default text color
}

// Add color legend for better understanding
function addColorLegend(doc, x, y) {
  doc.fontSize(12)
     .fillColor(COLORS.darkGray)
     .font('Helvetica-Bold')
     .text('Color Legend:', x, y);
     
  const legendItems = [
    { color: COLORS.vacantOrange, text: 'Vacant Shifts' },
    { color: COLORS.success, text: 'Covered/Assigned' },
    { color: COLORS.primary, text: 'Leadership Roles' },
    { color: COLORS.secondary, text: 'Admin/Management' },
    { color: COLORS.danger, text: 'Emergency/Urgent' }
  ];
  
  let legendX = x + 120;
  legendItems.forEach((item, index) => {
    // Color box
    doc.rect(legendX, y - 2, 12, 12)
       .fillColor(item.color)
       .fill()
       .strokeColor(COLORS.mediumGray)
       .lineWidth(0.5)
       .stroke();
       
    // Label
    doc.fontSize(9)
       .fillColor(COLORS.darkGray)
       .font('Helvetica')
       .text(item.text, legendX + 15, y, { width: 100 });
       
    legendX += 150;
    if (index === 2) { // Start new row after 3 items
      legendX = x + 120;
      y += 15;
    }
  });
}

// Get available shift types for adding
app.get('/api/roster/shift-types', async (req, res) => {
  try {
    const config = await loadConfig();
    
    const shiftTypes = {
      clinical_shifts: config.shifts?.clinical_shifts || [],
      non_clinical_shifts: config.shifts?.non_clinical_shifts || []
    };
    
    res.json({
      success: true,
      data: shiftTypes
    });
  } catch (error) {
    console.error('Error fetching shift types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch shift types',
      message: error.message
    });
  }
});

// Helper function to parse assignments from calendar view
function parseAssignmentsFromCalendarView(calendarView) {
  const assignments = new Map();
  if (!calendarView) return assignments;
  
  const lines = calendarView.trim().split('\n');
  if (lines.length < 2) return assignments;
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const shifts = headers.slice(1); // Remove 'Date' column
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
    const date = row[0];
    
    shifts.forEach((shift, index) => {
      const doctorName = row[index + 1] || '';
      const key = `${date}-${shift}`;
      assignments.set(key, doctorName);
    });
  }
  
  return assignments;
}

// Helper functions for shift management
function addShiftToCalendarView(calendarLines, date, shiftType, location, doctorName = 'VACANT') {
  try {
    if (calendarLines.length < 2) return null;
    
    const headers = calendarLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const shiftName = `${location} ${shiftType}`;
    
    // Check if shift type already exists in headers
    let shiftColumnIndex = headers.indexOf(shiftName);
    
    if (shiftColumnIndex === -1) {
      // Add new column to headers
      headers.push(shiftName);
      calendarLines[0] = headers.map(h => `"${h}"`).join(',');
      shiftColumnIndex = headers.length - 1;
    }
    
    // Find or add the date row
    let dateRowIndex = -1;
    for (let i = 1; i < calendarLines.length; i++) {
      const row = calendarLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      if (row[0] === date) {
        dateRowIndex = i;
        break;
      }
    }
    
    if (dateRowIndex === -1) {
      // Add new date row
      const newRow = new Array(headers.length).fill('');
      newRow[0] = date;
      newRow[shiftColumnIndex] = doctorName;
      calendarLines.push(newRow.map(cell => `"${cell}"`).join(','));
    } else {
      // Update existing date row
      const row = calendarLines[dateRowIndex].split(',').map(cell => cell.trim().replace(/"/g, ''));
      // Ensure row has enough columns
      while (row.length < headers.length) {
        row.push('');
      }
      row[shiftColumnIndex] = doctorName;
      calendarLines[dateRowIndex] = row.map(cell => `"${cell}"`).join(',');
    }
    
    return calendarLines.join('\n');
  } catch (error) {
    console.error('Error adding shift to calendar view:', error);
    return null;
  }
}

function addShiftToDoctorView(doctorLines, date, shiftType, location, doctorName = null) {
  try {
    if (doctorLines.length < 2 || !doctorName || doctorName === 'VACANT') {
      return doctorLines.join('\n'); // Return unchanged if no doctor assigned
    }
    
    const headers = doctorLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // Check if doctor exists in headers
    let doctorColumnIndex = headers.indexOf(doctorName);
    
    if (doctorColumnIndex === -1) {
      // Add new doctor column to headers
      headers.push(doctorName);
      doctorLines[0] = headers.map(h => `"${h}"`).join(',');
      doctorColumnIndex = headers.length - 1;
    }
    
    // Find or add the date row
    let dateRowIndex = -1;
    for (let i = 1; i < doctorLines.length; i++) {
      const row = doctorLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      if (row[0] === date) {
        dateRowIndex = i;
        break;
      }
    }
    
    const shiftName = `${location} ${shiftType}`;
    
    if (dateRowIndex === -1) {
      // Add new date row
      const newRow = new Array(headers.length).fill('OFF');
      newRow[0] = date;
      newRow[doctorColumnIndex] = shiftName;
      doctorLines.push(newRow.map(cell => `"${cell}"`).join(','));
    } else {
      // Update existing date row
      const row = doctorLines[dateRowIndex].split(',').map(cell => cell.trim().replace(/"/g, ''));
      // Ensure row has enough columns
      while (row.length < headers.length) {
        row.push('OFF');
      }
      
      // Check if doctor already has a shift on this date
      if (row[doctorColumnIndex] && row[doctorColumnIndex] !== 'OFF') {
        console.warn(`Doctor ${doctorName} already has assignment on ${date}: ${row[doctorColumnIndex]}`);
        return null; // Conflict detected
      }
      
      row[doctorColumnIndex] = shiftName;
      doctorLines[dateRowIndex] = row.map(cell => `"${cell}"`).join(',');
    }
    
    return doctorLines.join('\n');
  } catch (error) {
    console.error('Error adding shift to doctor view:', error);
    return null;
  }
}

function removeShiftFromCalendarView(calendarLines, date, shiftType, location) {
  try {
    if (calendarLines.length < 2) return null;
    
    const headers = calendarLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const shiftName = `${location} ${shiftType}`;
    const shiftColumnIndex = headers.indexOf(shiftName);
    
    if (shiftColumnIndex === -1) {
      console.warn(`Shift type ${shiftName} not found in calendar headers`);
      return calendarLines.join('\n'); // Return unchanged if shift not found
    }
    
    // Find the date row
    for (let i = 1; i < calendarLines.length; i++) {
      const row = calendarLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      if (row[0] === date) {
        // Clear the shift assignment
        row[shiftColumnIndex] = '';
        calendarLines[i] = row.map(cell => `"${cell}"`).join(',');
        break;
      }
    }
    
    return calendarLines.join('\n');
  } catch (error) {
    console.error('Error removing shift from calendar view:', error);
    return null;
  }
}

function removeShiftFromDoctorView(doctorLines, date, shiftType, location) {
  try {
    if (doctorLines.length < 2) return null;
    
    const shiftName = `${location} ${shiftType}`;
    
    // Find the date row and remove the shift assignment from whichever doctor has it
    for (let i = 1; i < doctorLines.length; i++) {
      const row = doctorLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      if (row[0] === date) {
        // Find which doctor has this shift and clear it
        for (let j = 1; j < row.length; j++) {
          if (row[j] === shiftName) {
            row[j] = 'OFF';
            doctorLines[i] = row.map(cell => `"${cell}"`).join(',');
            break;
          }
        }
        break;
      }
    }
    
    return doctorLines.join('\n');
  } catch (error) {
    console.error('Error removing shift from doctor view:', error);
    return null;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Peninsula Health Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['doctor_management', 'roster_generation']
  });
});

// Debug endpoint to force config reload
app.post('/api/debug/reload-config', async (req, res) => {
  try {
    console.log('🔄 Forcing config reload...');
    configCache = null;
    lastModified = null;
    await loadConfig();
    
    const doctorCount = Object.keys(configCache.DOCTORS || {}).filter(key => !key.startsWith('_')).length;
    
    res.json({
      success: true,
      message: 'Config reloaded successfully',
      doctorCount,
      watcherStatus: fileWatcher ? 'active' : 'inactive',
      isReloading: isReloading,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error reloading config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload config',
      message: error.message
    });
  }
});

// Debug endpoint to check file watcher status
app.get('/api/debug/watcher-status', (req, res) => {
  res.json({
    success: true,
    data: {
      watcherActive: fileWatcher ? true : false,
      isReloading: isReloading,
      configPath: CONFIG_FILE_PATH,
      lastModified: lastModified ? lastModified.toISOString() : null,
      cacheStatus: configCache ? 'loaded' : 'empty',
      doctorCount: configCache ? Object.keys(configCache.DOCTORS || {}).filter(key => !key.startsWith('_')).length : 0
    },
    timestamp: new Date().toISOString()
  });
});

// ======================
// CONFIG API ENDPOINTS
// ======================

// Get configuration (filtered for frontend)
app.get('/api/config', async (req, res) => {
  try {
    const config = await loadConfig();
    
    // Return only the sections that can be edited in frontend
    const filteredConfig = {
      shifts: {
        clinical_shifts: config.shifts?.clinical_shifts || [],
        non_clinical_shifts: config.shifts?.non_clinical_shifts || []
      },
      shift_penalties: config.shift_penalties || {},
      medical_quotes_and_facts: {
        quotes: config.medical_quotes_and_facts?.quotes || []
      }
    };
    
    res.json({
      success: true,
      data: filteredConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading config for frontend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration',
      message: error.message
    });
  }
});

// Update configuration
app.put('/api/config', async (req, res) => {
  try {
    const newConfigData = req.body;
    
    // Validate that only allowed sections are being updated
    const allowedSections = ['shifts', 'shift_penalties', 'medical_quotes_and_facts'];
    const providedSections = Object.keys(newConfigData);
    const invalidSections = providedSections.filter(section => !allowedSections.includes(section));
    
    if (invalidSections.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration sections',
        message: `Only these sections can be updated: ${allowedSections.join(', ')}. Invalid: ${invalidSections.join(', ')}`
      });
    }
    
    // Load current config
    const currentConfig = await loadConfig();
    
    // Merge new data with current config (only updating allowed sections)
    const updatedConfig = { ...currentConfig };
    
    // Update shifts section
    if (newConfigData.shifts) {
      if (!updatedConfig.shifts) updatedConfig.shifts = {};
      
      if (newConfigData.shifts.clinical_shifts) {
        // Validate clinical shifts structure
        if (!Array.isArray(newConfigData.shifts.clinical_shifts)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid clinical shifts format',
            message: 'Clinical shifts must be an array'
          });
        }
        updatedConfig.shifts.clinical_shifts = newConfigData.shifts.clinical_shifts;
      }
      
      if (newConfigData.shifts.non_clinical_shifts) {
        // Validate non-clinical shifts structure
        if (!Array.isArray(newConfigData.shifts.non_clinical_shifts)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid non-clinical shifts format',
            message: 'Non-clinical shifts must be an array'
          });
        }
        updatedConfig.shifts.non_clinical_shifts = newConfigData.shifts.non_clinical_shifts;
      }
    }
    
    // Update shift penalties section
    if (newConfigData.shift_penalties) {
      if (typeof newConfigData.shift_penalties !== 'object' || Array.isArray(newConfigData.shift_penalties)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid shift penalties format',
          message: 'Shift penalties must be an object'
        });
      }
      
      // Validate penalty values are numbers
      for (const [key, value] of Object.entries(newConfigData.shift_penalties)) {
        if (key.startsWith('_')) continue; // Skip documentation fields
        if (typeof value !== 'number' || value < 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid penalty value',
            message: `Penalty value for ${key} must be a non-negative number, got: ${value}`
          });
        }
      }
      
      updatedConfig.shift_penalties = newConfigData.shift_penalties;
    }
    
    // Update medical quotes and facts section
    if (newConfigData.medical_quotes_and_facts) {
      if (!updatedConfig.medical_quotes_and_facts) {
        updatedConfig.medical_quotes_and_facts = {};
      }
      
      if (newConfigData.medical_quotes_and_facts.quotes) {
        // Validate quotes structure
        if (!Array.isArray(newConfigData.medical_quotes_and_facts.quotes)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid quotes format',
            message: 'Quotes must be an array of strings'
          });
        }
        
        // Validate each quote is a non-empty string
        for (let i = 0; i < newConfigData.medical_quotes_and_facts.quotes.length; i++) {
          const quote = newConfigData.medical_quotes_and_facts.quotes[i];
          if (typeof quote !== 'string' || quote.trim().length === 0) {
            return res.status(400).json({
              success: false,
              error: 'Invalid quote format',
              message: `Quote at index ${i} must be a non-empty string`
            });
          }
        }
        
        updatedConfig.medical_quotes_and_facts.quotes = newConfigData.medical_quotes_and_facts.quotes;
      }
    }
    
    // Save the updated configuration
    await saveConfig(updatedConfig);
    
    console.log('✅ Configuration updated successfully via API');
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      message: error.message
    });
  }
});

// Get configuration defaults for a specific section
app.get('/api/config/defaults/:section', async (req, res) => {
  try {
    const { section } = req.params;
    
    // Define default values for each section
    const defaults = {
      'shifts.clinical_shifts': [{
        location: "Frankston",
        type: "New Clinical Shift",
        time: "AM",
        start_time: "08:00",
        end_time: "18:00",
        duration_hours: 10,
        weighting: 0,
        is_leadership: false,
        requires_experience: false,
        description: "New clinical shift description"
      }],
      'shifts.non_clinical_shifts': [{
        location: "Frankston",
        type: "New Admin Shift",
        time: "Admin",
        start_time: "08:00",
        end_time: "16:00",
        duration_hours: 8,
        weighting: 0,
        is_leadership: false,
        requires_experience: false,
        description: "New administrative shift",
        weekdays_only: true
      }],
      'shift_penalties': {
        undesirable_shift_base: 1.5,
        leadership_role: 1.0,
        friday_pm: 1.5,
        rosebud_general: 0.5,
        blue_role: 1.5,
        green_role: 1.5,
        brown_role: 0.5
      },
      'medical_quotes_and_facts.quotes': [
        "The art of medicine consists in amusing the patient while nature cures the disease. - Voltaire",
        "Medicine is not only a science; it is also an art. - Paracelsus"
      ]
    };
    
    const defaultData = defaults[section];
    if (!defaultData) {
      return res.status(404).json({
        success: false,
        error: 'Section not found',
        message: `No defaults available for section: ${section}`
      });
    }
    
    res.json({
      success: true,
      data: defaultData,
      section: section
    });
    
  } catch (error) {
    console.error('Error getting config defaults:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration defaults',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// ======================
// DOCTOR UNAVAILABILITY API ENDPOINTS
// ======================

// Get doctor unavailability periods
app.get('/api/doctors/:doctorId/unavailability', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const config = await loadConfig();
    
    const doctor = config.DOCTORS[doctorId];
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    const unavailabilityPeriods = doctor.unavailability || [];
    
    res.json({
      success: true,
      data: unavailabilityPeriods,
      doctorId,
      doctorName: doctor.name || doctorId
    });
  } catch (error) {
    console.error('Error fetching unavailability periods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unavailability periods',
      message: error.message
    });
  }
});

// Add new unavailability period for a doctor
app.post('/api/doctors/:doctorId/unavailability', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { start_date, end_date, reason, type = 'unavailable' } = req.body;
    
    // Validate required fields
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }
    
    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date cannot be after end date'
      });
    }
    
    const config = await loadConfig();
    
    const doctor = config.DOCTORS[doctorId];
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    // Initialize unavailability array if it doesn't exist
    if (!doctor.unavailability) {
      doctor.unavailability = [];
    }
    
    // Create new unavailability period
    const newUnavailability = {
      id: uuidv4(),
      start_date: start_date,
      end_date: end_date,
      reason: reason || 'Not specified',
      type: type,
      created_at: new Date().toISOString()
    };
    
    doctor.unavailability.push(newUnavailability);
    
    // Save updated config
    await saveConfig(config);
    
    res.json({
      success: true,
      data: newUnavailability,
      message: 'Unavailability period added successfully'
    });
  } catch (error) {
    console.error('Error adding unavailability period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add unavailability period',
      message: error.message
    });
  }
});

// Update existing unavailability period
app.put('/api/doctors/:doctorId/unavailability/:unavailabilityId', async (req, res) => {
  try {
    const { doctorId, unavailabilityId } = req.params;
    const { start_date, end_date, reason, type } = req.body;
    
    const config = await loadConfig();
    
    const doctor = config.DOCTORS[doctorId];
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    if (!doctor.unavailability) {
      return res.status(404).json({
        success: false,
        error: 'No unavailability periods found for this doctor'
      });
    }
    
    const unavailabilityIndex = doctor.unavailability.findIndex(u => u.id === unavailabilityId);
    if (unavailabilityIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Unavailability period not found'
      });
    }
    
    // Validate dates if provided
    if (start_date || end_date) {
      const startDate = new Date(start_date || doctor.unavailability[unavailabilityIndex].start_date);
      const endDate = new Date(end_date || doctor.unavailability[unavailabilityIndex].end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
      
      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date cannot be after end date'
        });
      }
    }
    
    // Update the unavailability period
    const updatedUnavailability = {
      ...doctor.unavailability[unavailabilityIndex],
      ...(start_date && { start_date }),
      ...(end_date && { end_date }),
      ...(reason && { reason }),
      ...(type && { type }),
      updated_at: new Date().toISOString()
    };
    
    doctor.unavailability[unavailabilityIndex] = updatedUnavailability;
    
    // Save updated config
    await saveConfig(config);
    
    res.json({
      success: true,
      data: updatedUnavailability,
      message: 'Unavailability period updated successfully'
    });
  } catch (error) {
    console.error('Error updating unavailability period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update unavailability period',
      message: error.message
    });
  }
});

// Delete unavailability period
app.delete('/api/doctors/:doctorId/unavailability/:unavailabilityId', async (req, res) => {
  try {
    const { doctorId, unavailabilityId } = req.params;
    
    const config = await loadConfig();
    
    const doctor = config.DOCTORS[doctorId];
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    if (!doctor.unavailability) {
      return res.status(404).json({
        success: false,
        error: 'No unavailability periods found for this doctor'
      });
    }
    
    const unavailabilityIndex = doctor.unavailability.findIndex(u => u.id === unavailabilityId);
    if (unavailabilityIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Unavailability period not found'
      });
    }
    
    const removedUnavailability = doctor.unavailability.splice(unavailabilityIndex, 1)[0];
    
    // Save updated config
    await saveConfig(config);
    
    res.json({
      success: true,
      data: removedUnavailability,
      message: 'Unavailability period deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting unavailability period:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete unavailability period',
      message: error.message
    });
  }
});

// Get all doctors with their unavailability periods (for management overview)
app.get('/api/unavailability/overview', async (req, res) => {
  try {
    const config = await loadConfig();
    const doctorsWithUnavailability = [];
    
    for (const [doctorId, doctorData] of Object.entries(config.DOCTORS)) {
      if (doctorId.startsWith('_')) continue; // Skip metadata entries
      
      const unavailabilityPeriods = doctorData.unavailability || [];
      
      doctorsWithUnavailability.push({
        id: doctorId,
        name: doctorData.name || doctorId,
        status: doctorData.status || 'active',
        unavailability_count: unavailabilityPeriods.length,
        upcoming_unavailability: unavailabilityPeriods.filter(period => {
          const startDate = new Date(period.start_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return startDate >= today;
        }).length,
        current_unavailability: unavailabilityPeriods.filter(period => {
          const startDate = new Date(period.start_date);
          const endDate = new Date(period.end_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return startDate <= today && endDate >= today;
        }).length
      });
    }
    
    res.json({
      success: true,
      data: doctorsWithUnavailability,
      total_doctors: doctorsWithUnavailability.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching unavailability overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch unavailability overview',
      message: error.message
    });
  }
});

// Check doctor availability for a specific date range
app.post('/api/doctors/:doctorId/check-availability', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { start_date, end_date } = req.body;
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }
    
    const config = await loadConfig();
    
    const doctor = config.DOCTORS[doctorId];
    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }
    
    const checkStartDate = new Date(start_date);
    const checkEndDate = new Date(end_date);
    
    if (isNaN(checkStartDate.getTime()) || isNaN(checkEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const unavailabilityPeriods = doctor.unavailability || [];
    
    const conflictingPeriods = unavailabilityPeriods.filter(period => {
      const periodStart = new Date(period.start_date);
      const periodEnd = new Date(period.end_date);
      
      // Check for date range overlap
      return (
        (checkStartDate >= periodStart && checkStartDate <= periodEnd) ||
        (checkEndDate >= periodStart && checkEndDate <= periodEnd) ||
        (checkStartDate <= periodStart && checkEndDate >= periodEnd)
      );
    });
    
    res.json({
      success: true,
      data: {
        is_available: conflictingPeriods.length === 0,
        conflicting_periods: conflictingPeriods,
        doctor_id: doctorId,
        doctor_name: doctor.name || doctorId,
        check_start_date: start_date,
        check_end_date: end_date
      }
    });
  } catch (error) {
    console.error('Error checking doctor availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check doctor availability',
      message: error.message
    });
  }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Start server
async function startServer() {
  try {
    // Clear temporary files that might interfere with config
    await clearTempFiles();
    
    // Load config on startup
    await loadConfig();
    console.log('✅ Configuration loaded successfully');
    
    // Load persistent roster jobs
    await loadJobs();
    
    // Initialize file system watcher for config.json
    initializeConfigWatcher();
    
    app.listen(PORT, () => {
      console.log(`🚀 Shift Happens Backend API running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`👥 Doctors API: http://localhost:${PORT}/api/doctors`);
      console.log(`💬 Quotes API: http://localhost:${PORT}/api/quotes`);
      console.log(`🔍 Config file watcher is monitoring: ${CONFIG_FILE_PATH}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();