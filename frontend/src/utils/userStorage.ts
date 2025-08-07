import { User, StoredUser, RegistrationFormData } from '../types/auth';

/**
 * SECURITY WARNING: This implementation uses localStorage for demo purposes only.
 * In a production environment, user credentials should NEVER be stored in localStorage.
 * Use secure server-side authentication with proper database storage instead.
 */

const STORAGE_KEY = 'shift_happens_users';
const CURRENT_USER_KEY = 'shift_happens_current_user';

// Utility to generate a random salt
async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash password using Web Crypto API with salt
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate unique user ID
function generateUserId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export class UserStorageService {
  // Initialize storage with demo data if empty
  static initializeStorage(): void {
    try {
      const existingUsers = localStorage.getItem(STORAGE_KEY);
      if (!existingUsers) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
        console.log('⚠️ DEMO MODE: User storage initialized in localStorage');
        console.log('⚠️ WARNING: This is for demonstration only. Never store credentials in localStorage in production!');
      }
    } catch (error) {
      console.error('Failed to initialize user storage:', error);
    }
  }

  // Get all stored users (for admin purposes)
  static getStoredUsers(): StoredUser[] {
    try {
      const users = localStorage.getItem(STORAGE_KEY);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Failed to retrieve users:', error);
      return [];
    }
  }

  // Check if username exists
  static isUsernameExists(username: string): boolean {
    // This method is now deprecated since we use email as identifier
    return false;
  }

  // Check if email exists
  static isEmailExists(email: string): boolean {
    const users = this.getStoredUsers();
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Register new user
  static async registerUser(formData: RegistrationFormData): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      // Check for existing email
      if (this.isEmailExists(formData.email)) {
        return { success: false, message: 'Email already exists' };
      }

      // Generate salt and hash password
      const salt = await generateSalt();
      const passwordHash = await hashPassword(formData.password, salt);

      // Create new user
      const newUser: StoredUser = {
        id: generateUserId(),
        email: formData.email.trim().toLowerCase(),
        fullName: formData.fullName.trim(),
        role: formData.role,
        eft: formData.role === 'doctor' ? formData.eft : undefined,
        createdAt: new Date().toISOString(),
        passwordHash,
        salt,
      };

      // Save to storage
      const users = this.getStoredUsers();
      users.push(newUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

      // Return user without sensitive data
      const { passwordHash: _, salt: __, ...userResponse } = newUser;
      return { success: true, user: userResponse };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  // Authenticate user
  static async authenticateUser(email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> {
    try {
      const users = this.getStoredUsers();
      const storedUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());

      if (!storedUser) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Verify password
      const passwordHash = await hashPassword(password, storedUser.salt);
      if (passwordHash !== storedUser.passwordHash) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Update last login
      storedUser.lastLogin = new Date().toISOString();
      const userIndex = users.findIndex(user => user.id === storedUser.id);
      if (userIndex !== -1) {
        users[userIndex] = storedUser;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      }

      // Return user without sensitive data
      const { passwordHash: _, salt: __, ...userResponse } = storedUser;
      return { success: true, user: userResponse };
    } catch (error) {
      console.error('Authentication failed:', error);
      return { success: false, message: 'Authentication failed. Please try again.' };
    }
  }

  // Set current authenticated user
  static setCurrentUser(user: User): void {
    try {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to set current user:', error);
    }
  }

  // Get current authenticated user
  static getCurrentUser(): User | null {
    try {
      const user = localStorage.getItem(CURRENT_USER_KEY);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  // Clear current user (logout)
  static clearCurrentUser(): void {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch (error) {
      console.error('Failed to clear current user:', error);
    }
  }

  // Export users data (for backup/migration)
  static exportUsers(): string {
    const users = this.getStoredUsers();
    return JSON.stringify(users, null, 2);
  }

  // Import users data (for restore/migration)
  static importUsers(userData: string): { success: boolean; message: string } {
    try {
      const users = JSON.parse(userData);
      if (!Array.isArray(users)) {
        return { success: false, message: 'Invalid user data format' };
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      return { success: true, message: `Successfully imported ${users.length} users` };
    } catch (error) {
      return { success: false, message: 'Failed to import user data' };
    }
  }

  // Clear all users (for testing/reset)
  static clearAllUsers(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
      console.log('All user data cleared');
    } catch (error) {
      console.error('Failed to clear user data:', error);
    }
  }

  // Get user statistics
  static getUserStats(): { total: number; admins: number; schedulers: number; doctors: number } {
    const users = this.getStoredUsers();
    return {
      total: users.length,
      admins: users.filter(user => user.role === 'admin').length,
      schedulers: users.filter(user => user.role === 'scheduler').length,
      doctors: users.filter(user => user.role === 'doctor').length,
    };
  }

  // Create demo users for testing
  static async createDemoUsers(): Promise<void> {
    const demoUsers: RegistrationFormData[] = [
      {
        fullName: 'Admin User',
        email: 'admin@peninsulahealth.org.au',
        password: 'AdminPass123!',
        confirmPassword: 'AdminPass123!',
        role: 'admin',
      },
      {
        fullName: 'Scheduler Smith',
        email: 'scheduler@peninsulahealth.org.au',
        password: 'SchedulePass123!',
        confirmPassword: 'SchedulePass123!',
        role: 'admin',
      },
      {
        fullName: 'Dr. John Doe',
        email: 'j.doe@peninsulahealth.org.au',
        password: 'DoctorPass123!',
        confirmPassword: 'DoctorPass123!',
        role: 'admin',
        eft: 0.8,
      },
      {
        fullName: 'Dr. Sarah Wilson',
        email: 's.wilson@peninsulahealth.org.au',
        password: 'DoctorPass123!',
        confirmPassword: 'DoctorPass123!',
        role: 'admin',
        eft: 1.0,
      },
    ];

    for (const userData of demoUsers) {
      if (!this.isEmailExists(userData.email)) {
        await this.registerUser(userData);
      }
    }

    console.log('✅ Demo users created successfully');
    console.log('📋 Available accounts:');
    console.log('   Admin: admin / AdminPass123!');
    console.log('   Scheduler: scheduler / SchedulePass123!');
    console.log('   Doctor: jdoe / DoctorPass123!');
    console.log('   Doctor: swilson / DoctorPass123!');
  }
}

// Initialize storage on import
UserStorageService.initializeStorage();