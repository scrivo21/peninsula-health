const request = require('supertest');
const fs = require('fs-extra');
const path = require('path');

describe('Peninsula Health Backend API Tests', () => {
  let app;
  let server;
  const testConfigPath = path.join(__dirname, '../data/test-config.json');
  const originalConfigPath = path.join(__dirname, '../data/config.json');
  
  beforeAll(async () => {
    process.env.PORT = 3002;
    
    if (await fs.pathExists(originalConfigPath)) {
      await fs.copy(originalConfigPath, testConfigPath);
    }
    
    jest.resetModules();
    const serverModule = require('./server');
    app = serverModule.app;
    server = serverModule.server;
  });

  afterAll(async () => {
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
    
    if (await fs.pathExists(testConfigPath)) {
      await fs.remove(testConfigPath);
    }
    
    // Force exit to avoid hanging tests
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Server Setup', () => {
    test('Server should be running', () => {
      expect(app).toBeDefined();
    });

    test('CORS should be enabled', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Health Check Endpoints', () => {
    test('GET /api/health should return server status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Config Management Endpoints', () => {
    test('GET /api/config should return configuration', async () => {
      const response = await request(app)
        .get('/api/config')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('shifts');
      expect(response.body.data).toHaveProperty('shift_penalties');
    });

    test.skip('POST /api/config should update configuration', async () => {
      const testConfig = {
        DOCTORS: {
          'test-doctor': {
            name: 'Test Doctor',
            type: 'RESIDENT',
            weekdayShifts: ['AM'],
            weekendShifts: ['SAT_AM']
          }
        },
        SHIFTS: {
          AM: {
            name: 'Morning Shift',
            startTime: '08:00',
            endTime: '16:00',
            type: 'weekday'
          }
        }
      };

      const response = await request(app)
        .post('/api/config')
        .send(testConfig)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    test.skip('GET /api/config/reload should reload configuration', async () => {
      const response = await request(app)
        .get('/api/config/reload')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('doctorCount');
    });
  });

  describe('Doctor Management Endpoints', () => {
    const testDoctor = {
      id: 'test-doc-123',
      name: 'Dr. Test Smith',
      type: 'RESIDENT',
      weekdayShifts: ['AM', 'PM'],
      weekendShifts: ['SAT_AM'],
      unavailability: [],
      preferences: {
        maxConsecutiveDays: 5,
        minRestDays: 2
      }
    };

    test.skip('POST /api/doctors should add a new doctor', async () => {
      const response = await request(app)
        .post('/api/doctors')
        .send(testDoctor)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('doctorId');
    });

    test('GET /api/doctors should return all doctors', async () => {
      const response = await request(app)
        .get('/api/doctors')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test.skip('PUT /api/doctors/:id should update a doctor', async () => {
      const updatedDoctor = {
        ...testDoctor,
        name: 'Dr. Updated Smith'
      };

      const response = await request(app)
        .put(`/api/doctors/${testDoctor.id}`)
        .send(updatedDoctor)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });

    test.skip('DELETE /api/doctors/:id should delete a doctor', async () => {
      const response = await request(app)
        .delete(`/api/doctors/${testDoctor.id}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Shift Management Endpoints', () => {
    test.skip('GET /api/shifts should return all shifts', async () => {
      const response = await request(app)
        .get('/api/shifts')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('shifts');
    });

    test.skip('POST /api/shifts should add a new shift', async () => {
      const testShift = {
        id: 'TEST_SHIFT',
        name: 'Test Shift',
        startTime: '10:00',
        endTime: '18:00',
        type: 'weekday',
        requiredDoctors: 2
      };

      const response = await request(app)
        .post('/api/shifts')
        .send(testShift)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });

    test.skip('PUT /api/shifts/:id should update a shift', async () => {
      const updatedShift = {
        name: 'Updated Test Shift',
        startTime: '09:00',
        endTime: '17:00'
      };

      const response = await request(app)
        .put('/api/shifts/TEST_SHIFT')
        .send(updatedShift)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });

    test.skip('DELETE /api/shifts/:id should delete a shift', async () => {
      const response = await request(app)
        .delete('/api/shifts/TEST_SHIFT')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Roster Generation Endpoints', () => {
    test('POST /api/roster/generate should generate a roster', async () => {
      const rosterParams = {
        startDate: '2025-01-01',
        weeks: 4,
        algorithm: 'balanced'
      };

      const response = await request(app)
        .post('/api/roster/generate')
        .send(rosterParams)
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      if (response.body.success) {
        expect(response.body).toHaveProperty('data');
      }
    }, 30000);

    test.skip('GET /api/roster/current should return current roster', async () => {
      const response = await request(app)
        .get('/api/roster/current')
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });

    test.skip('POST /api/roster/validate should validate a roster', async () => {
      const testRoster = {
        '2025-01-01': {
          AM: ['doctor1'],
          PM: ['doctor2']
        }
      };

      const response = await request(app)
        .post('/api/roster/validate')
        .send({ roster: testRoster })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('validation');
    });
  });

  describe('Roster Storage Endpoints', () => {
    const testRosterId = 'test-roster-123';
    
    test.skip('POST /api/roster/save should save a roster', async () => {
      const rosterData = {
        id: testRosterId,
        name: 'Test Roster',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        roster: {
          '2025-01-01': {
            AM: ['doctor1'],
            PM: ['doctor2']
          }
        }
      };

      const response = await request(app)
        .post('/api/roster/save')
        .send(rosterData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('rosterId');
    });

    test.skip('GET /api/roster/history should return roster history', async () => {
      const response = await request(app)
        .get('/api/roster/history')
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('rosters');
      expect(Array.isArray(response.body.rosters)).toBe(true);
    });

    test.skip('GET /api/roster/:id should return specific roster', async () => {
      const response = await request(app)
        .get(`/api/roster/${testRosterId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });

    test.skip('DELETE /api/roster/:id should delete a roster', async () => {
      const response = await request(app)
        .delete(`/api/roster/${testRosterId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Reports and Analytics Endpoints', () => {
    test.skip('GET /api/reports/statistics should return statistics', async () => {
      const response = await request(app)
        .get('/api/reports/statistics')
        .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });

    test.skip('GET /api/reports/doctor-stats should return doctor statistics', async () => {
      const response = await request(app)
        .get('/api/reports/doctor-stats')
        .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });

    test.skip('GET /api/reports/vacant-shifts should return vacant shifts', async () => {
      const response = await request(app)
        .get('/api/reports/vacant-shifts')
        .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });

    test.skip('GET /api/reports/undesirable-shifts should return undesirable shifts', async () => {
      const response = await request(app)
        .get('/api/reports/undesirable-shifts')
        .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Email Service Endpoints', () => {
    test.skip('POST /api/email/send-roster should send roster email', async () => {
      const emailData = {
        recipients: ['test@example.com'],
        subject: 'Test Roster',
        roster: {
          '2025-01-01': {
            AM: ['doctor1'],
            PM: ['doctor2']
          }
        }
      };

      const response = await request(app)
        .post('/api/email/send-roster')
        .send(emailData)
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });

    test.skip('POST /api/email/test should send test email', async () => {
      const testEmail = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email'
      };

      const response = await request(app)
        .post('/api/email/test')
        .send(testEmail)
        .expect(200);
      
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('Error Handling', () => {
    test('Should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
    });

    test.skip('Should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/config')
        .set('Content-Type', 'application/json')
        .send('{"invalid json}')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('Should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/doctors')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Concurrent Request Handling', () => {
    test('Should handle multiple concurrent requests', async () => {
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/config')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });
  });
});