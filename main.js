const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
// More reliable development detection - check if we're in an asar file
const isDev = !(__dirname.includes('app.asar') || process.env.NODE_ENV === 'production');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

// Helper function to detect system Node.js
function detectSystemNode() {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    
    // Try to find system Node.js
    const whichCommand = process.platform === 'win32' ? 'where' : 'which';
    const nodeCheck = spawn(whichCommand, ['node'], { stdio: 'pipe' });
    
    let nodePath = '';
    nodeCheck.stdout.on('data', (data) => {
      nodePath += data.toString().trim();
    });
    
    nodeCheck.on('close', (code) => {
      if (code === 0 && nodePath) {
        // Verify Node.js is working
        const nodeTest = spawn(nodePath, ['--version'], { stdio: 'pipe' });
        let version = '';
        
        nodeTest.stdout.on('data', (data) => {
          version += data.toString();
        });
        
        nodeTest.on('close', (testCode) => {
          if (testCode === 0 && version.includes('v')) {
            console.log(`System Node.js detected: ${nodePath} (${version.trim()})`);
            resolve(nodePath);
          } else {
            console.log('System Node.js found but not working properly');
            resolve(null);
          }
        });
        
        nodeTest.on('error', () => {
          console.log('System Node.js test failed');
          resolve(null);
        });
      } else {
        console.log('System Node.js not found in PATH');
        resolve(null);
      }
    });
    
    nodeCheck.on('error', () => {
      console.log('Failed to check for system Node.js');
      resolve(null);
    });
  });
}

// Helper function to verify backend connectivity
function verifyBackendConnectivity(port = 3001, timeout = 3000) {
  return new Promise((resolve) => {
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/api/health',
      method: 'GET',
      timeout: timeout
    };

    const req = http.request(options, (res) => {
      console.log(`Backend health check response: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    });

    req.on('error', (error) => {
      console.log('Backend health check error:', error.code || error.message);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('Backend health check timeout');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Helper function to check if port is available
function checkPortAvailability(port = 3001) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();

    server.listen(port, () => {
      server.once('close', () => {
        console.log(`Port ${port} is available`);
        resolve(true);
      });
      server.close();
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${port} is already in use`);
        resolve(false);
      } else {
        console.log(`Port check error for ${port}:`, error.code || error.message);
        resolve(false);
      }
    });
  });
}

// Backend keep-alive monitoring
let keepAliveInterval = null;
let lastHealthCheck = 0;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const HEALTH_CHECK_INTERVAL = 10000; // 10 seconds

function startBackendKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  console.log('🔄 Starting backend keep-alive monitoring...');
  
  keepAliveInterval = setInterval(async () => {
    if (isShuttingDown) {
      return;
    }

    // Check if process is still alive
    if (!backendProcess || backendProcess.killed) {
      console.log('❌ Backend process not alive during keep-alive check');
      consecutiveFailures++;
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log('💀 Backend process dead - attempting restart');
        attemptBackendRestart('keep-alive detected dead process');
      }
      return;
    }

    // Check process responsiveness
    try {
      const healthStatus = await verifyBackendConnectivity(3001, 5000);
      const now = Date.now();
      
      if (healthStatus) {
        lastHealthCheck = now;
        consecutiveFailures = 0;
        console.log(`✅ Backend keep-alive check passed (PID: ${backendProcess.pid})`);
      } else {
        consecutiveFailures++;
        const timeSinceLastHealth = now - lastHealthCheck;
        
        console.log(`❌ Backend keep-alive check failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
        console.log(`⏱️  Time since last successful health check: ${timeSinceLastHealth}ms`);
        
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log('🚨 Backend unresponsive - attempting restart');
          attemptBackendRestart('keep-alive detected unresponsive backend');
        }
      }
    } catch (error) {
      consecutiveFailures++;
      console.log(`❌ Backend keep-alive check error: ${error.message}`);
      
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.log('🚨 Backend keep-alive errors - attempting restart');
        attemptBackendRestart(`keep-alive errors: ${error.message}`);
      }
    }
  }, HEALTH_CHECK_INTERVAL);
}

function stopBackendKeepAlive() {
  if (keepAliveInterval) {
    console.log('🛑 Stopping backend keep-alive monitoring...');
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

function attemptBackendRestart(reason) {
  if (isShuttingDown || restartAttempts >= MAX_RESTART_ATTEMPTS) {
    return;
  }

  console.log(`🔄 Attempting backend restart due to: ${reason}`);
  
  // Stop keep-alive during restart
  stopBackendKeepAlive();
  
  // Kill existing process if still alive
  if (backendProcess && !backendProcess.killed) {
    console.log('🔪 Killing existing backend process...');
    backendProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if still alive
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        console.log('🔨 Force killing backend process...');
        backendProcess.kill('SIGKILL');
      }
    }, 5000);
  }

  // Reset consecutive failures
  consecutiveFailures = 0;
  
  // Restart after a delay
  setTimeout(() => {
    if (!isShuttingDown) {
      startBackendServer().then(() => {
        startBackendKeepAlive();
      }).catch((error) => {
        console.error('Backend restart failed:', error);
      });
    }
  }, 3000); // 3 second delay
}

// Create crash log directory
const crashLogDir = path.join(os.homedir(), 'Peninsula-Health-Data', 'logs');
const crashLogFile = path.join(crashLogDir, 'crash.log');

// Ensure log directory exists
try {
  fs.mkdirSync(crashLogDir, { recursive: true });
} catch (error) {
  console.error('Failed to create log directory:', error);
}

// Log startup immediately with direct file writing
try {
  const startupLog = `
=== MAIN.JS STARTUP DEBUG ===
Timestamp: ${new Date().toISOString()}
__dirname: ${__dirname}
NODE_ENV: ${process.env.NODE_ENV}
isDev (calculated): ${!(__dirname.includes('app.asar') || process.env.NODE_ENV === 'production')}
`;
  
  // Write directly to crash log file
  fs.appendFileSync(crashLogFile, startupLog);
  
  // Also console log
  console.log('=== MAIN.JS STARTUP ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('__dirname:', __dirname);
  console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
  
  // Check if unpacked directory exists
  if (__dirname.includes('app.asar')) {
    const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
    const unpackedLog = `
Unpacked path: ${unpackedPath}
Unpacked exists: ${fs.existsSync(unpackedPath)}
`;
    fs.appendFileSync(crashLogFile, unpackedLog);
    
    console.log('Unpacked path would be:', unpackedPath);
    console.log('Unpacked path exists:', fs.existsSync(unpackedPath));
    if (fs.existsSync(unpackedPath)) {
      const backendPath = path.join(unpackedPath, 'backend', 'src', 'server.js');
      const backendLog = `Backend path: ${backendPath}\nBackend exists: ${fs.existsSync(backendPath)}\n`;
      fs.appendFileSync(crashLogFile, backendLog);
      
      console.log('Backend path would be:', backendPath);
      console.log('Backend file exists:', fs.existsSync(backendPath));
    }
  }
} catch (startupError) {
  try {
    fs.appendFileSync(crashLogFile, `\nEARLY STARTUP ERROR: ${startupError.toString()}\n`);
  } catch (e) {
    // Can't even write to file
  }
  console.error('Early startup error:', startupError);
}

// Enhanced logging function
function logCrash(type, error, context = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `
=== CRASH REPORT ===
Timestamp: ${timestamp}
Type: ${type}
Context: ${context}
Process PID: ${process.pid}
Platform: ${process.platform}
Arch: ${process.arch}
Electron Version: ${process.versions.electron}
Node Version: ${process.versions.node}
Chrome Version: ${process.versions.chrome}

Error Details:
${error.stack || error.toString()}

Environment:
${JSON.stringify(process.env, null, 2)}

===================
`;
  
  try {
    fs.appendFileSync(crashLogFile, logEntry);
    console.error('Crash logged to:', crashLogFile);
  } catch (logError) {
    console.error('Failed to write crash log:', logError);
  }
  
  // Also log to console
  console.error(`[${type}] ${timestamp}:`, error);
}

// Override console methods to capture all output
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.error = function(...args) {
  originalConsoleError.apply(console, args);
  try {
    const logEntry = `[ERROR ${new Date().toISOString()}] ${args.join(' ')}\n`;
    fs.appendFileSync(crashLogFile, logEntry);
  } catch (e) {
    originalConsoleError('Failed to log error:', e);
  }
};

console.log = function(...args) {
  originalConsoleLog.apply(console, args);
  if (isDev) {
    try {
      const logEntry = `[LOG ${new Date().toISOString()}] ${args.join(' ')}\n`;
      fs.appendFileSync(crashLogFile, logEntry);
    } catch (e) {
      originalConsoleError('Failed to log message:', e);
    }
  }
};

// Keep a global reference of the window object
let mainWindow;
let backendProcess;
let processStartTime = 0;
let isShuttingDown = false;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 3;
let isStarting = false;
let startupAttempts = 0;
const MAX_STARTUP_ATTEMPTS = 3;

// Simplified instance management - rely only on Electron's built-in mechanism

function createWindow() {
  try {
    console.log('Creating main window...');
    
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 700,
      icon: path.join(__dirname, 'assets', 'icon.png'), // We'll add this later
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true
      },
      titleBarStyle: 'default',
      show: false // Don't show until ready
    });

    // Load the React app
    let startUrl;
    if (isDev) {
      startUrl = 'http://localhost:3002';
    } else {
      // In production, frontend files are in the asar archive
      startUrl = `file://${path.join(__dirname, 'frontend/build/index.html')}`;
    }
    
    console.log('Loading URL:', startUrl);
    console.log('Current __dirname:', __dirname);
    
    mainWindow.loadURL(startUrl);

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      mainWindow.show();
    });

    // Handle load failures
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      const error = new Error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
      logCrash('WINDOW_LOAD_FAILED', error, `URL: ${validatedURL}`);
    });

    // Handle renderer process crashes
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      const error = new Error(`Renderer process crashed: ${details.reason}`);
      logCrash('RENDERER_CRASH', error, `Exit code: ${details.exitCode}`);
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Emitted when the window is closed
    mainWindow.on('closed', () => {
      console.log('Main window closed');
      mainWindow = null;
    });

    // Development tools
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
    
    console.log('Main window created successfully');
    
  } catch (error) {
    logCrash('WINDOW_CREATION_FAILED', error, 'Failed to create main window');
    throw error;
  }
}

