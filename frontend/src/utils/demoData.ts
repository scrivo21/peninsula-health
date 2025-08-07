import { RegistrationFormData } from '../types/auth';
import { UserStorageService } from './userStorage';

// Simple demo data for the simplified registration system
const DEMO_USERS: RegistrationFormData[] = [
  {
    fullName: 'Admin User',
    email: 'admin@peninsulahealth.org.au',
    password: 'AdminPass123!',
    confirmPassword: 'AdminPass123!',
    role: 'admin',
  },
  {
    fullName: 'Test User',
    email: 'test@peninsulahealth.org.au',
    password: 'TestPass123!',
    confirmPassword: 'TestPass123!',
    role: 'admin',
  },
];

export class DemoDataService {
  // Create demo users if they don't exist
  static async createBasicDemoUsers(): Promise<void> {
    for (const userData of DEMO_USERS) {
      if (!UserStorageService.isEmailExists(userData.email)) {
        await UserStorageService.registerUser(userData);
      }
    }
    console.log('✅ Demo users created successfully');
  }

  // Simple demo info for console
  static printDemoInfo(): void {
    console.log('📋 Demo Login Credentials:');
    console.log('Email: admin@peninsulahealth.org.au');
    console.log('Password: AdminPass123!');
    console.log('');
    console.log('Email: test@peninsulahealth.org.au');
    console.log('Password: TestPass123!');
  }

  // Create full demo environment (simplified)
  static async createFullDemoEnvironment(): Promise<void> {
    await this.createBasicDemoUsers();
    this.printDemoInfo();
  }
}

export default DemoDataService;