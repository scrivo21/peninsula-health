import React, { useState, useEffect } from 'react';
import { healthService, HealthStatus } from '../../services/healthApi';
import styles from './HealthIndicator.module.css';

export interface HealthIndicatorProps {
  showDetails?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({
  showDetails = false,
  size = 'medium'
}) => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>(
    healthService.getCurrentStatus()
  );
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    // Start monitoring when component mounts
    if (!healthService.isMonitoring()) {
      healthService.startMonitoring();
    }

    // Subscribe to health updates
    const unsubscribe = healthService.subscribe((status) => {
      const wasHealthy = healthStatus.healthy;
      const isHealthy = status.healthy;
      
      // Trigger blink animation on status change
      if (wasHealthy !== isHealthy) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 1000);
      }
      
      setHealthStatus(status);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [healthStatus.healthy]);

  const getStatusColor = (): string => {
    return healthStatus.healthy ? '#28a745' : '#dc3545'; // Green or Red
  };

  const getStatusText = (): string => {
    if (healthStatus.healthy) {
      return 'Online';
    } else {
      return 'Offline';
    }
  };

  const getDetailedStatus = (): string => {
    if (healthStatus.healthy) {
      const responseTime = healthStatus.responseTime;
      if (responseTime !== undefined) {
        if (responseTime < 100) return 'Excellent';
        if (responseTime < 300) return 'Good';
        if (responseTime < 1000) return 'Slow';
        return 'Very Slow';
      }
      return 'Online';
    } else {
      return healthStatus.error || 'Offline';
    }
  };

  const formatLastChecked = (): string => {
    const now = Date.now();
    const diff = now - healthStatus.timestamp;
    
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  const handleClick = () => {
    // Manual health check when clicked
    healthService.checkHealth();
  };

  return (
    <div 
      className={`${styles.healthIndicator} ${styles[size]} ${isBlinking ? styles.blinking : ''}`}
      onClick={handleClick}
      title={showDetails ? getDetailedStatus() : `Backend Status: ${getStatusText()}`}
    >
      <div 
        className={`${styles.statusDot} ${healthStatus.healthy ? styles.healthy : styles.offline}`}
        style={{ backgroundColor: getStatusColor() }}
      />
      
      {showDetails && (
        <div className={styles.statusDetails}>
          <span className={styles.statusText}>
            Backend: {getStatusText()}
          </span>
          <span className={styles.lastChecked}>
            {formatLastChecked()}
          </span>
          {healthStatus.healthy && healthStatus.responseTime && (
            <span className={styles.responseTime}>
              {healthStatus.responseTime}ms
            </span>
          )}
        </div>
      )}
      
      {!showDetails && (
        <span className={styles.simpleStatus}>
          Backend
        </span>
      )}
    </div>
  );
};

export default HealthIndicator;