import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getRandomMedicalQuoteSync, getCachedQuotes } from '../../utils/medicalQuotes';
import { Logo } from '../Logo';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const [quote, setQuote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadQuote = async () => {
      setIsLoading(true);
      
      try {
        // Try to get quotes from config.json
        const quotes = await getCachedQuotes();
        const randomIndex = Math.floor(Math.random() * quotes.length);
        setQuote(quotes[randomIndex]);
      } catch (error) {
        // Fallback to synchronous method
        console.warn('Falling back to sync quotes due to error:', error);
        setQuote(getRandomMedicalQuoteSync());
      } finally {
        setIsLoading(false);
      }
    };

    loadQuote();
  }, []);

  const refreshQuote = async () => {
    setIsLoading(true);
    
    try {
      const quotes = await getCachedQuotes();
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setQuote(quotes[randomIndex]);
    } catch (error) {
      setQuote(getRandomMedicalQuoteSync());
    } finally {
      setIsLoading(false);
    }
  };

  const getQuoteType = (quote: string): string => {
    if (quote.startsWith('Fun Fact:')) return 'fact';
    if (quote.startsWith('Health Tip:')) return 'tip';
    if (quote.startsWith('Medical Milestone:')) return 'milestone';
    if (quote.startsWith('Healthcare Inspiration:')) return 'inspiration';
    if (quote.startsWith('Did you know?')) return 'didyouknow';
    if (quote.startsWith('Emergency Medicine:')) return 'emergency';
    if (quote.startsWith('Mental Health Matters:')) return 'mental';
    if (quote.includes(' - ')) return 'quote';
    return 'general';
  };

  const getQuoteIcon = (type: string): string => {
    switch (type) {
      case 'fact': return '🧠';
      case 'tip': return '💡';
      case 'milestone': return '🏆';
      case 'inspiration': return '💙';
      case 'didyouknow': return '❓';
      case 'emergency': return '🚨';
      case 'mental': return '🧘';
      case 'quote': return '💬';
      default: return '⚕️';
    }
  };

  const formatQuote = (quote: string): { text: string; author?: string } => {
    if (quote.includes(' - ') && !quote.startsWith('Fun Fact:') && !quote.startsWith('Health Tip:')) {
      const parts = quote.split(' - ');
      return {
        text: parts[0].trim(),
        author: parts.slice(1).join(' - ').trim()
      };
    }
    return { text: quote };
  };

  const quoteType = getQuoteType(quote);
  const quoteIcon = getQuoteIcon(quoteType);
  const formattedQuote = formatQuote(quote);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.quoteSection}>
          <div className={styles.quoteHeader}>
            <span className={styles.quoteIcon}>{quoteIcon}</span>
            <span className={styles.quoteLabel}>
              {quoteType === 'quote' ? 'Medical Quote' : 
               quoteType === 'fact' ? 'Fun Fact' :
               quoteType === 'tip' ? 'Health Tip' :
               quoteType === 'milestone' ? 'Medical Milestone' :
               quoteType === 'inspiration' ? 'Healthcare Inspiration' :
               quoteType === 'didyouknow' ? 'Did You Know?' :
               quoteType === 'emergency' ? 'Emergency Medicine' :
               quoteType === 'mental' ? 'Mental Health' :
               'Medical Wisdom'}
            </span>
            <button 
              className={styles.refreshButton}
              onClick={refreshQuote}
              disabled={isLoading}
              title="Get a new quote"
            >
              {isLoading ? '⏳' : '🔄'}
            </button>
          </div>
          
          <div className={styles.quoteContent}>
            {isLoading ? (
              <div className={styles.loadingState}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>Loading medical wisdom...</span>
              </div>
            ) : (
              <div className={styles.quoteText}>
                <span className={styles.mainText}>{formattedQuote.text}</span>
                {formattedQuote.author && (
                  <span className={styles.authorText}>— {formattedQuote.author}</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Footer Navigation */}
        <div className={styles.footerNav}>
          <div className={styles.navSection}>
            <div className={styles.logoSection}>
              <Logo size="small" showText={true} />
              <p className={styles.tagline}>Advanced Hospital Scheduling</p>
            </div>
          </div>

          <div className={styles.navSection}>
            <h4 className={styles.sectionTitle}>Navigation</h4>
            <div className={styles.linkList}>
              <Link to="/dashboard" className={styles.navLink}>Dashboard</Link>
              <Link to="/schedule" className={styles.navLink}>Schedules</Link>
              <Link to="/doctors" className={styles.navLink}>Doctors</Link>
              <Link to="/reports" className={styles.navLink}>Reports</Link>
              <Link to="/shifts" className={styles.navLink}>Shifts</Link>
              <Link to="/config" className={styles.navLink}>Configuration</Link>
            </div>
          </div>

          <div className={styles.navSection}>
            <h4 className={styles.sectionTitle}>Resources</h4>
            <div className={styles.linkList}>
              <Link to="/help/user-guide" className={styles.navLink}>User Guide</Link>
              <Link to="/help/faq" className={styles.navLink}>FAQ</Link>
              <Link to="/help/support" className={styles.navLink}>Support</Link>
              <Link to="/help/changelog" className={styles.navLink}>Changelog</Link>
            </div>
          </div>

          <div className={styles.navSection}>
            <h4 className={styles.sectionTitle}>Peninsula Health</h4>
            <div className={styles.contactInfo}>
              <p className={styles.contactItem}>
                <span className={styles.contactIcon}>📍</span>
                2 Hastings Rd, Frankston VIC 3199
              </p>
              <p className={styles.contactItem}>
                <span className={styles.contactIcon}>📞</span>
                (03) 9784 7777
              </p>
              <p className={styles.contactItem}>
                <span className={styles.contactIcon}>🌐</span>
                peninsulahealth.org.au
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className={styles.footerBottom}>
          <div className={styles.footerInfo}>
            <div className={styles.appInfo}>
              <span className={styles.appName}>Shift Happens v2.0</span>
              <span className={styles.separator}>•</span>
              <span className={styles.hospitalName}>Peninsula Health</span>
              <span className={styles.separator}>•</span>
              <span className={styles.yearText}>© 2025</span>
            </div>
            
            <div className={styles.footerLinks}>
              <Link to="/legal/privacy" className={styles.footerLink}>Privacy</Link>
              <span className={styles.separator}>•</span>
              <Link to="/legal/terms" className={styles.footerLink}>Terms</Link>
              <span className={styles.separator}>•</span>
              <Link to="/help/support" className={styles.footerLink}>Support</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;