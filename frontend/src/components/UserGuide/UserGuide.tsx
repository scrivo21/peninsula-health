import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './UserGuide.module.css';

// Icons as components for better performance and accessibility
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06z" />
  </svg>
);

const BookmarkIcon = ({ filled, className }: { filled?: boolean; className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M4 2a2 2 0 0 0-2 2v10l4-3 4 3V4a2 2 0 0 0-2-2H4z" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
  </svg>
);

const CopyIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
  </svg>
);

const PrintIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z" />
    <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4V3zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2H5zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1z" />
  </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
  </svg>
);

const ThumbsUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2.144 2.144 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a9.84 9.84 0 0 0-.443.05 9.365 9.365 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111L8.864.046zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a8.908 8.908 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.224 2.224 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.866.866 0 0 1-.121.416c-.165.288-.503.56-1.066.56z" />
  </svg>
);

const ThumbsDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.081 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.129.12.268.159.403.077.27.113.567.113.856 0 .289-.036.586-.113.856-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a9.877 9.877 0 0 1-.443-.05 9.364 9.364 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964l-.261.065zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.868-.333.035-.554.29-.554.55V7c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.040.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 0 1 .595-.643h.003l.014.004.058.013a8.912 8.912 0 0 0 1.036.157c.663.06 1.457.054 2.11-.164.175-.058.45-.3.57-.65.107-.308.087-.67-.266-1.021L12.793 7l.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581 0-.211-.027-.414-.075-.581-.05-.174-.111-.273-.154-.315L12.793 5l.353-.354c.047-.047.109-.176.005-.488a2.224 2.224 0 0 0-.505-.804L12.293 3l.353-.354c.006-.005.041-.05.041-.17a.866.866 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1z" />
  </svg>
);

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
  readingTime?: number;
  keywords?: string[];
}

interface Bookmark {
  id: string;
  sectionId: string;
  title: string;
  timestamp: number;
}

interface CollapsedState {
  [key: string]: boolean;
}

interface FeedbackState {
  [sectionId: string]: 'helpful' | 'not-helpful' | null;
}

interface ReadingProgress {
  [sectionId: string]: boolean;
}

