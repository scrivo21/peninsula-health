const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';
const TIMEOUT = 30000;

class E2ETestRunner {
  constructor() {
    this.browser = null;
    this.page = null;
    this.backendProcess = null;
    this.frontendProcess = null;
    this.results = [];
  }

  async setup() {
    console.log('🚀 Starting backend and frontend servers...');
    
    this.backendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'backend'),
      detached: false,
      stdio: 'pipe'
    });

    this.frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      detached: false,
      stdio: 'pipe',
      env: { ...process.env, BROWSER: 'none' }
    });

    await this.waitForServer(BACKEND_URL + '/api/health', 'Backend');
    await this.waitForServer(FRONTEND_URL, 'Frontend');

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
  }

  async waitForServer(url, name) {
    console.log(`⏳ Waiting for ${name} server...`);
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.log(`✅ ${name} server is ready`);
          return;
        }
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error(`${name} server failed to start`);
  }

  async teardown() {
    if (this.browser) await this.browser.close();
    if (this.backendProcess) this.backendProcess.kill();
    if (this.frontendProcess) this.frontendProcess.kill();
  }

  async runTest(name, testFn) {
    try {
      await testFn();
      this.results.push({ name, status: 'PASSED', error: null });
      console.log(`✅ ${name}`);
    } catch (error) {
      this.results.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  async testFrontendLoads() {
    await this.page.goto(FRONTEND_URL);
    
    // Wait for the app to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if page loaded (should redirect to login page)
    const title = await this.page.title();
    if (!title.includes('Peninsula Health')) {
      throw new Error('Page title does not contain "Peninsula Health"');
    }
  }

  async testNavigationMenu() {
    await this.page.goto(FRONTEND_URL + '/dashboard');
    
    // Check for navigation elements
    const navElement = await this.page.$('nav');
    if (!navElement) {
      throw new Error('Navigation menu not found');
    }
  }

  async testDoctorsPage() {
    await this.page.goto(FRONTEND_URL + '/doctors');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if doctors page loaded
    const pageContent = await this.page.content();
    if (!pageContent.includes('Doctor') && !pageContent.includes('doctor')) {
      throw new Error('Doctors page content not found');
    }
  }

  async testSchedulePage() {
    await this.page.goto(FRONTEND_URL + '/schedule');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if schedule page loaded
    const pageContent = await this.page.content();
    if (!pageContent.includes('Schedule') && !pageContent.includes('Roster')) {
      throw new Error('Schedule page content not found');
    }
  }

  async testReportsPage() {
    await this.page.goto(FRONTEND_URL + '/reports');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if reports page loaded
    const pageContent = await this.page.content();
    if (!pageContent.includes('Report') && !pageContent.includes('Analytics')) {
      throw new Error('Reports page content not found');
    }
  }

  async testShiftsPage() {
    await this.page.goto(FRONTEND_URL + '/shifts');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if shifts page loaded
    const pageContent = await this.page.content();
    if (!pageContent.includes('Shift')) {
      throw new Error('Shifts page content not found');
    }
  }

  async testConfigPage() {
    await this.page.goto(FRONTEND_URL + '/config');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if config page loaded
    const pageContent = await this.page.content();
    if (!pageContent.includes('Config') && !pageContent.includes('Settings')) {
      throw new Error('Config page content not found');
    }
  }

  async testAPIHealthCheck() {
    try {
      const response = await fetch(BACKEND_URL + '/api/health');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Backend health check failed');
      }
    } catch (error) {
      throw new Error('Backend health check failed');
    }
  }

  async testAPIGetDoctors() {
    try {
      const response = await fetch(BACKEND_URL + '/api/doctors');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch doctors from API');
      }
    } catch (error) {
      throw new Error('Failed to fetch doctors from API');
    }
  }

  async testAPIGetConfig() {
    try {
      const response = await fetch(BACKEND_URL + '/api/config');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to fetch config from API');
      }
    } catch (error) {
      throw new Error('Failed to fetch config from API');
    }
  }

  async run() {
    console.log('🧪 Starting E2E Tests...\n');
    
    try {
      await this.setup();
      
      // Frontend tests
      await this.runTest('Frontend Loads', () => this.testFrontendLoads());
      await this.runTest('Navigation Menu', () => this.testNavigationMenu());
      await this.runTest('Doctors Page', () => this.testDoctorsPage());
      await this.runTest('Schedule Page', () => this.testSchedulePage());
      await this.runTest('Reports Page', () => this.testReportsPage());
      await this.runTest('Shifts Page', () => this.testShiftsPage());
      await this.runTest('Config Page', () => this.testConfigPage());
      
      // API tests
      await this.runTest('API Health Check', () => this.testAPIHealthCheck());
      await this.runTest('API Get Doctors', () => this.testAPIGetDoctors());
      await this.runTest('API Get Config', () => this.testAPIGetConfig());
      
    } catch (error) {
      console.error('Setup failed:', error);
    } finally {
      await this.teardown();
    }
    
    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results:');
    console.log('================\n');
    
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    
    this.results.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log('\n================');
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the tests
const runner = new E2ETestRunner();
runner.run();