function startBackendServer() {
  return new Promise(async (resolve, reject) => {
    // Prevent multiple simultaneous startup attempts
    if (isStarting) {
      console.log('Backend startup already in progress');
      resolve();
      return;
    }

    // Check startup attempt limit
    if (startupAttempts >= MAX_STARTUP_ATTEMPTS) {
      console.error(`Maximum startup attempts (${MAX_STARTUP_ATTEMPTS}) exceeded. Aborting.`);
      reject(new Error('Too many startup attempts'));
      return;
    }

    // Check if backend process is already running
    if (backendProcess && !backendProcess.killed) {
      console.log('Backend server already running');
      resolve();
      return;
    }

    isStarting = true;
    startupAttempts++;
    
    // Check if port 3001 is available
    console.log('Checking port availability...');
    const portAvailable = await checkPortAvailability(3001);
    if (!portAvailable) {
      console.log('Port 3001 is already in use - this might be from a previous backend instance');
      // Try to connect to see if it's our backend
      const existingBackend = await verifyBackendConnectivity(3001, 2000);
      if (existingBackend) {
        console.log('Found existing backend on port 3001, considering startup successful');
        isStarting = false;
        resolve();
        return;
      } else {
        console.log('Port 3001 occupied by non-backend service, will attempt to start anyway');
      }
    }
    
    // Handle packaged vs development paths
    let serverPath;
    if (isDev) {
      serverPath = path.join(__dirname, 'backend', 'src', 'server.js');
    } else {
      // In packaged app, backend files are unpacked (not in asar)
      // They're in app.asar.unpacked directory
      const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
      serverPath = path.join(unpackedPath, 'backend', 'src', 'server.js');
      console.log('Production mode - using unpacked backend path:', serverPath);
    }
    
    // Verify server file exists (skip check in asar as it may not work)
    if (isDev && !fs.existsSync(serverPath)) {
      console.error(`Server file not found: ${serverPath}`);
      isStarting = false;
      reject(new Error('Server file not found'));
      return;
    }
    
    // Detect best Node.js executable to use
    console.log('Detecting Node.js executable...');
    let nodePath;
    let useElectronNode = false;
    
    try {
      if (isDev) {
        // In development, prefer system Node.js
        nodePath = 'node';
        console.log('Development mode: using system Node.js');
      } else {
        // In production, try system Node.js first, fallback to Electron
        const systemNode = await detectSystemNode();
        if (systemNode) {
          nodePath = systemNode;
          console.log('Production mode: using detected system Node.js');
        } else {
          // Fallback to Electron's Node.js
          nodePath = process.execPath;
          useElectronNode = true;
          console.log('Production mode: falling back to Electron Node.js');
        }
      }
    } catch (error) {
      console.error('Error detecting Node.js, using fallback:', error);
      nodePath = isDev ? 'node' : process.execPath;
      useElectronNode = !isDev;
    }
    
    console.log(`Starting backend server (attempt ${startupAttempts}/${MAX_STARTUP_ATTEMPTS})`);
    console.log(`Node path: ${nodePath}`);
    console.log(`Server path: ${serverPath}`);
    console.log(`Current __dirname: ${__dirname}`);
    console.log(`Is development: ${isDev ? 'true' : 'false'}`);
    
    try {
      let spawnArgs;
      let spawnEnv;
      
      // Set up spawn arguments and environment
      spawnArgs = [serverPath];
      
      // Common environment variables
      const baseEnv = {
        NODE_ENV: 'production',
        ELECTRON_MODE: 'true',
        PORT: '3001',
        BACKEND_ONLY: 'true'
      };
      
      if (isDev) {
        // Development: use system Node.js with minimal environment
        spawnEnv = Object.assign({}, process.env, baseEnv);
        console.log('Using development environment (system Node.js)');
      } else {
        // Production: configure for either system Node.js or Electron Node.js
        const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
        const unpackedNodeModules = path.join(unpackedPath, 'node_modules');
        
        spawnEnv = Object.assign({}, process.env, baseEnv, {
          NODE_PATH: unpackedNodeModules  // Point to unpacked node_modules
        });
        
        if (useElectronNode) {
          // Using Electron's Node.js - need ELECTRON_RUN_AS_NODE
          spawnEnv.ELECTRON_RUN_AS_NODE = '1';
          console.log('Using Electron Node.js with ELECTRON_RUN_AS_NODE=1');
        } else {
          // Using system Node.js - no special flags needed
          console.log('Using system Node.js in production mode');
        }
      }
      
      // Set working directory for the backend process
      let spawnOptions = {
        stdio: 'pipe',
        env: spawnEnv
      };
      
      if (!isDev) {
        // In production, set cwd to the unpacked directory so Node.js can find node_modules
        const unpackedPath = __dirname.replace('app.asar', 'app.asar.unpacked');
        spawnOptions.cwd = unpackedPath;
        console.log(`Setting backend working directory to: ${unpackedPath}`);
      }

      console.log(`Spawn args: ${JSON.stringify(spawnArgs)}`);
      console.log(`ELECTRON_RUN_AS_NODE: ${spawnEnv.ELECTRON_RUN_AS_NODE || 'not set'}`);
      console.log(`NODE_PATH: ${spawnEnv.NODE_PATH || 'not set'}`);
      console.log(`Working directory: ${spawnOptions.cwd || 'not set'}`);
      
      console.log('About to spawn backend process...');
      processStartTime = Date.now();
      backendProcess = spawn(nodePath, spawnArgs, spawnOptions);
      console.log('Backend process spawned with PID:', backendProcess.pid);
      console.log('Process start time recorded:', new Date(processStartTime).toISOString());

      let resolved = false;
      let startupTimer;

      const cleanup = () => {
        isStarting = false;
        if (startupTimer) clearTimeout(startupTimer);
      };

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Backend:', output);
        
        // Multiple success indicators - any of these means backend started successfully
        const successIndicators = [
          '🚀 Shift Happens Backend API running on port',
          'Backend API running on port',
          'Health check: http://localhost:3001',
          'Server running on port 3001' // Keep old pattern as fallback
        ];
        
        const isSuccess = successIndicators.some(indicator => output.includes(indicator));
        
        if (isSuccess && !resolved) {
          console.log('Backend startup success detected:', output.trim());
          // Add slight delay to allow backend to fully initialize
          setTimeout(() => {
            verifyBackendConnectivity().then((isConnected) => {
              if (isConnected) {
                console.log('✅ Backend connectivity verified - starting keep-alive monitoring');
                lastHealthCheck = Date.now(); // Initialize health check timestamp
                startBackendKeepAlive(); // Start monitoring
                resolved = true;
                cleanup();
                resolve();
              } else {
                console.log('⚠️ Backend started but not responding to health check, starting keep-alive anyway');
                lastHealthCheck = Date.now();
                startBackendKeepAlive(); // Start monitoring even if initial check failed
                resolved = true;
                cleanup();
                resolve(); // Continue anyway, backend might need more time
              }
            }).catch(() => {
              console.log('⚠️ Backend connectivity check failed, starting keep-alive anyway');
              lastHealthCheck = Date.now();
              startBackendKeepAlive(); // Start monitoring even if connectivity check errored
              resolved = true;
              cleanup();
              resolve(); // Continue anyway
            });
          }, 1000); // 1 second delay for initialization
        }
      });

      backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('Backend Error:', error);
        
        // Enhanced error detection and logging
        if (error.includes('MODULE_NOT_FOUND')) {
          console.error('Module not found error - check NODE_PATH and dependencies');
          console.error('NODE_PATH:', spawnEnv.NODE_PATH);
          console.error('Working directory:', spawnOptions.cwd);
        }
        
        // If it's a critical error, don't keep trying
        if (error.includes('EADDRINUSE') || error.includes('EACCES') || error.includes('MODULE_NOT_FOUND')) {
          if (!resolved) {
            resolved = true;
            cleanup();
            
            // Log detailed error information
            const errorDetails = {
              error: error,
              nodePath: nodePath,
              useElectronNode: useElectronNode,
              serverPath: serverPath,
              NODE_PATH: spawnEnv.NODE_PATH,
              workingDir: spawnOptions.cwd
            };
            console.error('Backend startup failed with details:', JSON.stringify(errorDetails, null, 2));
            
            reject(new Error(`Backend startup failed: ${error}`));
          }
        }
      });

      backendProcess.on('close', (code, signal) => {
        const exitReason = signal ? `signal ${signal}` : `code ${code}`;
        const uptime = Date.now() - processStartTime;
        
        console.log(`🔴 Backend process exited with ${exitReason} after ${uptime}ms uptime`);
        
        // Analyze exit code for specific issues
        let exitAnalysis = 'Unknown exit reason';
        let isCrash = false;
        
        if (signal) {
          switch (signal) {
            case 'SIGTERM':
              exitAnalysis = 'Terminated by system/parent process';
              break;
            case 'SIGINT':
              exitAnalysis = 'Interrupted by user/system';
              break;
            case 'SIGKILL':
              exitAnalysis = 'Force killed by system (possibly out of memory)';
              isCrash = true;
              break;
            case 'SIGPIPE':
              exitAnalysis = 'Broken pipe - likely communication error';
              isCrash = true;
              break;
            case 'SIGSEGV':
              exitAnalysis = 'Segmentation fault - critical error';
              isCrash = true;
              break;
            default:
              exitAnalysis = `Signal ${signal} - unexpected termination`;
              isCrash = true;
          }
        } else if (code !== null) {
          switch (code) {
            case 0:
              exitAnalysis = 'Clean exit - process completed normally';
              break;
            case 1:
              exitAnalysis = 'General error - unhandled exception or error';
              isCrash = true;
              break;
            case 2:
              exitAnalysis = 'Misuse of shell builtins';
              isCrash = true;
              break;
            case 126:
              exitAnalysis = 'Command cannot execute - permission issue';
              isCrash = true;
              break;
            case 127:
              exitAnalysis = 'Command not found - missing dependency';
              isCrash = true;
              break;
            case 130:
              exitAnalysis = 'Process terminated by SIGINT (Ctrl+C)';
              break;
            case 137:
              exitAnalysis = 'Process killed by SIGKILL (usually OOM killer)';
              isCrash = true;
              break;
            case 139:
              exitAnalysis = 'Process terminated by SIGSEGV (segmentation fault)';
              isCrash = true;
              break;
            default:
              exitAnalysis = `Exit code ${code} - abnormal termination`;
              isCrash = code !== 0;
          }
        }
        
        // Log comprehensive exit information
        const exitDetails = {
          pid: backendProcess?.pid,
          exitCode: code,
          signal: signal,
          uptime: `${uptime}ms`,
          exitReason: exitReason,
          analysis: exitAnalysis,
          isCrash: isCrash,
          expectedShutdown: isShuttingDown,
          timestamp: new Date().toISOString(),
          processStartTime: new Date(processStartTime).toISOString(),
          nodePath: nodePath,
          serverPath: serverPath,
          workingDirectory: spawnOptions?.cwd,
          environment: {
            NODE_PATH: spawnEnv?.NODE_PATH,
            PORT: spawnEnv?.PORT,
            NODE_ENV: spawnEnv?.NODE_ENV,
            ELECTRON_MODE: spawnEnv?.ELECTRON_MODE
          }
        };
        
        console.log('📊 Backend Exit Analysis:', JSON.stringify(exitDetails, null, 2));
        
        // Log to crash file for permanent record
        logCrash('BACKEND_PROCESS_EXIT', new Error(`Backend exited: ${exitAnalysis}`), JSON.stringify(exitDetails, null, 2));
        
        backendProcess = null;
        
        // Only attempt restart if this wasn't an expected shutdown and we have attempts left
        if (!isShuttingDown && resolved && restartAttempts < MAX_RESTART_ATTEMPTS) {
          console.log(`Backend crashed unexpectedly, attempting restart (${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})`);
          restartAttempts++;
          
          // Restart after a delay
          setTimeout(() => {
            if (!isShuttingDown) {
              console.log('Restarting backend server...');
              startBackendServer().catch((error) => {
                console.error('Backend restart failed:', error);
              });
            }
          }, 2000);
        } else if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
          console.error(`Backend has crashed ${MAX_RESTART_ATTEMPTS} times, giving up on restarts`);
        }
        
        if (!resolved) {
          cleanup();
        }
      });

      backendProcess.on('error', (error) => {
        logCrash('BACKEND_SPAWN_ERROR', error, `Server path: ${serverPath}, Node path: ${nodePath}`);
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(error);
        }
      });

      // Timeout after 20 seconds (increased for debugging)
      startupTimer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          console.log('Backend startup timeout - continuing anyway');
          resolve(); // Continue even if we don't get the expected message
        }
      }, 20000);

    } catch (error) {
      console.error('Error spawning backend process:', error);
      isStarting = false;
      reject(error);
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'Peninsula Health',
      submenu: [
        { label: 'About Peninsula Health Shift Happens', role: 'about' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Disable macOS automatic restart on crash
app.setLoginItemSettings({
  openAtLogin: false,
  openAsHidden: false,
  path: process.execPath,
  args: []
});

// Tell macOS not to restore this app automatically
if (process.platform === 'darwin') {
  // Disable automatic app restoration on macOS
  app.setActivationPolicy('regular');
}

// Multiple prevention strategies (simplified for debugging)
console.log('Starting Peninsula Health app...');

// Strategy: Only use Electron single instance lock (skip custom lock file for now)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Focusing existing window.');
  app.quit();
} else {
  // Handle uncaught exceptions to prevent crashes from triggering restarts
  process.on('uncaughtException', (error) => {
    logCrash('UNCAUGHT_EXCEPTION', error, 'Main process uncaught exception');
    setTimeout(() => process.exit(1), 1000); // Give time for log to write
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logCrash('UNHANDLED_REJECTION', error, `Promise rejection - reason: ${reason}`);
    setTimeout(() => process.exit(1), 1000); // Give time for log to write
  });

  app.on('second-instance', () => {
    console.log('Second instance attempt blocked.');
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // App event handlers
  app.whenReady().then(async () => {
    console.log('Peninsula Health app starting - creating window immediately');
    
    // Create the main window immediately without any backend dependency
    createWindow();
    createMenu();
    
    console.log('Window and menu created, app should be visible now');
    
    // Start the backend server
    console.log('Starting backend server...');
    startBackendServer().then(() => {
      console.log('Backend server started successfully');
    }).catch((error) => {
      console.error('Failed to start backend server:', error);
      // Continue anyway - frontend can still work in offline mode
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }).catch((error) => {
    console.error('Fatal startup error:', error);
    process.exit(1);
  });
}

app.on('window-all-closed', () => {
  // Set shutdown flag to prevent backend restarts
  isShuttingDown = true;
  
  // Stop keep-alive monitoring
  stopBackendKeepAlive();
  
  // Kill backend process gracefully
  if (backendProcess && !backendProcess.killed) {
    console.log('Shutting down backend process...');
    backendProcess.kill('SIGTERM');
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Set shutdown flag to prevent backend restarts
  isShuttingDown = true;
  
  // Stop keep-alive monitoring
  stopBackendKeepAlive();
  
  // Ensure backend process is terminated
  if (backendProcess && !backendProcess.killed) {
    console.log('Force terminating backend process...');
    backendProcess.kill('SIGTERM');
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});