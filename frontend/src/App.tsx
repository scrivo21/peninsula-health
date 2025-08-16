import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './components/LoginPage';
import { RegistrationPage } from './components/RegistrationPage';
import { DashboardPage } from './components/DashboardPage';
import { SchedulePage } from './components/SchedulePage';
import { DoctorsPage } from './components/DoctorsPage/DoctorsPage';
import { ReportsPage } from './components/ReportsPage';
import { SettingsPage } from './components/SettingsPage/SettingsPage';
import { ConfigPage } from './components/ConfigPage';
import { ShiftsPage } from './components/ShiftsPage';
import { Footer } from './components/Footer';
import { UserGuide } from './components/UserGuide';
import { DemoDataService } from './utils/demoData';
import './styles/global.css';

function App() {
  useEffect(() => {
    // Initialize demo environment on app start
    const initializeDemoEnvironment = async () => {
      try {
        // Initialize basic demo data
        await DemoDataService.createBasicDemoUsers();
        
        // Print demo information to console for developers
        DemoDataService.printDemoInfo();
      } catch (error) {
        console.error('Failed to initialize demo environment:', error);
      }
    };

    initializeDemoEnvironment();
  }, []);

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Router>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <main style={{ flex: 1, overflow: 'auto' }}>
            <Routes>
              {/* Default route redirects to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Authentication routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              
              {/* Dashboard route */}
              <Route path="/dashboard" element={<DashboardPage />} />
              
              {/* Schedule route */}
              <Route path="/schedule" element={<SchedulePage />} />
              
              {/* Doctors route */}
              <Route path="/doctors" element={<DoctorsPage />} />
              
              {/* Reports route */}
              <Route path="/reports" element={<ReportsPage />} />
              
              {/* Settings route */}
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Config route */}
              <Route path="/config" element={<ConfigPage />} />
              
              {/* Shifts route */}
              <Route path="/shifts" element={<ShiftsPage />} />
              
              {/* Help/Documentation routes */}
              <Route path="/help/user-guide" element={<UserGuide />} />
              
              {/* Catch-all route for 404s */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </div>
  );
}

export default App;