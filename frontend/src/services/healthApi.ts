export interface HealthStatus {
  healthy: boolean;
  timestamp: number;
  responseTime?: number;
  error?: string;
}

class HealthService {
  private baseUrl: string;
  private checkInterval: number;
  private listeners: Set<(status: HealthStatus) => void>;
  private currentStatus: HealthStatus;
  private intervalId: NodeJS.Timeout | null;

  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.checkInterval = 5000; // 5 seconds
    this.listeners = new Set();
    this.currentStatus = {
      healthy: false,
      timestamp: Date.now()
    };
    this.intervalId = null;
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      const healthy = response.ok;

      const status: HealthStatus = {
        healthy,
        timestamp: Date.now(),
        responseTime,
        error: healthy ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };

      this.currentStatus = status;
      this.notifyListeners(status);
      
      return status;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = 'Network error';
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = 'Request timeout';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      const status: HealthStatus = {
        healthy: false,
        timestamp: Date.now(),
        responseTime,
        error: errorMessage
      };

      this.currentStatus = status;
      this.notifyListeners(status);
      
      return status;
    }
  }

  startMonitoring(): void {
    if (this.intervalId) {
      this.stopMonitoring();
    }

    // Initial check
    this.checkHealth();

    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkHealth();
    }, this.checkInterval);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getCurrentStatus(): HealthStatus {
    return this.currentStatus;
  }

  subscribe(callback: (status: HealthStatus) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current status
    callback(this.currentStatus);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(status: HealthStatus): void {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in health status listener:', error);
      }
    });
  }

  setCheckInterval(intervalMs: number): void {
    this.checkInterval = intervalMs;
    
    if (this.intervalId) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  isMonitoring(): boolean {
    return this.intervalId !== null;
  }
}

// Create singleton instance
export const healthService = new HealthService();
export default healthService;