export const UserGuide: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchHighlights, setSearchHighlights] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const saved = localStorage.getItem('userguide-bookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  const [collapsedSections, setCollapsedSections] = useState<CollapsedState>({});
  const [feedback, setFeedback] = useState<FeedbackState>(() => {
    const saved = localStorage.getItem('userguide-feedback');
    return saved ? JSON.parse(saved) : {};
  });
  const [readingProgress, setReadingProgress] = useState<ReadingProgress>(() => {
    const saved = localStorage.getItem('userguide-progress');
    return saved ? JSON.parse(saved) : {};
  });
  const [printMode, setPrintMode] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    const saved = localStorage.getItem('userguide-high-contrast');
    return saved ? JSON.parse(saved) : false;
  });
  
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLElement }>({});
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [tocVisible, setTocVisible] = useState<boolean>(true);
  const [searchResults, setSearchResults] = useState<{sectionId: string, matches: number}[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('userguide-dark-mode');
    return saved ? JSON.parse(saved) : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>(() => {
    const saved = localStorage.getItem('userguide-font-size');
    return (saved as 'small' | 'normal' | 'large') || 'normal';
  });
  const [showTooltips, setShowTooltips] = useState<boolean>(() => {
    const saved = localStorage.getItem('userguide-show-tooltips');
    return saved ? JSON.parse(saved) : true;
  });
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('userguide-animations');
    return saved ? JSON.parse(saved) : !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [lastVisitedSections, setLastVisitedSections] = useState<string[]>(() => {
    const saved = localStorage.getItem('userguide-last-visited');
    return saved ? JSON.parse(saved) : [];
  });

  // Enhanced sections with reading times and keywords
  const sections: Section[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      readingTime: 8,
      keywords: ['login', 'dashboard', 'navigation', 'demo', 'setup', 'first time', 'new user'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Welcome to Shift Happens v2.0</h2>
          <p>
            Shift Happens is Peninsula Health's advanced hospital scheduling system designed to streamline
            doctor roster management, shift allocation, and schedule optimization. Whether you're a department
            manager creating rosters or a doctor checking your schedule, this guide will help you get the most
            out of the system.
          </p>

          <div className={styles.userStoryBox}>
            <h3>User Stories</h3>
            <div className={styles.userStory}>
              <strong>As a new department manager,</strong> I want to quickly understand how to create my first roster 
              <strong>so that</strong> I can efficiently schedule my team without disrupting patient care.
            </div>
            <div className={styles.userStory}>
              <strong>As a busy doctor,</strong> I want to easily check my upcoming shifts and request changes 
              <strong>so that</strong> I can plan my personal life around my work commitments.
            </div>
          </div>
          
          <h3>Your First 10 Minutes - Quick Start Guide</h3>
          <div className={styles.stepByStep}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div className={styles.stepContent}>
                <strong>Login to the System</strong>
                <p>Use your Peninsula Health email and password. Look for the blue "Login" button at the top right of the homepage.</p>
                <div className={styles.tip}>
                  <strong>New User?</strong> Click "Register" and fill out the form. Your request will be sent to your department manager for approval within 24 hours.
                </div>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div className={styles.stepContent}>
                <strong>Explore Your Dashboard</strong>
                <p>After login, you'll land on your personalized dashboard. Take 2 minutes to familiarize yourself with:</p>
                <ul>
                  <li>Today's roster (who's working today)</li>
                  <li>Your upcoming shifts (next 7 days)</li>
                  <li>Important notifications (in the red notification box)</li>
                  <li>Quick action buttons (Generate Roster, View Reports)</li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div className={styles.stepContent}>
                <strong>Navigate the System</strong>
                <p>Use the main navigation bar to explore:</p>
                <ul>
                  <li><strong>Dashboard:</strong> Your home base for daily information</li>
                  <li><strong>Schedule:</strong> Create and manage rosters</li>
                  <li><strong>Doctors:</strong> Manage staff profiles and availability</li>
                  <li><strong>Reports:</strong> Generate insights and analytics</li>
                  <li><strong>Shifts:</strong> Configure shift types and rules</li>
                  <li><strong>Configuration:</strong> System settings (admin only)</li>
                </ul>
              </div>
            </div>
          </div>

          <h3>Demo Environment - Try Before You Commit</h3>
          <p>
            New to the system? Use our demo environment to explore features without affecting real data:
          </p>
          <div className={styles.demoCredentials}>
            <div className={styles.demoCard}>
              <h4>Department Manager Demo</h4>
              <p>Email: manager@demo.com</p>
              <p>Password: manager123</p>
              <p>Can create rosters, manage doctors, view all reports</p>
            </div>
            <div className={styles.demoCard}>
              <h4>Doctor Demo</h4>
              <p>Email: john.doe@demo.com</p>
              <p>Password: demo123</p>
              <p>Can view schedules, update availability, request changes</p>
            </div>
            <div className={styles.demoCard}>
              <h4>System Administrator Demo</h4>
              <p>Email: admin@demo.com</p>
              <p>Password: admin123</p>
              <p>Full system access including configuration</p>
            </div>
          </div>

          <div className={styles.tipBox}>
            <h4>Pro Tips for New Users</h4>
            <ul>
              <li><strong>Start Small:</strong> Create your first roster for just one week to learn the process</li>
              <li><strong>Use Templates:</strong> Copy a previous successful roster as your starting point</li>
              <li><strong>Set Availability Early:</strong> Ensure all doctors have updated their availability before generating rosters</li>
              <li><strong>Save Frequently:</strong> Use Ctrl+S to save your work as you make changes</li>
            </ul>
          </div>

          <h3>Common First-Time Questions</h3>
          <div className={styles.faqSection}>
            <div className={styles.faqItem}>
              <strong>Q: I can't see the Schedule menu option. Why?</strong>
              <p>A: Your user role might not include scheduling permissions. Contact your department manager to update your role.</p>
            </div>
            <div className={styles.faqItem}>
              <strong>Q: How do I know if my roster changes are saved?</strong>
              <p>A: Look for the green "Saved" indicator at the top right, or the timestamp showing "Last saved: X minutes ago".</p>
            </div>
            <div className={styles.faqItem}>
              <strong>Q: Can I undo changes I've made?</strong>
              <p>A: Yes! Use Ctrl+Z to undo recent changes, or click the "Roster History" button to revert to earlier versions.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      readingTime: 12,
      keywords: ['control center', 'metrics', 'today roster', 'notifications', 'quick actions', 'coverage rate'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Dashboard - Your Command Center</h2>
          <p>
            The Dashboard is your one-stop view for everything happening in your department today and this week. 
            Think of it as your control tower - it shows you the current state of operations and gives you 
            quick access to the actions you need most.
          </p>

          <div className={styles.userStoryBox}>
            <h3>User Stories</h3>
            <div className={styles.userStory}>
              <strong>As a department manager arriving at work,</strong> I want to see at a glance if today's roster is fully staffed 
              <strong>so that</strong> I can immediately identify and address any coverage gaps.
            </div>
            <div className={styles.userStory}>
              <strong>As a doctor,</strong> I want to quickly check my upcoming shifts and any schedule changes 
              <strong>so that</strong> I can plan my day without missing important updates.
            </div>
            <div className={styles.userStory}>
              <strong>As an administrator,</strong> I want to monitor system performance and user activity 
              <strong>so that</strong> I can ensure the scheduling system is running smoothly.
            </div>
          </div>
          
          <h3>Understanding Your Dashboard Layout</h3>
          <div className={styles.stepByStep}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div className={styles.stepContent}>
                <strong>Today's Roster Panel (Top Left)</strong>
                <p>Your most critical information - who's working today:</p>
                <ul>
                  <li><strong>Green names:</strong> Doctors confirmed and ready to work</li>
                  <li><strong>Yellow names:</strong> Doctors with notifications or notes</li>
                  <li><strong>Red text "VACANT":</strong> Unfilled shifts requiring immediate attention</li>
                  <li><strong>Purple highlighting:</strong> Recently modified shifts</li>
                </ul>
                <div className={styles.tip}>
                  <strong>Quick Action:</strong> Click any doctor's name to view their full schedule or contact information.
                </div>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div className={styles.stepContent}>
                <strong>Key Metrics Panel (Top Right)</strong>
                <p>Real-time statistics that help you understand department performance:</p>
                <ul>
                  <li><strong>Coverage Rate:</strong> Percentage of shifts filled (aim for 95%+)</li>
                  <li><strong>Vacant Shifts:</strong> Number of unfilled positions</li>
                  <li><strong>Overtime Hours:</strong> Extra hours worked this period</li>
                  <li><strong>Schedule Conflicts:</strong> Overlapping or problematic assignments</li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div className={styles.stepContent}>
                <strong>Quick Actions Panel (Center)</strong>
                <p>One-click access to your most common tasks:</p>
                <ul>
                  <li><strong>"Generate New Roster":</strong> Start creating next period's schedule</li>
                  <li><strong>"View Today's Report":</strong> Print or email today's assignments</li>
                  <li><strong>"Manage Availability":</strong> Update doctor schedules and preferences</li>
                  <li><strong>"Emergency Coverage":</strong> Find replacements for last-minute changes</li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>4</span>
              <div className={styles.stepContent}>
                <strong>Notifications & Alerts (Bottom)</strong>
                <p>Stay informed about important updates:</p>
                <ul>
                  <li><strong>Red alerts:</strong> Critical issues requiring immediate action</li>
                  <li><strong>Orange warnings:</strong> Potential problems to monitor</li>
                  <li><strong>Blue information:</strong> General updates and announcements</li>
                  <li><strong>Green confirmations:</strong> Successful actions and approvals</li>
                </ul>
              </div>
            </div>
          </div>

          <h3>Daily Dashboard Workflows</h3>
          <div className={styles.workflowSection}>
            <h4>Morning Routine (First thing each day)</h4>
            <ol>
              <li>Check Today's Roster for any vacant shifts or last-minute changes</li>
              <li>Review notifications for new requests or system alerts</li>
              <li>Verify coverage metrics are within acceptable ranges</li>
              <li>Address any red alerts immediately</li>
            </ol>

            <h4>Afternoon Check (Mid-day review)</h4>
            <ol>
              <li>Monitor if any doctors have called in sick</li>
              <li>Check tomorrow's roster preparation status</li>
              <li>Review any new availability submissions</li>
              <li>Address any new notifications or requests</li>
            </ol>

            <h4>End of Day (Before leaving)</h4>
            <ol>
              <li>Confirm tomorrow's roster is complete</li>
              <li>Save any pending changes</li>
              <li>Review weekly metrics for trends</li>
              <li>Set up any automated reports for overnight processing</li>
            </ol>
          </div>

          <h3>Customizing Your Dashboard</h3>
          <p>Make the dashboard work for your specific role and preferences:</p>
          <div className={styles.customizationOptions}>
            <div className={styles.customOption}>
              <h4>For Department Managers</h4>
              <ul>
                <li>Prioritize vacancy alerts and coverage metrics</li>
                <li>Enable overtime tracking widgets</li>
                <li>Show upcoming roster generation reminders</li>
                <li>Display department performance comparisons</li>
              </ul>
            </div>
            <div className={styles.customOption}>
              <h4>For Individual Doctors</h4>
              <ul>
                <li>Focus on personal schedule and upcoming shifts</li>
                <li>Show availability submission deadlines</li>
                <li>Display shift swap requests and approvals</li>
                <li>Enable calendar integration notifications</li>
              </ul>
            </div>
            <div className={styles.customOption}>
              <h4>For Administrators</h4>
              <ul>
                <li>System health and performance metrics</li>
                <li>User activity and login statistics</li>
                <li>Data backup and security status</li>
                <li>Integration status with other hospital systems</li>
              </ul>
            </div>
          </div>

          <div className={styles.tipBox}>
            <h4>Dashboard Power User Tips</h4>
            <ul>
              <li><strong>Keyboard Shortcuts:</strong> Press Alt+D from anywhere to return to dashboard</li>
              <li><strong>Refresh Data:</strong> Press F5 or click the refresh icon to get the latest information</li>
              <li><strong>Printable View:</strong> Use Ctrl+P to print a clean version of today's roster</li>
              <li><strong>Mobile Access:</strong> Dashboard is optimized for tablets - perfect for ward rounds</li>
              <li><strong>Color Coding:</strong> Learn the color scheme to quickly interpret information at a glance</li>
            </ul>
          </div>

          <h3>Troubleshooting Common Dashboard Issues</h3>
          <div className={styles.troubleshootSection}>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Dashboard shows "Loading..." but never completes
              <br />
              <strong>Solutions:</strong>
              <ul>
                <li>Check your internet connection</li>
                <li>Clear your browser cache (Ctrl+Shift+Delete)</li>
                <li>Try refreshing the page (F5)</li>
                <li>If persistent, contact IT support</li>
              </ul>
            </div>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Today's roster shows old information
              <br />
              <strong>Solutions:</strong>
              <ul>
                <li>Click the refresh button (circular arrow icon)</li>
                <li>Check the "Last updated" timestamp</li>
                <li>Verify the correct date is selected</li>
                <li>Ensure you have the latest roster published</li>
              </ul>
            </div>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Missing widgets or features
              <br />
              <strong>Solutions:</strong>
              <ul>
                <li>Check your user role permissions</li>
                <li>Click "Customize Dashboard" to restore widgets</li>
                <li>Contact your administrator for role updates</li>
                <li>Try logging out and back in</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'schedule-management',
      title: 'Schedule Management',
      readingTime: 15,
      keywords: ['roster creation', 'generation', 'fairness', 'email distribution', 'constraints', 'modifications'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Schedule Management - Creating Fair and Efficient Rosters</h2>
          <p>
            Schedule Management is where the magic happens. This is your toolkit for creating rosters that 
            balance patient care needs, staff preferences, and fairness requirements. Whether you're planning 
            weeks ahead or making last-minute adjustments, this guide will walk you through every step.
          </p>

          <div className={styles.userStoryBox}>
            <h3>User Stories</h3>
            <div className={styles.userStory}>
              <strong>As a department manager,</strong> I want to create a four-week roster that fairly distributes weekend and night shifts 
              <strong>so that</strong> no doctor feels overburdened and patient care remains consistent.
            </div>
            <div className={styles.userStory}>
              <strong>As a scheduling coordinator,</strong> I want to quickly adapt to last-minute staff changes 
              <strong>so that</strong> I can maintain coverage without disrupting the entire schedule.
            </div>
            <div className={styles.userStory}>
              <strong>As a senior consultant,</strong> I want to review and approve roster changes 
              <strong>so that</strong> I can ensure adequate supervision and skill mix for each shift.
            </div>
          </div>
          
          <h3>The Complete Roster Generation Process</h3>
          <div className={styles.stepByStep}>
            <div className={styles.step}>
              <span className={styles.stepNumber}>1</span>
              <div className={styles.stepContent}>
                <strong>Pre-Generation Checklist</strong>
                <p>Before creating a new roster, ensure you have:</p>
                <ul>
                  <li>All doctor availability forms submitted (deadline: 6 weeks before roster period)</li>
                  <li>Leave requests and conference dates entered</li>
                  <li>Any special requirements or constraints documented</li>
                  <li>Previous roster reviewed for patterns and feedback</li>
                </ul>
                <div className={styles.tip}>
                  <strong>Time-Saving Tip:</strong> Send automated reminders 2 weeks before availability deadline.
                </div>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>2</span>
              <div className={styles.stepContent}>
                <strong>Starting Roster Generation</strong>
                <ol>
                  <li>Navigate to Schedule → Generate New Roster</li>
                  <li>Select your roster period (typically 4-6 weeks)</li>
                  <li>Choose your generation method:</li>
                </ol>
                <div className={styles.generationMethods}>
                  <div className={styles.method}>
                    <h5>Automatic Generation (Recommended for experienced users)</h5>
                    <p><strong>Best for:</strong> Regular periods with established patterns</p>
                    <p><strong>Time needed:</strong> 2-5 minutes</p>
                    <p><strong>Advantages:</strong> Optimal fairness, considers all constraints</p>
                    <p><strong>When to use:</strong> Monthly rosters, stable staff team</p>
                  </div>
                  <div className={styles.method}>
                    <h5>Template-Based (Great for new users)</h5>
                    <p><strong>Best for:</strong> Similar periods or proven patterns</p>
                    <p><strong>Time needed:</strong> 10-15 minutes</p>
                    <p><strong>Advantages:</strong> Builds on successful previous rosters</p>
                    <p><strong>When to use:</strong> First roster, special event periods</p>
                  </div>
                  <div className={styles.method}>
                    <h5>Manual Creation (Full control)</h5>
                    <p><strong>Best for:</strong> Complex requirements, small teams</p>
                    <p><strong>Time needed:</strong> 1-2 hours</p>
                    <p><strong>Advantages:</strong> Complete customization</p>
                    <p><strong>When to use:</strong> Unique constraints, training periods</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>3</span>
              <div className={styles.stepContent}>
                <strong>Reviewing Generated Roster</strong>
                <p>The system will present your new roster. Look for:</p>
                <ul>
                  <li><strong>Red warnings:</strong> Constraint violations (must fix)</li>
                  <li><strong>Yellow alerts:</strong> Suboptimal assignments (review recommended)</li>
                  <li><strong>Green confirmations:</strong> Successfully met requirements</li>
                  <li><strong>Coverage gaps:</strong> Any vacant shifts</li>
                </ul>
                <div className={styles.tip}>
                  <strong>Quality Check:</strong> Use the "Fairness Report" to ensure equitable distribution of undesirable shifts.
                </div>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>4</span>
              <div className={styles.stepContent}>
                <strong>Fine-Tuning and Adjustments</strong>
                <p>Make necessary adjustments using these techniques:</p>
                <ul>
                  <li><strong>Drag and drop:</strong> Move shifts between doctors</li>
                  <li><strong>Smart swap:</strong> System suggests optimal exchanges</li>
                  <li><strong>Constraint override:</strong> Temporarily relax rules for special situations</li>
                  <li><strong>Batch changes:</strong> Apply patterns across multiple dates</li>
                </ul>
              </div>
            </div>

            <div className={styles.step}>
              <span className={styles.stepNumber}>5</span>
              <div className={styles.stepContent}>
                <strong>Final Approval and Publishing</strong>
                <ol>
                  <li>Run final validation check</li>
                  <li>Save roster with descriptive name (e.g., "Feb 2025 - Emergency Dept")</li>
                  <li>Set publication date (usually 3-4 weeks before roster starts)</li>
                  <li>Configure email distribution list</li>
                  <li>Click "Publish and Distribute"</li>
                </ol>
              </div>
            </div>
          </div>

          <h3>Mastering the Three View Modes</h3>
          <div className={styles.viewModes}>
            <div className={styles.viewMode}>
              <h4>1. Calendar View - The Big Picture</h4>
              <p><strong>Best for:</strong> Overall pattern review and monthly planning</p>
              <ul>
                <li>See entire month at a glance</li>
                <li>Identify weekend and holiday coverage</li>
                <li>Spot clustering of night shifts</li>
                <li>Keyboard shortcut: Press '1' or Ctrl+1</li>
              </ul>
              <div className={styles.tip}>
                <strong>Pro tip:</strong> Use color coding to quickly identify shift types and coverage gaps.
              </div>
            </div>

            <div className={styles.viewMode}>
              <h4>2. List View - The Details</h4>
              <p><strong>Best for:</strong> Detailed editing and conflict resolution</p>
              <ul>
                <li>Sort by doctor, date, or shift type</li>
                <li>Quickly filter for specific requirements</li>
                <li>Export data for external analysis</li>
                <li>Keyboard shortcut: Press '2' or Ctrl+2</li>
              </ul>
              <div className={styles.tip}>
                <strong>Pro tip:</strong> Use the search function to find specific doctor assignments or shift patterns.
              </div>
            </div>

            <div className={styles.viewMode}>
              <h4>3. Timeline View - The Flow</h4>
              <p><strong>Best for:</strong> Understanding shift transitions and workload</p>
              <ul>
                <li>Visualize consecutive shift patterns</li>
                <li>Identify potential fatigue risks</li>
                <li>Optimize shift handovers</li>
                <li>Keyboard shortcut: Press '3' or Ctrl+3</li>
              </ul>
              <div className={styles.tip}>
                <strong>Pro tip:</strong> Look for long stretches of consecutive shifts that may indicate workload imbalance.
              </div>
            </div>
          </div>

          <h3>Advanced Modification Techniques</h3>
          <div className={styles.modificationTechniques}>
            <h4>Individual Shift Changes</h4>
            <p>Click any shift assignment to access these options:</p>
            <ul>
              <li><strong>Reassign Doctor:</strong> Choose from available, qualified doctors</li>
              <li><strong>Change Shift Type:</strong> Convert between day/evening/night shifts</li>
              <li><strong>Adjust Timing:</strong> Modify start/end times for special circumstances</li>
              <li><strong>Add Notes:</strong> Include special instructions or reminders</li>
              <li><strong>Mark as Modified:</strong> Purple highlighting tracks all changes</li>
            </ul>

            <h4>Bulk Operations</h4>
            <p>Save time with these batch modification tools:</p>
            <ul>
              <li><strong>Pattern Copy:</strong> Apply a week's pattern to subsequent weeks</li>
              <li><strong>Mass Reassignment:</strong> Replace one doctor across multiple shifts</li>
              <li><strong>Constraint Relaxation:</strong> Temporarily adjust rules for special periods</li>
              <li><strong>Template Application:</strong> Overlay patterns from successful previous rosters</li>
            </ul>

            <h4>Emergency Modifications</h4>
            <p>When you need to make last-minute changes:</p>
            <ol>
              <li>Use "Find Replacement" feature for immediate suggestions</li>
              <li>Check "Available Now" filter for doctors not scheduled</li>
              <li>Consider "Willing to Cover" list of doctors who accept extra shifts</li>
              <li>Use automated notification system to request volunteers</li>
            </ol>
          </div>

          <h3>Email Distribution Made Simple</h3>
          <div className={styles.emailDistribution}>
            <h4>Understanding Distribution Options</h4>
            <div className={styles.distributionOption}>
              <strong>Individual Schedules</strong>
              <p>Each doctor receives only their personal assignments:</p>
              <ul>
                <li>Includes personal shifts and any special notes</li>
                <li>Shows contact information for shift supervisors</li>
                <li>Provides calendar file for easy import</li>
                <li>Best for: Regular roster distribution</li>
              </ul>
            </div>
            
            <div className={styles.distributionOption}>
              <strong>Complete Department Roster</strong>
              <p>Full schedule sent to administrators and supervisors:</p>
              <ul>
                <li>Shows all doctor assignments</li>
                <li>Includes coverage statistics and metrics</li>
                <li>Highlights any remaining vacancies or issues</li>
                <li>Best for: Administrative oversight and planning</li>
              </ul>
            </div>

            <div className={styles.distributionOption}>
              <strong>Custom Distributions</strong>
              <p>Tailored emails for specific purposes:</p>
              <ul>
                <li>Weekend-only schedules for part-time staff</li>
                <li>Specific ward or unit assignments</li>
                <li>On-call schedules only</li>
                <li>Best for: Specialized teams or specific requirements</li>
              </ul>
            </div>

            <h4>Email Best Practices</h4>
            <ul>
              <li><strong>Timing:</strong> Send rosters 3-4 weeks before start date</li>
              <li><strong>Subject Lines:</strong> Use clear, consistent formatting ("March 2025 Roster - Emergency Dept")</li>
              <li><strong>Include Deadlines:</strong> Note when changes can no longer be accommodated</li>
              <li><strong>Contact Information:</strong> Provide clear escalation path for questions</li>
              <li><strong>Mobile Optimization:</strong> Ensure emails display properly on phones</li>
            </ul>
          </div>

          <div className={styles.tipBox}>
            <h4>Schedule Management Expert Tips</h4>
            <ul>
              <li><strong>Save Incremental Versions:</strong> Save roster drafts with version numbers before major changes</li>
              <li><strong>Use Preview Mode:</strong> Always preview email distributions before sending</li>
              <li><strong>Track Modifications:</strong> Purple highlighting helps you see what's changed since publication</li>
              <li><strong>Set Reminders:</strong> Use calendar alerts for roster generation deadlines</li>
              <li><strong>Backup Plans:</strong> Always have contingency doctors identified for critical shifts</li>
              <li><strong>Feedback Loop:</strong> Regularly survey staff about roster satisfaction and adjustment needs</li>
            </ul>
          </div>

          <h3>Common Scheduling Scenarios</h3>
          <div className={styles.scenarioSection}>
            <div className={styles.scenario}>
              <h4>Scenario 1: Doctor Calls in Sick Day of Shift</h4>
              <ol>
                <li>Navigate to Today's Roster</li>
                <li>Click on the sick doctor's shift</li>
                <li>Select "Find Emergency Replacement"</li>
                <li>System shows available doctors with contact info</li>
                <li>Call doctors in order of suitability</li>
                <li>Update roster and notify affected parties</li>
              </ol>
            </div>

            <div className={styles.scenario}>
              <h4>Scenario 2: Adding New Doctor Mid-Roster</h4>
              <ol>
                <li>First, add doctor profile in Doctors section</li>
                <li>Return to active roster</li>
                <li>Use "Insert Additional Coverage" option</li>
                <li>System suggests optimal shift assignments</li>
                <li>Adjust existing assignments if needed</li>
                <li>Republish roster with change notifications</li>
              </ol>
            </div>

            <div className={styles.scenario}>
              <h4>Scenario 3: Holiday Period Planning</h4>
              <ol>
                <li>Start roster generation 8 weeks early</li>
                <li>Send special availability forms for holiday preferences</li>
                <li>Use "Holiday Mode" in generation settings</li>
                <li>Manually review and adjust for fairness</li>
                <li>Communicate holiday roster earlier than usual</li>
                <li>Plan backup coverage for high-risk periods</li>
              </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'doctor-management',
      title: 'Doctor Management',
      readingTime: 5,
      keywords: ['profiles', 'availability', 'skill categories', 'performance tracking', 'adding doctors'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Doctor Management</h2>
          <p>
            Manage doctor profiles, availability, preferences, and shift allocations.
          </p>
          
          <h3>Adding New Doctors</h3>
          <ol>
            <li>Go to the Doctors page</li>
            <li>Click "Add New Doctor"</li>
            <li>Fill in required information:
              <ul>
                <li>Personal details (name, email, phone)</li>
                <li>Professional information (specialization, experience)</li>
                <li>Shift preferences and restrictions</li>
                <li>Maximum shifts per period</li>
              </ul>
            </li>
            <li>Set initial availability</li>
            <li>Save the profile</li>
          </ol>

          <h3>Managing Availability</h3>
          <p>
            Each doctor's profile includes an availability section where you can:
          </p>
          <ul>
            <li>Mark specific dates as unavailable (leave, conferences, etc.)</li>
            <li>Set recurring unavailability patterns</li>
            <li>Define preferred shift types</li>
            <li>Specify maximum consecutive shifts</li>
          </ul>

          <h3>Skill Categories</h3>
          <p>
            Doctors are categorized by skill level to ensure appropriate shift assignments:
          </p>
          <ul>
            <li><strong>Consultant:</strong> Senior doctors who can handle all shift types</li>
            <li><strong>Registrar:</strong> Mid-level doctors with specific competencies</li>
            <li><strong>Resident:</strong> Junior doctors with supervised responsibilities</li>
          </ul>

          <h3>Performance Tracking</h3>
          <p>
            View statistics for each doctor including:
          </p>
          <ul>
            <li>Total shifts worked</li>
            <li>Shift type distribution</li>
            <li>Overtime hours</li>
            <li>Leave taken</li>
          </ul>
        </div>
      )
    },
    {
      id: 'shift-types',
      title: 'Shift Types & Configuration',
      readingTime: 4,
      keywords: ['day shift', 'night shift', 'on call', 'shift rules', 'configuration', 'staffing requirements'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Shift Types & Configuration</h2>
          <p>
            Understanding and configuring different shift types is crucial for effective scheduling.
          </p>
          
          <h3>Standard Shift Types</h3>
          <ul>
            <li>
              <strong>Day Shift (D):</strong> Regular daytime hours, typically 8:00 AM - 5:00 PM
            </li>
            <li>
              <strong>Evening Shift (E):</strong> Late afternoon to night, typically 2:00 PM - 10:00 PM
            </li>
            <li>
              <strong>Night Shift (N):</strong> Overnight coverage, typically 10:00 PM - 8:00 AM
            </li>
            <li>
              <strong>Long Day (LD):</strong> Extended day shift, typically 8:00 AM - 8:00 PM
            </li>
            <li>
              <strong>Weekend Day (WD):</strong> Saturday/Sunday day shifts with different requirements
            </li>
            <li>
              <strong>Weekend Night (WN):</strong> Saturday/Sunday night shifts
            </li>
            <li>
              <strong>On Call (OC):</strong> Standby availability for emergencies
            </li>
          </ul>

          <h3>Shift Configuration</h3>
          <p>
            Access the Shifts page to:
          </p>
          <ol>
            <li>View all configured shift types</li>
            <li>Modify shift parameters:
              <ul>
                <li>Start and end times</li>
                <li>Minimum staffing requirements</li>
                <li>Skill level requirements</li>
                <li>Point values for workload calculation</li>
              </ul>
            </li>
            <li>Create custom shift types for special needs</li>
            <li>Set shift rules and constraints</li>
          </ol>

          <h3>Shift Rules</h3>
          <p>
            Configure automatic rules to ensure safe and fair scheduling:
          </p>
          <ul>
            <li>Maximum consecutive shifts</li>
            <li>Minimum rest periods between shifts</li>
            <li>Weekend distribution requirements</li>
            <li>Night shift rotation policies</li>
          </ul>
        </div>
      )
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      readingTime: 3,
      keywords: ['today roster report', 'vacant shifts', 'doctor statistics', 'undesirable shifts', 'exports'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Reports & Analytics</h2>
          <p>
            Generate comprehensive reports for analysis, compliance, and decision-making.
          </p>
          
          <h3>Available Reports</h3>
          
          <h4>Today's Roster Report</h4>
          <p>
            Real-time view of current day assignments:
          </p>
          <ul>
            <li>All doctors on duty with shift types</li>
            <li>Contact information for on-call staff</li>
            <li>Coverage gaps or overstaffing alerts</li>
          </ul>

          <h4>Vacant Shifts Report</h4>
          <p>
            Identify unfilled shifts requiring attention:
          </p>
          <ul>
            <li>List of all vacant shifts by date</li>
            <li>Priority level based on shift criticality</li>
            <li>Suggested doctors based on availability</li>
          </ul>

          <h4>Doctor Statistics Report</h4>
          <p>
            Individual and comparative doctor metrics:
          </p>
          <ul>
            <li>Shift distribution by type</li>
            <li>Overtime and workload analysis</li>
            <li>Leave and absence patterns</li>
            <li>Fairness metrics comparing doctors</li>
          </ul>

          <h4>Undesirable Shifts Report</h4>
          <p>
            Track assignments to less preferred shifts:
          </p>
          <ul>
            <li>Distribution of night and weekend shifts</li>
            <li>Equity analysis across the team</li>
            <li>Rotation effectiveness</li>
          </ul>

          <h3>Exporting Reports</h3>
          <p>
            All reports can be exported in multiple formats:
          </p>
          <ul>
            <li>PDF for printing and archiving</li>
            <li>Excel for further analysis</li>
            <li>CSV for data integration</li>
          </ul>
        </div>
      )
    },
    {
      id: 'configuration',
      title: 'System Configuration',
      readingTime: 6,
      keywords: ['admin', 'settings', 'user management', 'integration', 'backup', 'roster rules'],
      content: (
        <div className={styles.sectionContent}>
          <h2>System Configuration</h2>
          <p>
            Advanced configuration options for system administrators.
          </p>
          
          <h3>General Settings</h3>
          <ul>
            <li>
              <strong>Hospital Information:</strong> Update facility details, departments, and contact info
            </li>
            <li>
              <strong>Scheduling Parameters:</strong> Default roster periods, planning horizons
            </li>
            <li>
              <strong>Notification Settings:</strong> Email templates, alert thresholds
            </li>
          </ul>

          <h3>Roster Generation Rules</h3>
          <p>
            Configure the automatic roster generation algorithm:
          </p>
          <ul>
            <li>Fairness weights and balancing factors</li>
            <li>Hard constraints (must be satisfied)</li>
            <li>Soft constraints (preferences)</li>
            <li>Optimization priorities</li>
          </ul>

          <h3>User Management</h3>
          <p>
            Control system access and permissions:
          </p>
          <ul>
            <li>Create and manage user accounts</li>
            <li>Assign roles (Admin, Manager, Doctor, Viewer)</li>
            <li>Set department-specific permissions</li>
            <li>Configure single sign-on (SSO) if available</li>
          </ul>

          <h3>Integration Settings</h3>
          <p>
            Connect with other hospital systems:
          </p>
          <ul>
            <li>HR system synchronization</li>
            <li>Payroll integration</li>
            <li>Email server configuration</li>
            <li>Calendar system exports</li>
          </ul>

          <h3>Backup & Recovery</h3>
          <p>
            Ensure data safety and continuity:
          </p>
          <ul>
            <li>Automated backup schedules</li>
            <li>Manual backup triggers</li>
            <li>Restore previous configurations</li>
            <li>Export/import settings</li>
          </ul>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: 'Best Practices',
      readingTime: 4,
      keywords: ['planning', 'change management', 'communication', 'system maintenance', 'tips'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Best Practices</h2>
          <p>
            Follow these guidelines for optimal use of the scheduling system.
          </p>
          
          <h3>Roster Planning</h3>
          <ul>
            <li>
              <strong>Plan Ahead:</strong> Generate rosters at least 4-6 weeks in advance
            </li>
            <li>
              <strong>Collect Availability Early:</strong> Request doctor availability 8 weeks before the roster period
            </li>
            <li>
              <strong>Review Patterns:</strong> Check previous rosters for successful patterns
            </li>
            <li>
              <strong>Balance Workload:</strong> Ensure fair distribution of undesirable shifts
            </li>
          </ul>

          <h3>Change Management</h3>
          <ul>
            <li>
              <strong>Document Changes:</strong> Always add notes when modifying published rosters
            </li>
            <li>
              <strong>Notify Affected Parties:</strong> Use the notification system for all changes
            </li>
            <li>
              <strong>Track Swaps:</strong> Record all shift swaps between doctors
            </li>
            <li>
              <strong>Maintain History:</strong> Keep records of all roster versions
            </li>
          </ul>

          <h3>Communication</h3>
          <ul>
            <li>
              <strong>Clear Expectations:</strong> Ensure all doctors understand their schedules
            </li>
            <li>
              <strong>Timely Distribution:</strong> Send rosters as soon as they're finalized
            </li>
            <li>
              <strong>Feedback Loops:</strong> Regularly collect feedback on scheduling preferences
            </li>
            <li>
              <strong>Transparency:</strong> Share scheduling rules and fairness metrics
            </li>
          </ul>

          <h3>System Maintenance</h3>
          <ul>
            <li>
              <strong>Regular Updates:</strong> Keep doctor profiles and availability current
            </li>
            <li>
              <strong>Data Cleanup:</strong> Archive old rosters periodically
            </li>
            <li>
              <strong>Configuration Reviews:</strong> Reassess rules and constraints quarterly
            </li>
            <li>
              <strong>Training:</strong> Ensure all users are trained on new features
            </li>
          </ul>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      readingTime: 20,
      keywords: ['problems', 'login issues', 'roster generation', 'email problems', 'browser', 'performance', 'support'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Troubleshooting Guide - Solving Problems Quickly</h2>
          <p>
            When things go wrong, you need solutions fast. This comprehensive troubleshooting guide covers 
            the most common issues users encounter, with step-by-step solutions and when to escalate to support. 
            Each solution is tested and proven to work in real hospital environments.
          </p>

          <div className={styles.emergencyAlert}>
            <h3>Critical System Issues - Act Immediately</h3>
            <p>If the system is completely down or affecting patient care, call Emergency IT Support: 
            <strong>(03) 9784 7777 ext. 9999</strong></p>
          </div>
          
          <h3>Login and Access Issues</h3>
          <div className={styles.troubleshootCategory}>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> "Invalid username or password" error with correct credentials
              <br />
              <strong>Immediate Solutions:</strong>
              <ol>
                <li>Check CAPS LOCK is off and try typing password in notepad first</li>
                <li>Clear browser cache: Press Ctrl+Shift+Delete, select "All time", check all boxes, click "Clear data"</li>
                <li>Try incognito/private browsing mode (Ctrl+Shift+N in Chrome)</li>
                <li>Wait 15 minutes - account may be temporarily locked after multiple attempts</li>
              </ol>
              <strong>If still failing:</strong>
              <ul>
                <li>Click "Forgot Password" and reset (takes 5-10 minutes for email)</li>
                <li>Contact IT Help Desk: (03) 9784 7777 ext. 2000</li>
                <li>Temporary workaround: Ask colleague to check critical information</li>
              </ul>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> "Access Denied" to certain features
              <br />
              <strong>Root Cause:</strong> User role doesn't include required permissions
              <br />
              <strong>Solutions:</strong>
              <ol>
                <li>Check your role in Profile → Account Settings</li>
                <li>Contact your department manager to update permissions</li>
                <li>For urgent needs, ask a manager to perform the action temporarily</li>
                <li>Document what you need access to for faster resolution</li>
              </ol>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Two-factor authentication not working
              <br />
              <strong>Solutions:</strong>
              <ol>
                <li>Check your phone's time is correct (sync with network time)</li>
                <li>Try generating a new code (wait 30 seconds between attempts)</li>
                <li>Use backup codes if available (in your profile settings)</li>
                <li>Contact IT immediately if still failing - they can temporarily disable 2FA</li>
              </ol>
            </div>
          </div>

          <h3>Roster Generation and Scheduling Problems</h3>
          <div className={styles.troubleshootCategory}>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Roster generation fails with "No solution found"
              <br />
              <strong>This means:</strong> The system cannot create a roster that meets all your constraints
              <br />
              <strong>Step-by-step fix:</strong>
              <ol>
                <li><strong>Identify the bottleneck:</strong> Click "View Constraint Analysis" to see which rules are blocking generation</li>
                <li><strong>Check doctor availability:</strong> Ensure at least 80% of doctors have submitted availability</li>
                <li><strong>Review shift requirements:</strong> Verify you're not asking for more coverage than available staff</li>
                <li><strong>Temporarily relax constraints:</strong> Use "Constraint Override" for the most restrictive rules</li>
                <li><strong>Generate in smaller chunks:</strong> Try creating one week at a time, then combine</li>
              </ol>
              <div className={styles.tip}>
                <strong>Prevention:</strong> Run "Constraint Feasibility Check" before starting generation
              </div>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Generated roster is very unfair (some doctors have too many night shifts)
              <br />
              <strong>Solutions:</strong>
              <ol>
                <li>Check "Fairness Weight" is set to at least 70% in generation settings</li>
                <li>Review previous roster periods - unfairness might be balancing historical inequity</li>
                <li>Use "Manual Adjustment" mode to swap problematic assignments</li>
                <li>Run "Fairness Analysis" report to identify specific issues</li>
                <li>Consider generating roster in multiple iterations, adjusting weights each time</li>
              </ol>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Roster generation is extremely slow (over 10 minutes)
              <br />
              <strong>Performance troubleshooting:</strong>
              <ol>
                <li>Check if other users are generating rosters simultaneously</li>
                <li>Reduce roster period (try 2 weeks instead of 4)</li>
                <li>Simplify constraints - remove "nice to have" preferences temporarily</li>
                <li>Try during off-peak hours (early morning or late evening)</li>
                <li>Contact IT if consistently slow - may indicate server issues</li>
              </ol>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> "Failed to save roster" error
              <br />
              <strong>Data protection steps:</strong>
              <ol>
                <li><strong>Don't close the browser!</strong> Your work might still be recoverable</li>
                <li>Open a new tab and try logging in again</li>
                <li>Take screenshots of your current roster before making changes</li>
                <li>Try "Export to Excel" to backup your work</li>
                <li>Use "Save Draft" instead of "Publish" to reduce system load</li>
                <li>If persistent, contact IT with your roster details for recovery</li>
              </ol>
            </div>
          </div>

          <h3>Email and Communication Failures</h3>
          <div className={styles.troubleshootCategory}>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Roster emails not being received by doctors
              <br />
              <strong>Systematic diagnosis:</strong>
              <ol>
                <li><strong>Check email addresses:</strong> Go to Doctors section and verify each email is correct</li>
                <li><strong>Test with yourself:</strong> Send a roster to your own email first</li>
                <li><strong>Check email queue:</strong> In Configuration → Email Status, see if emails are stuck "Sending"</li>
                <li><strong>Spam folder check:</strong> Ask doctors to check junk/spam folders</li>
                <li><strong>Hospital email rules:</strong> IT may have blocked external emails - check with helpdesk</li>
              </ol>
              <div className={styles.tip}>
                <strong>Workaround:</strong> Use "Generate PDF" and email manually if system emails aren't working
              </div>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Email delivery is very slow (hours delayed)
              <br />
              <strong>Solutions:</strong>
              <ol>
                <li>Check email server status with IT department</li>
                <li>Send smaller batches (5-10 doctors at a time instead of entire department)</li>
                <li>Schedule email delivery for off-peak hours</li>
                <li>Use "High Priority" setting only for urgent communications</li>
              </ol>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> PDF attachments corrupted or won't open
              <br />
              <strong>Solutions:</strong>
              <ol>
                <li>Try different PDF viewer (Adobe Reader, browser built-in, mobile app)</li>
                <li>Re-generate the PDF from the system</li>
                <li>Check file size - very large PDFs may be corrupted during email transmission</li>
                <li>Use "Individual PDFs" instead of "Combined Department PDF"</li>
              </ol>
            </div>
          </div>

          <h3>Display and Interface Problems</h3>
          <div className={styles.troubleshootCategory}>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Schedule calendar shows blank or missing shifts
              <br />
              <strong>Visual troubleshooting:</strong>
              <ol>
                <li>Check date range - ensure you're viewing the correct month/period</li>
                <li>Try different view modes (Calendar → List → Timeline)</li>
                <li>Clear browser cache: Ctrl+F5 (hard refresh)</li>
                <li>Disable browser extensions (particularly ad blockers)</li>
                <li>Check zoom level - set browser zoom to 100%</li>
                <li>Try different browser (Chrome, Firefox, Edge)</li>
              </ol>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Interface elements overlapping or misaligned
              <br />
              <strong>Browser compatibility fixes:</strong>
              <ol>
                <li>Update your browser to the latest version</li>
                <li>Reset zoom to 100% (Ctrl+0)</li>
                <li>Check screen resolution - minimum 1024x768 recommended</li>
                <li>Try incognito/private mode to rule out extension conflicts</li>
                <li>Clear browser data completely and restart browser</li>
              </ol>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> System freezes or becomes unresponsive
              <br />
              <strong>Recovery steps:</strong>
              <ol>
                <li><strong>Don't force-close immediately</strong> - wait 2 minutes for system to recover</li>
                <li>Open Task Manager (Ctrl+Shift+Esc) and check if browser is using excessive memory</li>
                <li>Close other applications to free up RAM</li>
                <li>If still frozen, close browser and restart</li>
                <li>Clear all browser data before logging back in</li>
                <li>If happening repeatedly, contact IT with your browser version and system specs</li>
              </ol>
            </div>
          </div>

          <h3>Data Synchronization and Saving Issues</h3>
          <div className={styles.troubleshootCategory}>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Changes made by one user not visible to others
              <br />
              <strong>Multi-user troubleshooting:</strong>
              <ol>
                <li>Verify the changes were actually saved (look for green "Saved" indicator)</li>
                <li>Have all affected users refresh their browsers (F5)</li>
                <li>Check if users are looking at the same roster version/date</li>
                <li>Verify all users have permission to view the modified data</li>
                <li>If persistent, this indicates a server synchronization issue - contact IT immediately</li>
              </ol>
            </div>

            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> "Network error" when trying to save changes
              <br />
              <strong>Connection diagnosis:</strong>
              <ol>
                <li>Check internet connection - try loading other websites</li>
                <li>Try saving again in 30 seconds (temporary network hiccup)</li>
                <li>Switch to mobile hotspot if available to test if it's your network</li>
                <li>Save work to clipboard/Excel as backup before retrying</li>
                <li>If using VPN, try disconnecting temporarily</li>
                <li>Contact IT if consistent across multiple devices/networks</li>
              </ol>
            </div>
          </div>

          <h3>Mobile and Tablet Specific Issues</h3>
          <div className={styles.troubleshootCategory}>
            <div className={styles.troubleshootItem}>
              <strong>Problem:</strong> Touch screen controls not responding properly
              <br />
              <strong>Mobile optimization:</strong>
              <ol>
                <li>Rotate device to landscape mode for better layout</li>
                <li>Use two-finger pinch to zoom out if interface appears cut off</li>
                <li>Try using stylus for more precise touch input</li>
                <li>Close background apps to free up memory</li>
                <li>Update your mobile browser to latest version</li>
                <li>For complex tasks, switch to desktop computer</li>
              </ol>
            </div>
          </div>

          <h3>When to Escalate to Support</h3>
          <div className={styles.escalationGuide}>
            <h4>Immediate Escalation (Call Emergency IT: ext. 9999)</h4>
            <ul>
              <li>System completely down preventing patient care coordination</li>
              <li>Data loss or corruption affecting published rosters</li>
              <li>Security issues or suspected unauthorized access</li>
              <li>Any issue affecting multiple users simultaneously</li>
            </ul>

            <h4>Standard IT Support (Call ext. 2000 during business hours)</h4>
            <ul>
              <li>Login problems persisting after trying all solutions above</li>
              <li>Performance issues consistently affecting workflow</li>
              <li>Email delivery problems</li>
              <li>Browser compatibility issues</li>
              <li>Feature requests or training needs</li>
            </ul>

            <h4>Department Manager/Scheduler Support</h4>
            <ul>
              <li>Permission and role assignment issues</li>
              <li>Roster generation rule questions</li>
              <li>Process and workflow clarifications</li>
              <li>Doctor availability and scheduling conflicts</li>
            </ul>
          </div>

          <div className={styles.preventionTips}>
            <h3>Preventing Common Issues</h3>
            <h4>Daily Prevention Habits</h4>
            <ul>
              <li><strong>Save frequently:</strong> Use Ctrl+S every few minutes when making changes</li>
              <li><strong>Use supported browsers:</strong> Chrome, Firefox, or Edge (avoid Internet Explorer)</li>
              <li><strong>Keep browsers updated:</strong> Enable automatic updates</li>
              <li><strong>Backup critical data:</strong> Export important rosters to Excel regularly</li>
              <li><strong>Test before publishing:</strong> Always preview emails and reports before sending</li>
            </ul>

            <h4>Weekly Maintenance</h4>
            <ul>
              <li>Clear browser cache and cookies</li>
              <li>Restart computer to clear memory</li>
              <li>Check for system announcements about upcoming maintenance</li>
              <li>Verify all doctor email addresses are current</li>
            </ul>
          </div>

          <div className={styles.troubleshootingFlowchart}>
            <h3>Quick Problem Resolution Flowchart</h3>
            <div className={styles.flowStep}>
              <strong>Step 1:</strong> Is this affecting patient care? → If YES: Call Emergency IT (ext. 9999)
            </div>
            <div className={styles.flowStep}>
              <strong>Step 2:</strong> Did you try refreshing (F5) and clearing cache? → If NO: Try this first
            </div>
            <div className={styles.flowStep}>
              <strong>Step 3:</strong> Does the problem persist in incognito mode? → If NO: Clear all browser data
            </div>
            <div className={styles.flowStep}>
              <strong>Step 4:</strong> Can other users reproduce the problem? → If YES: Contact IT Support
            </div>
            <div className={styles.flowStep}>
              <strong>Step 5:</strong> Have you tried on a different device? → If not working anywhere: IT Support
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'keyboard-shortcuts',
      title: 'Keyboard Shortcuts',
      readingTime: 2,
      keywords: ['hotkeys', 'navigation', 'schedule actions', 'search', 'productivity'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Keyboard Shortcuts</h2>
          <p>
            Speed up your workflow with these keyboard shortcuts.
          </p>
          
          <h3>Navigation</h3>
          <ul className={styles.shortcutList}>
            <li><kbd>Alt</kbd> + <kbd>D</kbd> - Go to Dashboard</li>
            <li><kbd>Alt</kbd> + <kbd>S</kbd> - Go to Schedule</li>
            <li><kbd>Alt</kbd> + <kbd>R</kbd> - Go to Reports</li>
            <li><kbd>Alt</kbd> + <kbd>C</kbd> - Go to Configuration</li>
            <li><kbd>Esc</kbd> - Close modal/dialog</li>
          </ul>

          <h3>Schedule Actions</h3>
          <ul className={styles.shortcutList}>
            <li><kbd>Ctrl</kbd> + <kbd>N</kbd> - New Roster</li>
            <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - Save Current Roster</li>
            <li><kbd>Ctrl</kbd> + <kbd>E</kbd> - Email Roster</li>
            <li><kbd>Ctrl</kbd> + <kbd>P</kbd> - Print View</li>
            <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> - Undo Last Change</li>
          </ul>

          <h3>View Controls</h3>
          <ul className={styles.shortcutList}>
            <li><kbd>1</kbd> - Calendar View</li>
            <li><kbd>2</kbd> - List View</li>
            <li><kbd>3</kbd> - Timeline View</li>
            <li><kbd>+</kbd> / <kbd>-</kbd> - Zoom In/Out</li>
            <li><kbd>Arrow Keys</kbd> - Navigate dates</li>
          </ul>

          <h3>Search & Filter</h3>
          <ul className={styles.shortcutList}>
            <li><kbd>Ctrl</kbd> + <kbd>F</kbd> - Search</li>
            <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> - Advanced Filter</li>
            <li><kbd>Enter</kbd> - Apply Filter</li>
            <li><kbd>Ctrl</kbd> + <kbd>X</kbd> - Clear Filters</li>
          </ul>
        </div>
      )
    },
    {
      id: 'frequently-asked-questions',
      title: 'Frequently Asked Questions',
      readingTime: 25,
      keywords: ['FAQ', 'common questions', 'availability', 'shift swaps', 'roster creation', 'reports', 'email'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Frequently Asked Questions - Quick Answers to Common Questions</h2>
          <p>
            This comprehensive FAQ section addresses the most common questions from Peninsula Health staff 
            about using Shift Happens v2.0. Questions are organized by topic and include both quick answers 
            and detailed explanations where helpful.
          </p>

          <div className={styles.faqSearch}>
            <h3>Quick Search Tips</h3>
            <p>Use Ctrl+F to search this page for specific topics like "email", "night shift", "availability", etc.</p>
          </div>

          <h3>Getting Started & Access</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: I'm new to Peninsula Health. How do I get access to Shift Happens?</strong>
              <p><strong>A:</strong> Your department manager needs to request access for you. Contact them with your full name, employee ID, email address, and the department you'll be working in. Access is usually granted within 24-48 hours.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: I can log in but can't see the Schedule menu. What's wrong?</strong>
              <p><strong>A:</strong> Your user role doesn't include scheduling permissions. Only Department Managers and Scheduling Coordinators can create and modify rosters. Contact your manager if you need these permissions for your role.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I use Shift Happens on my phone or tablet?</strong>
              <p><strong>A:</strong> Yes! The system works on mobile devices, though some complex tasks (like creating rosters) are easier on a computer. For quick checks of your schedule and availability updates, mobile works perfectly.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Do I need to install any special software?</strong>
              <p><strong>A:</strong> No installation needed! Shift Happens runs in your web browser. We recommend using Chrome, Firefox, or Edge for the best experience. Internet Explorer is not supported.</p>
            </div>
          </div>

          <h3>Viewing and Understanding Schedules</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: How far ahead can I see my schedule?</strong>
              <p><strong>A:</strong> Published rosters are typically available 3-4 weeks in advance. You can view up to 12 weeks of future schedules once they're published. Use the date picker at the top of the Schedule page to navigate between periods.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: What do the different colors in the schedule mean?</strong>
              <p><strong>A:</strong></p>
              <ul>
                <li><strong>Green:</strong> Normal scheduled shifts</li>
                <li><strong>Purple:</strong> Recently modified shifts (changed within the last 7 days)</li>
                <li><strong>Yellow:</strong> Shifts with special notes or requirements</li>
                <li><strong>Red:</strong> Vacant shifts that need to be filled</li>
                <li><strong>Gray:</strong> Past shifts or unavailable periods</li>
              </ul>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: I see 'VACANT' on some shifts. What does this mean?</strong>
              <p><strong>A:</strong> These are unfilled shifts that still need someone assigned. If you're available and qualified, you can volunteer for vacant shifts by contacting your scheduler. Vacant shifts are usually filled on a first-come, first-served basis.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I export my personal schedule to my phone's calendar?</strong>
              <p><strong>A:</strong> Yes! Go to your Dashboard → Export Schedule. You can download an .ics file that works with most calendar apps (iPhone Calendar, Google Calendar, Outlook). The file updates automatically when your schedule changes.</p>
            </div>
          </div>

          <h3>Availability and Time Off</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: When do I need to submit my availability for next month?</strong>
              <p><strong>A:</strong> Availability forms are due 6 weeks before the roster period begins. For example, availability for March rosters is due mid-January. You'll receive automated email reminders, but check the dashboard for exact deadlines.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I change my availability after I've submitted it?</strong>
              <p><strong>A:</strong> Yes, but only before the roster is generated (usually 4 weeks before the period starts). After that, changes require approval from your department manager and may not be possible if it affects coverage.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: How do I request annual leave or time off?</strong>
              <p><strong>A:</strong> Submit leave requests through your hospital's normal HR process first. Then mark those dates as "unavailable" in your Shift Happens availability form. Both steps are required - the system doesn't automatically sync with HR systems.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: I'm sick and can't work my shift today. What do I do?</strong>
              <p><strong>A:</strong> Call in sick following your department's normal procedure first. Then either contact your scheduler directly or use the "Request Emergency Replacement" feature if available in your system. Don't just mark yourself unavailable - rosters need to be actively managed.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I indicate I prefer not to work certain shift types?</strong>
              <p><strong>A:</strong> Yes! In your availability form, you can mark preferences for day/evening/night shifts. However, these are preferences, not guarantees. The system tries to accommodate preferences while ensuring fair distribution of less desirable shifts.</p>
            </div>
          </div>

          <h3>Shift Swaps and Changes</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: Can I swap shifts with another doctor?</strong>
              <p><strong>A:</strong> Yes, but both doctors must be qualified for each other's shifts, and the swap must be approved by your scheduler or department manager. Use the "Request Shift Swap" feature or contact your scheduler directly.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: How much notice do I need to give for a shift change?</strong>
              <p><strong>A:</strong> Generally, 48-72 hours minimum for non-emergency changes. Emergency situations (illness, family emergency) can be accommodated with less notice, but finding coverage becomes more difficult.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: I volunteered for extra shifts but haven't been assigned any. Why?</strong>
              <p><strong>A:</strong> Extra shifts are typically assigned based on: 1) Qualification requirements, 2) Recent overtime worked (fairness), 3) Response time to the request, and 4) Department scheduling rules. Contact your scheduler if you have questions about specific assignments.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I see who else is working when I'm on shift?</strong>
              <p><strong>A:</strong> Yes! Click on any date in the schedule to see the full roster for that day, including all doctors, nurses, and support staff scheduled. This helps you understand coverage levels and who to collaborate with.</p>
            </div>
          </div>

          <h3>Roster Creation and Management (For Managers)</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: How long should it take to create a monthly roster?</strong>
              <p><strong>A:</strong> With good availability data: 2-4 hours for initial generation and review. Without complete availability: 6-8 hours including follow-up with staff. Using templates and automatic generation significantly reduces time.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: What should I do if the system can't generate a roster automatically?</strong>
              <p><strong>A:</strong> This usually means your constraints are too restrictive. Check: 1) Do you have enough doctors for the required shifts? 2) Are availability restrictions too limiting? 3) Are shift requirements realistic? Try relaxing some "nice to have" constraints and focus on essential coverage first.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: How do I ensure fair distribution of night and weekend shifts?</strong>
              <p><strong>A:</strong> The system tracks "undesirable shift points" for each doctor over time. Set your fairness weight to 70% or higher in generation settings. Use the Fairness Report to verify equitable distribution before publishing rosters.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I copy a previous roster as a starting point?</strong>
              <p><strong>A:</strong> Yes! Use Template-based generation and select a successful previous roster. The system will adapt it for the new period, accounting for availability changes and date differences. This is often faster than starting from scratch.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: How do I handle doctors who never get their availability in on time?</strong>
              <p><strong>A:</strong> The system can generate rosters based on historical patterns for doctors without submitted availability. However, this should be a last resort. Consider setting departmental policies with consequences for late submissions.</p>
            </div>
          </div>

          <h3>Reports and Analytics</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: What reports should I review regularly?</strong>
              <p><strong>A:</strong> For ongoing management: Weekly Vacancy Report, Monthly Fairness Analysis, and Overtime Tracking Report. For planning: Doctor Statistics Report and Availability Compliance Report. Set up automated delivery for key reports.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I see how many hours each doctor worked last month?</strong>
              <p><strong>A:</strong> Yes! Go to Reports → Doctor Statistics Report. Select the date range and choose "Detailed Hours Report." This shows regular hours, overtime, and different shift types for each doctor. Perfect for payroll verification.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: How do I export data for external analysis?</strong>
              <p><strong>A:</strong> Most reports offer Excel export options. For custom analysis, use Reports → Data Export → Raw Schedule Data. This gives you a complete dataset that can be imported into other analytics tools.</p>
            </div>
          </div>

          <h3>Email and Communications</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: I didn't receive my roster email. Where is it?</strong>
              <p><strong>A:</strong> Check: 1) Spam/junk folder, 2) Email address is correct in your profile, 3) Hospital email filters aren't blocking system emails. If still missing, contact your scheduler - they can resend individual schedules.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: The roster PDF won't open on my phone. What can I do?</strong>
              <p><strong>A:</strong> Try: 1) Different PDF app (Adobe Reader, Google PDF Viewer), 2) Opening in your phone's browser, 3) Downloading to your device first, then opening. PDFs are optimized for printing - the mobile schedule view might be easier to read.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I get notifications when my schedule changes?</strong>
              <p><strong>A:</strong> Yes! In your Profile → Notification Preferences, enable "Schedule Change Alerts." You'll receive email notifications whenever your shifts are modified, usually within 15 minutes of the change.</p>
            </div>
          </div>

          <h3>System Performance and Technical</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: The system seems slow today. Is this normal?</strong>
              <p><strong>A:</strong> Performance can vary based on: time of day (slower during peak roster generation periods), network conditions, and system maintenance. If consistently slow for over 30 minutes, contact IT support.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: I accidentally deleted something important. Can it be recovered?</strong>
              <p><strong>A:</strong> The system maintains version history for rosters and major changes. Contact your system administrator immediately - they may be able to restore recent changes. This is why we recommend saving drafts frequently!</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can multiple people edit the same roster at once?</strong>
              <p><strong>A:</strong> Yes, but be careful! The system shows who else is currently editing and highlights conflicts. Save your work frequently, and communicate with other editors to avoid overwriting each other's changes.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Is my personal information secure in the system?</strong>
              <p><strong>A:</strong> Yes. Shift Happens uses hospital-grade security including encrypted connections, secure authentication, and access controls. Only authorized users in your department can see your schedule information.</p>
            </div>
          </div>

          <h3>Integration with Other Systems</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: Does Shift Happens sync with the hospital's payroll system?</strong>
              <p><strong>A:</strong> Integration varies by hospital configuration. Check with your payroll department or IT team. Many hospitals export shift data monthly for payroll processing rather than real-time sync.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Can I import my schedule into Outlook or Google Calendar?</strong>
              <p><strong>A:</strong> Yes! Use the "Export Schedule" feature to download calendar files (.ics format) that work with most calendar applications. These files can be set to update automatically when your schedule changes.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: Why doesn't my leave request from HR show up in Shift Happens?</strong>
              <p><strong>A:</strong> Most systems aren't directly connected. You need to: 1) Submit official leave request through HR, 2) Mark those dates unavailable in your Shift Happens availability form. Both steps are required for proper documentation.</p>
            </div>
          </div>

          <h3>Best Practices and Tips</h3>
          <div className={styles.faqCategory}>
            <div className={styles.faqItem}>
              <strong>Q: What's the best way to prepare for my first roster creation?</strong>
              <p><strong>A:</strong> 1) Ensure all doctors have submitted current availability, 2) Review the previous successful roster for patterns, 3) Identify any special requirements (conferences, leave, etc.), 4) Plan 2-3 hours of uninterrupted time, 5) Have backup coverage options ready for problematic shifts.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: How can I reduce the number of last-minute shift changes?</strong>
              <p><strong>A:</strong> Common strategies: 1) Publish rosters earlier (4+ weeks ahead), 2) Build in some flexibility/buffer shifts, 3) Maintain a pool of willing extra-shift workers, 4) Regular communication about upcoming needs, 5) Cross-train staff to cover multiple shift types.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: What should I do if staff complain about unfair scheduling?</strong>
              <p><strong>A:</strong> Use the Fairness Analysis report to show objective data about shift distribution. If genuine unfairness exists, adjust future rosters to compensate. Consider involving staff in reviewing fairness criteria and scheduling rules.</p>
            </div>

            <div className={styles.faqItem}>
              <strong>Q: How often should I backup or export roster data?</strong>
              <p><strong>A:</strong> Export completed rosters monthly after they're finalized. Keep local copies of critical rosters in case of system issues. The system maintains its own backups, but having local copies provides additional security for important schedules.</p>
            </div>
          </div>

          <div className={styles.stillNeedHelp}>
            <h3>Still Need Help?</h3>
            <p>If your question isn't answered here:</p>
            <ul>
              <li><strong>Search this guide:</strong> Use Ctrl+F to search for specific terms</li>
              <li><strong>Check the Troubleshooting section:</strong> For technical problems</li>
              <li><strong>Contact your department manager:</strong> For policy and process questions</li>
              <li><strong>Contact IT Support:</strong> For technical issues and system access</li>
              <li><strong>Submit feedback:</strong> Help us improve by suggesting new FAQ topics</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'contact-support',
      title: 'Contact & Support',
      readingTime: 3,
      keywords: ['help', 'IT support', 'scheduling support', 'emergency', 'feature requests', 'training'],
      content: (
        <div className={styles.sectionContent}>
          <h2>Contact & Support</h2>
          <p>
            Get help when you need it.
          </p>
          
          <h3>Support Channels</h3>
          
          <div className={styles.supportCard}>
            <h4>IT Help Desk</h4>
            <p>For technical issues and system access problems</p>
            <ul>
              <li>Phone: (03) 9784 7777 ext. 2000</li>
              <li>Email: ithelpdesk@peninsulahealth.org.au</li>
              <li>Hours: Monday-Friday 7:00 AM - 7:00 PM</li>
            </ul>
          </div>

          <div className={styles.supportCard}>
            <h4>Scheduling Support</h4>
            <p>For roster-related questions and scheduling assistance</p>
            <ul>
              <li>Email: scheduling@peninsulahealth.org.au</li>
              <li>Phone: (03) 9784 7777 ext. 2100</li>
              <li>Hours: Monday-Friday 8:00 AM - 5:00 PM</li>
            </ul>
          </div>

          <div className={styles.supportCard}>
            <h4>Training Resources</h4>
            <p>Learn more about using the system effectively</p>
            <ul>
              <li>Online training modules available on the intranet</li>
              <li>Monthly user group meetings</li>
              <li>One-on-one training sessions by request</li>
            </ul>
          </div>

          <h3>Reporting Issues</h3>
          <p>
            When reporting an issue, please provide:
          </p>
          <ol>
            <li>Your username and department</li>
            <li>Date and time the issue occurred</li>
            <li>Detailed description of the problem</li>
            <li>Steps to reproduce the issue</li>
            <li>Screenshots if applicable</li>
            <li>Any error messages received</li>
          </ol>

          <h3>Feature Requests</h3>
          <p>
            Have an idea to improve the system? Submit feature requests to:
          </p>
          <ul>
            <li>Email: shifthappens-feedback@peninsulahealth.org.au</li>
            <li>Include use case and expected benefits</li>
            <li>Requests reviewed monthly by the steering committee</li>
          </ul>

          <h3>Emergency Support</h3>
          <p>
            For critical system failures affecting patient care:
          </p>
          <div className={styles.emergencyBox}>
            <strong>24/7 Emergency IT Support</strong><br />
            Phone: (03) 9784 7777 ext. 9999<br />
            Follow prompts for critical system support
          </div>
        </div>
      )
    }
  ];

  // Enhanced search with keyword matching and result highlighting
  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return sections;
    
    const term = searchTerm.toLowerCase();
    const results = sections.filter(section => {
      const titleMatch = section.title.toLowerCase().includes(term);
      const keywordMatch = section.keywords?.some(keyword => keyword.toLowerCase().includes(term));
      const contentMatch = section.content && typeof section.content === 'object' && 
        'props' in section.content && 
        JSON.stringify(section.content.props).toLowerCase().includes(term);
      
      return titleMatch || keywordMatch || contentMatch;
    });
    
    // Update search results for highlighting
    setSearchResults(results.map(section => ({
      sectionId: section.id,
      matches: (section.content && typeof section.content === 'object' && 'props' in section.content) 
        ? (JSON.stringify(section.content.props).toLowerCase().match(new RegExp(term, 'g')) || []).length
        : 0
    })));
    
    return results;
  }, [sections, searchTerm]);

  // Enhanced scroll behavior with section tracking and progress
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Mark section as visited
      setReadingProgress(prev => {
        const updated = { ...prev, [activeSection]: true };
        localStorage.setItem('userguide-progress', JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeSection]);

  // Search highlighting and results
  useEffect(() => {
    if (searchTerm.trim()) {
      setSearchHighlights([searchTerm.trim()]);
    } else {
      setSearchHighlights([]);
      setSearchResults([]);
    }
  }, [searchTerm]);
  
  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const progress = Math.min((scrollTop / (scrollHeight - clientHeight)) * 100, 100);
        setScrollProgress(progress);
      }
    };
    
    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, []);
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            setSidebarCollapsed(prev => !prev);
            break;
          case 'p':
            e.preventDefault();
            setPrintMode(prev => !prev);
            break;
          case 'h':
            e.preventDefault();
            setHighContrast(prev => {
              const newValue = !prev;
              localStorage.setItem('userguide-high-contrast', JSON.stringify(newValue));
              return newValue;
            });
            break;
          case 'f':
            e.preventDefault();
            const searchInput = document.querySelector(`.${styles.searchInput}`) as HTMLInputElement;
            searchInput?.focus();
            break;
          case 'd':
            e.preventDefault();
            setDarkMode(prev => {
              const newValue = !prev;
              localStorage.setItem('userguide-dark-mode', JSON.stringify(newValue));
              return newValue;
            });
            break;
          case 't':
            e.preventDefault();
            setShowTooltips(prev => {
              const newValue = !prev;
              localStorage.setItem('userguide-show-tooltips', JSON.stringify(newValue));
              return newValue;
            });
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setSearchTerm('');
        setSearchHighlights([]);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Auto-save feedback and bookmarks
  useEffect(() => {
    localStorage.setItem('userguide-feedback', JSON.stringify(feedback));
  }, [feedback]);
  
  useEffect(() => {
    localStorage.setItem('userguide-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Enhanced accessibility and user preferences
  useEffect(() => {
    localStorage.setItem('userguide-dark-mode', JSON.stringify(darkMode));
    localStorage.setItem('userguide-font-size', fontSize);
    localStorage.setItem('userguide-show-tooltips', JSON.stringify(showTooltips));
    localStorage.setItem('userguide-animations', JSON.stringify(animationsEnabled));
  }, [darkMode, fontSize, showTooltips, animationsEnabled]);

  // Track visited sections for better UX
  useEffect(() => {
    setLastVisitedSections(prev => {
      const updated = [activeSection, ...prev.filter(s => s !== activeSection)].slice(0, 10);
      localStorage.setItem('userguide-last-visited', JSON.stringify(updated));
      return updated;
    });
  }, [activeSection]);

  // Enhanced scroll behavior with scrolling detection
  useEffect(() => {
    let scrollTimer: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll);
      return () => {
        contentElement.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimer);
      };
    }
  }, []);

  // Enhanced search with debouncing
  useEffect(() => {
    setIsSearching(true);
    const searchTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        // Perform search highlighting logic here
        const term = searchTerm.toLowerCase();
        const results: any[] = [];
        
        sections.forEach((section) => {
          // Search in title
          if (section.title.toLowerCase().includes(term)) {
            results.push({
              sectionId: section.id,
              title: section.title,
              type: 'title'
            });
          }
        });
        
        setSearchResults(results);
        setSearchHighlights([searchTerm.trim()]);
      } else {
        setSearchResults([]);
        setSearchHighlights([]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [searchTerm, sections]);

  // Copy feedback timeout
  useEffect(() => {
    if (copyFeedback) {
      const timer = setTimeout(() => {
        setCopyFeedback('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copyFeedback]);

  // Helper functions
  const addBookmark = useCallback((sectionId: string, title: string) => {
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      sectionId,
      title,
      timestamp: Date.now()
    };
    setBookmarks(prev => [...prev, newBookmark]);
  }, []);
  
  const removeBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  }, []);
  
  const toggleSectionCollapse = useCallback((sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);
  
  const copyToClipboard = useCallback(async (text: string, type: 'code' | 'link' = 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(`${type === 'code' ? 'Code' : 'Link'} copied to clipboard!`);
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyFeedback(`${type === 'code' ? 'Code' : 'Link'} copied to clipboard!`);
    }
  }, []);

  // Enhanced helper functions
  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const element = sectionRefs.current[sectionId];
    if (element && animationsEnabled) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [animationsEnabled]);

  const generateSectionLink = useCallback((sectionId: string) => {
    return `${window.location.origin}${window.location.pathname}#${sectionId}`;
  }, []);

  const handlePrint = useCallback(() => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 100);
  }, []);

  const resetProgress = useCallback(() => {
    if (window.confirm('Are you sure you want to reset all reading progress? This action cannot be undone.')) {
      setReadingProgress({});
      localStorage.removeItem('userguide-progress');
    }
  }, []);

  const exportBookmarks = useCallback(() => {
    const bookmarkData = {
      bookmarks,
      exportDate: new Date().toISOString(),
      version: '2.0'
    };
    const blob = new Blob([JSON.stringify(bookmarkData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `userguide-bookmarks-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [bookmarks]);

  const toggleFontSize = useCallback(() => {
    const sizes: ('small' | 'normal' | 'large')[] = ['small', 'normal', 'large'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setFontSize(nextSize);
  }, [fontSize]);
  
  const submitFeedback = useCallback((sectionId: string, rating: 'helpful' | 'not-helpful') => {
    setFeedback(prev => ({
      ...prev,
      [sectionId]: rating
    }));
  }, []);
  
  const getTotalReadingTime = useMemo(() => {
    return filteredSections.reduce((total, section) => total + (section.readingTime || 0), 0);
  }, [filteredSections]);
  
  const getProgressPercentage = useMemo(() => {
    const completedSections = Object.values(readingProgress).filter(Boolean).length;
    const totalSections = sections.length;
    return totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  }, [readingProgress, sections.length]);
  
  const currentSection = useMemo(() => {
    return sections.find(s => s.id === activeSection);
  }, [sections, activeSection]);
  
  return (
    <div className={`${styles.userGuide} ${highContrast ? styles.highContrast : ''} ${printMode ? styles.printMode : ''} ${darkMode ? styles.darkMode : ''} ${styles[`fontSize-${fontSize}`]} ${!animationsEnabled ? styles.reducedMotion : ''} ${isScrolling ? styles.scrolling : ''}`}>
      {/* Accessibility skip links */}
      <div className={styles.skipLinks}>
        <a href="#main-content" className={styles.skipLink}>Skip to main content</a>
        <a href="#table-of-contents" className={styles.skipLink}>Skip to table of contents</a>
      </div>
      
      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${scrollProgress}%` }}
          role="progressbar"
          aria-valuenow={Math.round(scrollProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Reading progress: ${Math.round(scrollProgress)}%`}
        />
      </div>
      
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label="Go back to previous page"
          >
            ← Back
          </button>
          <h1 id="page-title">User Guide - Shift Happens v2.0</h1>
        </div>
        
        <div className={styles.headerCenter}>
          <div className={styles.progressIndicator}>
            <span className={styles.progressText}>
              {getProgressPercentage}% Complete ({Object.values(readingProgress).filter(Boolean).length}/{sections.length} sections)
            </span>
            <div className={styles.progressStats}>
              <span className={styles.readingTime}>
                📖 {getTotalReadingTime} min read
              </span>
              {bookmarks.length > 0 && (
                <span className={styles.bookmarkCount}>
                  🔖 {bookmarks.length} bookmarked
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search user guide... (Alt+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              aria-label="Search user guide content"
            />
            {searchTerm && (
              <button 
                className={styles.clearSearch}
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            {searchResults.length > 0 && (
              <div className={styles.searchStats}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {/* Search indicator */}
          {isSearching && (
            <div className={styles.searchingIndicator}>
              <div className={styles.spinner} aria-hidden="true" />
              <span className={styles.srOnly}>Searching...</span>
            </div>
          )}
          
          <div className={styles.headerActions}>
            <button
              className={`${styles.actionButton} ${sidebarCollapsed ? styles.active : ''}`}
              onClick={() => setSidebarCollapsed(prev => !prev)}
              aria-label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              title="Toggle Sidebar (Alt+B)"
              {...(showTooltips && { 'data-tooltip': `${sidebarCollapsed ? 'Show' : 'Hide'} sidebar (Alt+B)` })}
            >
              <MenuIcon className={styles.actionIcon} />
            </button>
            
            <button
              className={`${styles.actionButton} ${darkMode ? styles.active : ''}`}
              onClick={() => setDarkMode(prev => {
                const newValue = !prev;
                localStorage.setItem('userguide-dark-mode', JSON.stringify(newValue));
                return newValue;
              })}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              title="Toggle Dark Mode (Alt+D)"
              {...(showTooltips && { 'data-tooltip': `${darkMode ? 'Light' : 'Dark'} mode (Alt+D)` })}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            <button
              className={`${styles.actionButton} ${highContrast ? styles.active : ''}`}
              onClick={() => setHighContrast(prev => {
                const newValue = !prev;
                localStorage.setItem('userguide-high-contrast', JSON.stringify(newValue));
                return newValue;
              })}
              aria-label={highContrast ? 'Disable high contrast' : 'Enable high contrast'}
              title="Toggle High Contrast (Alt+H)"
              {...(showTooltips && { 'data-tooltip': `${highContrast ? 'Disable' : 'Enable'} high contrast (Alt+H)` })}
            >
              {highContrast ? '🔆' : '🔅'}
            </button>
            
            <button
              className={styles.actionButton}
              onClick={toggleFontSize}
              aria-label={`Font size: ${fontSize}. Click to change.`}
              title={`Font Size: ${fontSize} (click to cycle)`}
              {...(showTooltips && { 'data-tooltip': `Font size: ${fontSize} (click to cycle)` })}
            >
              {fontSize === 'small' ? '🔤' : fontSize === 'normal' ? '🔠' : '🔡'}
            </button>
            
            <button
              className={`${styles.actionButton} ${!showTooltips ? styles.disabled : ''}`}
              onClick={() => setShowTooltips(prev => {
                const newValue = !prev;
                localStorage.setItem('userguide-show-tooltips', JSON.stringify(newValue));
                return newValue;
              })}
              aria-label={showTooltips ? 'Hide tooltips' : 'Show tooltips'}
              title="Toggle Tooltips (Alt+T)"
              {...(showTooltips && { 'data-tooltip': `${showTooltips ? 'Hide' : 'Show'} tooltips (Alt+T)` })}
            >
              {showTooltips ? '💬' : '💭'}
            </button>
            
            <button
              className={styles.actionButton}
              onClick={handlePrint}
              aria-label="Print user guide"
              title="Print Guide"
              {...(showTooltips && { 'data-tooltip': 'Print user guide' })}
            >
              <PrintIcon className={styles.actionIcon} />
            </button>
          </div>
        </div>
      </div>

      {/* Copy feedback notification */}
      {copyFeedback && (
        <div className={styles.copyNotification} role="status" aria-live="polite">
          <div className={styles.copyNotificationContent}>
            {copyFeedback}
          </div>
        </div>
      )}

      <div className={styles.container}>
        {/* Enhanced Sidebar with bookmarks and navigation */}
        <nav 
          className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}
          id="table-of-contents"
          role="navigation"
          aria-label="User guide navigation"
        >
          {!sidebarCollapsed && (
            <>
              <div className={styles.sidebarHeader}>
                <h3>Table of Contents</h3>
                <div className={styles.sidebarStats}>
                  <span className={styles.completionRate}>
                    {getProgressPercentage}% complete
                  </span>
                </div>
              </div>
              
              {/* Quick Navigation Tabs */}
              <div className={styles.navTabs}>
                <button 
                  className={`${styles.navTab} ${tocVisible ? styles.navTabActive : ''}`}
                  onClick={() => setTocVisible(true)}
                  aria-pressed={tocVisible}
                >
                  📚 Contents
                </button>
                <button 
                  className={`${styles.navTab} ${!tocVisible ? styles.navTabActive : ''}`}
                  onClick={() => setTocVisible(false)}
                  aria-pressed={!tocVisible}
                >
                  🔖 Bookmarks ({bookmarks.length})
                </button>
              </div>
              
              {tocVisible ? (
                <ul className={styles.navList} role="list">
                  {filteredSections.map(section => {
                    const isBookmarked = bookmarks.some(b => b.sectionId === section.id);
                    const isCompleted = readingProgress[section.id];
                    const searchMatches = searchResults.find(r => r.sectionId === section.id)?.matches || 0;
                    
                    return (
                      <li key={section.id} className={styles.navListItem}>
                        <div className={styles.navItemContainer}>
                          <button
                            className={`${styles.navItem} ${
                              activeSection === section.id ? styles.active : ''
                            } ${isCompleted ? styles.completed : ''}`}
                            onClick={() => setActiveSection(section.id)}
                            aria-current={activeSection === section.id ? 'page' : undefined}
                          >
                            <div className={styles.navItemContent}>
                              <span className={styles.navItemTitle}>
                                {isCompleted && <span className={styles.completedIcon}>✓</span>}
                                {section.title}
                              </span>
                              <div className={styles.navItemMeta}>
                                {section.readingTime && (
                                  <span className={styles.readingTimeSmall}>
                                    {section.readingTime}m
                                  </span>
                                )}
                                {searchMatches > 0 && (
                                  <span className={styles.searchMatch}>
                                    {searchMatches} match{searchMatches !== 1 ? 'es' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                          
                          <div className={styles.navItemActions}>
                            <button
                              className={`${styles.bookmarkButton} ${isBookmarked ? styles.bookmarked : ''}`}
                              onClick={() => {
                                if (isBookmarked) {
                                  const bookmark = bookmarks.find(b => b.sectionId === section.id);
                                  if (bookmark) removeBookmark(bookmark.id);
                                } else {
                                  addBookmark(section.id, section.title);
                                }
                              }}
                              aria-label={isBookmarked ? `Remove bookmark from ${section.title}` : `Add bookmark to ${section.title}`}
                              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                              {...(showTooltips && { 
                                'data-tooltip': isBookmarked ? 'Remove bookmark' : 'Add bookmark' 
                              })}
                            >
                              <BookmarkIcon filled={isBookmarked} className={styles.bookmarkIcon} />
                            </button>
                            
                            <button
                              className={styles.shareButton}
                              onClick={() => copyToClipboard(generateSectionLink(section.id), 'link')}
                              aria-label={`Copy link to ${section.title}`}
                              title="Copy section link"
                              {...(showTooltips && { 'data-tooltip': 'Copy section link' })}
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className={styles.bookmarksList}>
                  {bookmarks.length === 0 ? (
                    <div className={styles.emptyBookmarks}>
                      <div className={styles.emptyBookmarksIcon}>📚</div>
                      <p className={styles.emptyBookmarksTitle}>No bookmarks yet</p>
                      <p className={styles.emptyBookmarksHint}>
                        Click the <BookmarkIcon className={styles.inlineIcon} /> icon next to any section to bookmark it for quick access
                      </p>
                    </div>
                  ) : (
                    <ul className={styles.bookmarksNavList}>
                      {bookmarks.map(bookmark => (
                        <li key={bookmark.id} className={styles.bookmarkItem}>
                          <button
                            className={`${styles.bookmarkNavItem} ${activeSection === bookmark.sectionId ? styles.active : ''}`}
                            onClick={() => setActiveSection(bookmark.sectionId)}
                            {...(showTooltips && { 'data-tooltip': `Go to ${bookmark.title}` })}
                          >
                            <div className={styles.bookmarkContent}>
                              <span className={styles.bookmarkTitle}>
                                <BookmarkIcon filled className={styles.bookmarkTitleIcon} />
                                {bookmark.title}
                              </span>
                              <span className={styles.bookmarkDate}>
                                Added {new Date(bookmark.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          </button>
                          <div className={styles.bookmarkActions}>
                            <button
                              className={styles.shareBookmarkButton}
                              onClick={() => copyToClipboard(generateSectionLink(bookmark.sectionId), 'link')}
                              aria-label={`Copy link to ${bookmark.title}`}
                              {...(showTooltips && { 'data-tooltip': 'Copy link' })}
                            >
                              📋
                            </button>
                            <button
                              className={styles.removeBookmark}
                              onClick={() => removeBookmark(bookmark.id)}
                              aria-label={`Remove bookmark for ${bookmark.title}`}
                              {...(showTooltips && { 'data-tooltip': 'Remove bookmark' })}
                            >
                              <CloseIcon className={styles.removeIcon} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {/* Enhanced sidebar actions */}
              <div className={styles.sidebarActions}>
                {bookmarks.length > 0 && (
                  <button
                    className={styles.sidebarActionButton}
                    onClick={exportBookmarks}
                    title="Export bookmarks"
                    {...(showTooltips && { 'data-tooltip': 'Export bookmarks to file' })}
                  >
                    💾 Export Bookmarks
                  </button>
                )}
                
                {Object.values(readingProgress).some(Boolean) && (
                  <button
                    className={styles.sidebarActionButton}
                    onClick={resetProgress}
                    title="Reset reading progress"
                    {...(showTooltips && { 'data-tooltip': 'Reset all reading progress' })}
                  >
                    🔄 Reset Progress
                  </button>
                )}
              </div>

              {/* Enhanced keyboard shortcuts */}
              <div className={styles.keyboardHints}>
                <div className={styles.keyboardHintsTitle}>⌨️ Keyboard Shortcuts</div>
                <div className={styles.keyboardHintsList}>
                  <div className={styles.keyboardHint}>
                    <kbd>Alt+B</kbd> <span>Toggle sidebar</span>
                  </div>
                  <div className={styles.keyboardHint}>
                    <kbd>Alt+F</kbd> <span>Focus search</span>
                  </div>
                  <div className={styles.keyboardHint}>
                    <kbd>Alt+D</kbd> <span>Dark mode</span>
                  </div>
                  <div className={styles.keyboardHint}>
                    <kbd>Alt+H</kbd> <span>High contrast</span>
                  </div>
                  <div className={styles.keyboardHint}>
                    <kbd>Alt+T</kbd> <span>Toggle tooltips</span>
                  </div>
                  <div className={styles.keyboardHint}>
                    <kbd>Alt+P</kbd> <span>Print mode</span>
                  </div>
                  <div className={styles.keyboardHint}>
                    <kbd>Esc</kbd> <span>Clear search</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </nav>

        <main className={styles.content} id="main-content" ref={contentRef}>
          {currentSection ? (
            <article className={styles.sectionWrapper} role="main">
              {/* Section Header with Actions */}
              <header className={styles.sectionHeader}>
                <div className={styles.sectionHeaderLeft}>
                  <div className={styles.breadcrumb}>
                    <span className={styles.breadcrumbItem}>User Guide</span>
                    <span className={styles.breadcrumbSeparator}>›</span>
                    <span className={styles.breadcrumbCurrent}>{currentSection.title}</span>
                  </div>
                  
                  {currentSection.readingTime && (
                    <div className={styles.sectionMeta}>
                      <span className={styles.readingTimeEstimate}>
                        📖 Estimated reading time: {currentSection.readingTime} minutes
                      </span>
                    </div>
                  )}
                </div>
                
                <div className={styles.sectionHeaderRight}>
                  <div className={styles.sectionActions}>
                    {(() => {
                      const isBookmarked = bookmarks.some(b => b.sectionId === currentSection.id);
                      return (
                        <button
                          className={`${styles.sectionActionButton} ${isBookmarked ? styles.bookmarked : ''}`}
                          onClick={() => {
                            if (isBookmarked) {
                              const bookmark = bookmarks.find(b => b.sectionId === currentSection.id);
                              if (bookmark) removeBookmark(bookmark.id);
                            } else {
                              addBookmark(currentSection.id, currentSection.title);
                            }
                          }}
                          aria-label={`${isBookmarked ? 'Remove' : 'Add'} bookmark for ${currentSection.title}`}
                          {...(showTooltips && { 
                            'data-tooltip': `${isBookmarked ? 'Remove' : 'Add'} bookmark` 
                          })}
                        >
                          <BookmarkIcon filled={isBookmarked} className={styles.actionButtonIcon} />
                          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                        </button>
                      );
                    })()}
                    
                    <button
                      className={styles.sectionActionButton}
                      onClick={() => copyToClipboard(generateSectionLink(currentSection.id), 'link')}
                      aria-label={`Copy link to ${currentSection.title}`}
                      {...(showTooltips && { 'data-tooltip': 'Copy section link' })}
                    >
                      <CopyIcon className={styles.actionButtonIcon} />
                      Share
                    </button>
                    
                    <button
                      className={styles.sectionActionButton}
                      onClick={handlePrint}
                      aria-label="Print this section"
                      {...(showTooltips && { 'data-tooltip': 'Print section' })}
                    >
                      <PrintIcon className={styles.actionButtonIcon} />
                      Print
                    </button>
                    
                    <button
                      className={styles.sectionActionButton}
                      onClick={() => toggleSectionCollapse(currentSection.id)}
                      aria-label={`${
                        collapsedSections[currentSection.id] ? 'Expand' : 'Collapse'
                      } ${currentSection.title} section`}
                      {...(showTooltips && { 
                        'data-tooltip': `${collapsedSections[currentSection.id] ? 'Expand' : 'Collapse'} section` 
                      })}
                    >
                      <ChevronDownIcon className={`${styles.actionButtonIcon} ${collapsedSections[currentSection.id] ? styles.rotated : ''}`} />
                      {collapsedSections[currentSection.id] ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                </div>
              </header>
              
              {/* Section Content */}
              <div 
                className={`${styles.sectionContent} ${
                  collapsedSections[currentSection.id] ? styles.sectionCollapsed : ''
                }`}
                ref={el => {
                  if (el) sectionRefs.current[currentSection.id] = el;
                }}
              >
                {currentSection.content}
              </div>
              
              {/* Enhanced Section Footer with Feedback */}
              <footer className={styles.sectionFooter}>
                <div className={styles.feedbackSection} role="region" aria-label="Section feedback">
                  <div className={styles.feedbackHeader}>
                    <h4 className={styles.feedbackTitle}>Was this section helpful?</h4>
                    <p className={styles.feedbackSubtitle}>Your feedback helps us improve the user guide</p>
                  </div>
                  
                  <div className={styles.feedbackButtons} role="group" aria-label="Rate section helpfulness">
                    <button
                      className={`${styles.feedbackButton} ${styles.feedbackPositive} ${
                        feedback[currentSection.id] === 'helpful' ? styles.feedbackActive : ''
                      }`}
                      onClick={() => submitFeedback(currentSection.id, 'helpful')}
                      aria-pressed={feedback[currentSection.id] === 'helpful'}
                      {...(showTooltips && { 'data-tooltip': 'Mark section as helpful' })}
                    >
                      <ThumbsUpIcon className={styles.feedbackIcon} />
                      <span>Yes, helpful</span>
                    </button>
                    <button
                      className={`${styles.feedbackButton} ${styles.feedbackNegative} ${
                        feedback[currentSection.id] === 'not-helpful' ? styles.feedbackActive : ''
                      }`}
                      onClick={() => submitFeedback(currentSection.id, 'not-helpful')}
                      aria-pressed={feedback[currentSection.id] === 'not-helpful'}
                      {...(showTooltips && { 'data-tooltip': 'Mark section as not helpful' })}
                    >
                      <ThumbsDownIcon className={styles.feedbackIcon} />
                      <span>Not helpful</span>
                    </button>
                  </div>
                  
                  {feedback[currentSection.id] && (
                    <div className={styles.feedbackThanks} role="status" aria-live="polite">
                      <div className={styles.feedbackThankMessage}>
                        <span className={styles.feedbackThankIcon}>✨</span>
                        <p>Thank you for your feedback!</p>
                      </div>
                      {feedback[currentSection.id] === 'not-helpful' && (
                        <div className={styles.feedbackSuggestion}>
                          <p>
                            Need more help? <button 
                              className={styles.feedbackLink}
                              onClick={() => setActiveSection('contact-support')}
                            >
                              Contact support
                            </button> for additional assistance.
                          </p>
                        </div>
                      )}
                      {feedback[currentSection.id] === 'helpful' && (
                        <div className={styles.feedbackSuggestion}>
                          <p>
                            Great! Consider <button 
                              className={styles.feedbackLink}
                              onClick={() => {
                                const isBookmarked = bookmarks.some(b => b.sectionId === currentSection.id);
                                if (!isBookmarked) {
                                  addBookmark(currentSection.id, currentSection.title);
                                }
                              }}
                            >
                              bookmarking this section
                            </button> for quick access later.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Section Navigation */}
                <div className={styles.sectionNavigation}>
                  {(() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
                    const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;
                    
                    return (
                      <>
                        {prevSection && (
                          <button
                            className={styles.sectionNavButton}
                            onClick={() => setActiveSection(prevSection.id)}
                          >
                            ← Previous: {prevSection.title}
                          </button>
                        )}
                        {nextSection && (
                          <button
                            className={`${styles.sectionNavButton} ${styles.sectionNavNext}`}
                            onClick={() => setActiveSection(nextSection.id)}
                          >
                            Next: {nextSection.title} →
                          </button>
                        )}
                      </>
                    );
                  })()
                  }
                </div>
              </footer>
            </article>
          ) : (
            <div className={styles.sectionContent}>
              <h2>Section Not Found</h2>
              <p>Please select a section from the navigation menu.</p>
            </div>
          )}

          <div className={styles.footer}>
            <div className={styles.footerContent}>
              <div className={styles.footerLeft}>
                <p className={styles.version}>Version 2.0 - Last Updated: January 2025</p>
                <p className={styles.copyright}>© 2025 Peninsula Health - All Rights Reserved</p>
              </div>
              
              <div className={styles.footerRight}>
                <div className={styles.footerStats}>
                  <span>📚 {sections.length} sections</span>
                  <span>⏱️ {getTotalReadingTime} min total</span>
                  <span>✅ {Object.values(readingProgress).filter(Boolean).length} completed</span>
                  <span>🔖 {bookmarks.length} bookmarked</span>
                </div>
                
                <div className={styles.footerActions}>
                  <button
                    className={styles.footerAction}
                    onClick={() => {
                      setReadingProgress({});
                      setBookmarks([]);
                      setFeedback({});
                      localStorage.removeItem('userguide-progress');
                      localStorage.removeItem('userguide-bookmarks');
                      localStorage.removeItem('userguide-feedback');
                    }}
                    title="Reset all progress, bookmarks, and feedback"
                  >
                    🔄 Reset Progress
                  </button>
                  
                  <button
                    className={styles.footerAction}
                    onClick={() => {
                      const data = {
                        progress: readingProgress,
                        bookmarks,
                        feedback,
                        exportedAt: new Date().toISOString()
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'userguide-progress.json';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    title="Export your progress data"
                  >
                    💾 Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Copy feedback toast (could be enhanced with a proper toast system) */}
      <div className={styles.copyToast} id="copy-toast" role="alert" aria-live="polite"></div>
    </div>
  );
};

export default UserGuide;