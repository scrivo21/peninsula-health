const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    
    // Configure config path based on environment (matching server.js logic)
    const isElectron = process.env.ELECTRON_MODE === 'true';
    if (isElectron) {
      const os = require('os');
      const userDataPath = path.join(os.homedir(), 'Peninsula-Health-Data');
      this.configPath = path.join(userDataPath, 'config.json');
    } else {
      this.configPath = path.join(__dirname, '../../data/config.json');
    }
  }

  /**
   * Initialize the email transporter with SMTP settings
   */
  async initialize() {
    try {
      const config = await this.loadConfig();
      
      if (!config.email_settings) {
        console.warn('Email settings not configured in config.json');
        return false;
      }

      const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure } = config.email_settings;

      if (!smtp_host || !smtp_port || !smtp_user || !smtp_pass) {
        console.warn('Incomplete email configuration');
        return false;
      }

      this.transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        secure: smtp_secure || false,
        auth: {
          user: smtp_user,
          pass: smtp_pass
        }
      });

      // Verify connection
      await this.transporter.verify();
      this.isConfigured = true;
      console.log('Email service initialized successfully');
      return true;

    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      const config = await fs.readJson(this.configPath);
      return config;
    } catch (error) {
      console.error('Error loading config for email service:', error);
      throw error;
    }
  }

  /**
   * Generate individual roster HTML for a specific doctor
   */
  generateDoctorRosterHTML(doctorName, doctorShifts, rosterPeriod) {
    const { startDate, endDate, weeks } = rosterPeriod;
    
    // Count statistics
    const totalShifts = doctorShifts.length;
    const clinicalShifts = doctorShifts.filter(s => !s.shift_type.includes('Admin')).length;
    const adminShifts = totalShifts - clinicalShifts;
    const totalHours = doctorShifts.reduce((sum, shift) => sum + (shift.duration_hours || 10), 0);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      margin: -20px -20px 0 -20px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 5px 0 0 0;
      opacity: 0.95;
      font-size: 16px;
    }
    .content {
      background: white;
      padding: 30px 20px;
      border: 1px solid #e0e0e0;
      border-top: none;
      margin: 0 -20px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #2c3e50;
    }
    .summary {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #17a2b8;
    }
    .summary h3 {
      margin-top: 0;
      color: #17a2b8;
      font-size: 18px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 15px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dotted #dee2e6;
    }
    .summary-label {
      color: #6c757d;
      font-weight: 500;
    }
    .summary-value {
      color: #212529;
      font-weight: 600;
    }
    .roster-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    .roster-table th {
      background: #17a2b8;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .roster-table td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 14px;
    }
    .roster-table tr:last-child td {
      border-bottom: none;
    }
    .roster-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    .roster-table tr:hover {
      background: #e8f4f8;
      transition: background 0.2s;
    }
    .shift-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .shift-clinical {
      background: #d4edda;
      color: #155724;
    }
    .shift-admin {
      background: #d1ecf1;
      color: #0c5460;
    }
    .shift-leadership {
      background: #fff3cd;
      color: #856404;
    }
    .day-off {
      color: #6c757d;
      font-style: italic;
    }
    .footer {
      margin-top: 40px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 0 0 10px 10px;
      margin: 40px -20px -20px -20px;
      text-align: center;
      color: #6c757d;
      font-size: 13px;
      border-top: 2px solid #e0e0e0;
    }
    .footer a {
      color: #17a2b8;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .important-note {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      color: #856404;
    }
    .important-note strong {
      display: block;
      margin-bottom: 5px;
      font-size: 16px;
    }
    @media print {
      body {
        padding: 0;
      }
      .header {
        margin: 0;
        border-radius: 0;
      }
      .footer {
        margin: 40px 0 0 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PENINSULA HEALTH</h1>
    <p>Hospital Scheduling System - Personal Roster</p>
  </div>
  
  <div class="content">
    <div class="greeting">
      Dear Dr. ${doctorName},
    </div>
    
    <p>Your roster for the period <strong>${this.formatDate(startDate)}</strong> to <strong>${this.formatDate(endDate)}</strong> (${weeks} weeks) has been finalized. Please review your schedule below.</p>
    
    <div class="summary">
      <h3>Roster Summary</h3>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">Total Shifts:</span>
          <span class="summary-value">${totalShifts}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Total Hours:</span>
          <span class="summary-value">${totalHours}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Clinical Shifts:</span>
          <span class="summary-value">${clinicalShifts}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Admin Shifts:</span>
          <span class="summary-value">${adminShifts}</span>
        </div>
      </div>
    </div>
    
    <h3 style="color: #17a2b8; margin-top: 30px;">Your Schedule</h3>
    
    <table class="roster-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Day</th>
          <th>Shift</th>
          <th>Location</th>
          <th>Time</th>
          <th>Type</th>
        </tr>
      </thead>
      <tbody>
        ${this.generateShiftRows(doctorShifts)}
      </tbody>
    </table>
    
    <div class="important-note">
      <strong>Important Notes:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Please review your schedule carefully and ensure you're available for all assigned shifts</li>
        <li>If you have any concerns or conflicts, please contact the scheduling team immediately</li>
        <li>Leadership shifts (Blue/Green) require additional responsibilities</li>
        <li>Remember to check for any last-minute changes in the scheduling system</li>
      </ul>
    </div>
  </div>
  
  <div class="footer">
    <p>
      This is an automated email from Peninsula Health Scheduling System<br>
      For queries, please contact: <a href="mailto:scheduling@peninsulahealth.org.au">scheduling@peninsulahealth.org.au</a><br>
      Phone: +61 3 9784 7777
    </p>
    <p style="margin-top: 15px; font-size: 11px; color: #868e96;">
      This email contains confidential information. If you are not the intended recipient, please delete this email immediately.
    </p>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Generate table rows for shifts
   */
  generateShiftRows(shifts) {
    if (!shifts || shifts.length === 0) {
      return '<tr><td colspan="6" style="text-align: center; color: #6c757d;">No shifts assigned for this period</td></tr>';
    }

    return shifts.map(shift => {
      const date = new Date(shift.date);
      const dayName = date.toLocaleDateString('en-AU', { weekday: 'long' });
      const formattedDate = this.formatDate(shift.date);
      
      let typeClass = 'shift-clinical';
      let typeLabel = 'Clinical';
      
      if (shift.shift_type.includes('Admin')) {
        typeClass = 'shift-admin';
        typeLabel = 'Admin';
      } else if (shift.shift_type.includes('Blue') || shift.shift_type.includes('Green')) {
        typeClass = 'shift-leadership';
        typeLabel = 'Leadership';
      }

      if (shift.is_day_off) {
        return `
          <tr>
            <td>${formattedDate}</td>
            <td>${dayName}</td>
            <td colspan="4" class="day-off">Day Off</td>
          </tr>
        `;
      }

      return `
        <tr>
          <td><strong>${formattedDate}</strong></td>
          <td>${dayName}</td>
          <td>${shift.shift_type || '-'}</td>
          <td>${shift.location || '-'}</td>
          <td>${shift.start_time || '08:00'} - ${shift.end_time || '18:00'}</td>
          <td><span class="shift-badge ${typeClass}">${typeLabel}</span></td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Generate CSV content for a doctor's roster
   */
  generateDoctorRosterCSV(doctorName, doctorShifts, rosterPeriod) {
    const { startDate, endDate, weeks } = rosterPeriod;
    
    let csv = [
      `Peninsula Health - Personal Roster for Dr. ${doctorName}`,
      `Period: ${this.formatDate(startDate)} to ${this.formatDate(endDate)} (${weeks} weeks)`,
      `Generated: ${new Date().toLocaleString('en-AU')}`,
      '',
      'Date,Day,Shift Type,Location,Start Time,End Time,Category'
    ];

    if (doctorShifts && doctorShifts.length > 0) {
      doctorShifts.forEach(shift => {
        const date = new Date(shift.date);
        const dayName = date.toLocaleDateString('en-AU', { weekday: 'long' });
        
        if (shift.is_day_off) {
          csv.push(`"${shift.date}","${dayName}","Day Off","","","","Off"`);
        } else {
          const category = shift.shift_type.includes('Admin') ? 'Admin' : 
                          (shift.shift_type.includes('Blue') || shift.shift_type.includes('Green')) ? 'Leadership' : 'Clinical';
          csv.push(`"${shift.date}","${dayName}","${shift.shift_type}","${shift.location || ''}","${shift.start_time || '08:00'}","${shift.end_time || '18:00'}","${category}"`);
        }
      });
    } else {
      csv.push('No shifts assigned for this period');
    }

    return csv.join('\n');
  }

  /**
   * Extract individual doctor's shifts from the full roster
   */
  extractDoctorShifts(doctorName, rosterData) {
    const shifts = [];
    
    try {
      // Parse the doctor_view CSV to get individual assignments
      const doctorViewLines = rosterData.outputs.doctor_view.split('\n');
      if (doctorViewLines.length < 2) return shifts;
      
      const headers = doctorViewLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const doctorColumnIndex = headers.findIndex(h => 
        h.toLowerCase() === doctorName.toLowerCase() || 
        h.toLowerCase().includes(doctorName.toLowerCase())
      );
      
      if (doctorColumnIndex === -1) {
        console.warn(`Doctor ${doctorName} not found in roster`);
        return shifts;
      }

      // Extract shifts for this doctor
      for (let i = 1; i < doctorViewLines.length; i++) {
        const row = doctorViewLines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
        const date = row[0];
        const assignment = row[doctorColumnIndex];
        
        if (!date) continue;
        
        if (!assignment || assignment === 'OFF' || assignment === '') {
          shifts.push({
            date: date,
            is_day_off: true
          });
        } else {
          // Parse the shift assignment
          const parts = assignment.split(' ');
          const location = parts[0] || 'Unknown';
          const shiftType = parts.join(' ');
          
          // Determine times based on shift type
          let startTime = '08:00';
          let endTime = '18:00';
          let durationHours = 10;
          
          if (assignment.includes('PM') || assignment.includes('Evening')) {
            startTime = '18:00';
            endTime = '02:00';
          } else if (assignment.includes('Admin')) {
            startTime = '08:00';
            endTime = '16:00';
            durationHours = 8;
          }
          
          shifts.push({
            date: date,
            shift_type: shiftType,
            location: location,
            start_time: startTime,
            end_time: endTime,
            duration_hours: durationHours,
            is_day_off: false
          });
        }
      }
    } catch (error) {
      console.error(`Error extracting shifts for ${doctorName}:`, error);
    }

    return shifts.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Send individual roster email to a doctor
   */
  async sendDoctorRoster(doctor, rosterData, options = {}) {
    if (!this.isConfigured) {
      await this.initialize();
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }
    }

    const config = await this.loadConfig();
    const emailSettings = config.email_settings;
    
    // Extract doctor's shifts
    const doctorShifts = this.extractDoctorShifts(doctor.name, rosterData);
    
    // Generate roster period info
    const rosterPeriod = {
      startDate: rosterData.startDate,
      endDate: this.calculateEndDate(rosterData.startDate, rosterData.weeks),
      weeks: rosterData.weeks
    };

    // Generate email content
    const htmlContent = this.generateDoctorRosterHTML(doctor.name, doctorShifts, rosterPeriod);
    const csvContent = this.generateDoctorRosterCSV(doctor.name, doctorShifts, rosterPeriod);
    
    // Prepare email
    const mailOptions = {
      from: `"${emailSettings.from_name || 'Peninsula Health Scheduling'}" <${emailSettings.from_email || emailSettings.smtp_user}>`,
      to: doctor.email,
      subject: `Your Roster: ${this.formatDate(rosterPeriod.startDate)} to ${this.formatDate(rosterPeriod.endDate)}`,
      html: htmlContent,
      attachments: []
    };

    // Add CSV attachment if requested
    if (options.includeCSV !== false) {
      mailOptions.attachments.push({
        filename: `roster_${doctor.name.replace(/\s+/g, '_')}_${rosterPeriod.startDate}.csv`,
        content: csvContent,
        contentType: 'text/csv'
      });
    }

    // Send email
    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${doctor.name} (${doctor.email}): ${info.messageId}`);
      return {
        success: true,
        doctor: doctor.name,
        email: doctor.email,
        messageId: info.messageId
      };
    } catch (error) {
      console.error(`Failed to send email to ${doctor.name}:`, error);
      return {
        success: false,
        doctor: doctor.name,
        email: doctor.email,
        error: error.message
      };
    }
  }

  /**
   * Send roster emails to all doctors
   */
  async sendRosterToAllDoctors(rosterData, options = {}) {
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    try {
      const config = await this.loadConfig();
      const doctors = config.DOCTORS || {};
      
      // Get list of doctors to email
      const doctorList = [];
      for (const [key, doctorData] of Object.entries(doctors)) {
        if (key.startsWith('_')) continue; // Skip metadata
        
        const doctorName = `Dr. ${key.split('_').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' ')}`;
        
        if (!doctorData.email) {
          results.skipped.push({
            doctor: doctorName,
            reason: 'No email address configured'
          });
          continue;
        }

        if (doctorData.status === 'inactive') {
          results.skipped.push({
            doctor: doctorName,
            reason: 'Doctor is inactive'
          });
          continue;
        }

        doctorList.push({
          name: doctorName,
          email: doctorData.email,
          key: key
        });
      }

      // Send emails with rate limiting
      for (const doctor of doctorList) {
        const result = await this.sendDoctorRoster(doctor, rosterData, options);
        
        if (result.success) {
          results.successful.push(result);
        } else {
          results.failed.push(result);
        }

        // Rate limiting - wait 1 second between emails
        if (options.rateLimit !== false) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return results;

    } catch (error) {
      console.error('Error sending roster emails:', error);
      throw error;
    }
  }

  /**
   * Send test email to verify configuration
   */
  async sendTestEmail(recipientEmail) {
    if (!this.isConfigured) {
      await this.initialize();
      if (!this.isConfigured) {
        throw new Error('Email service not configured');
      }
    }

    const config = await this.loadConfig();
    const emailSettings = config.email_settings;
    
    const mailOptions = {
      from: `"${emailSettings.from_name || 'Peninsula Health Scheduling'}" <${emailSettings.from_email || emailSettings.smtp_user}>`,
      to: recipientEmail,
      subject: 'Test Email - Peninsula Health Scheduling System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #17a2b8; color: white; padding: 20px; text-align: center;">
            <h1>Peninsula Health - Test Email</h1>
          </div>
          <div style="padding: 20px; background: #f8f9fa;">
            <p>This is a test email from the Peninsula Health Scheduling System.</p>
            <p>If you received this email, your email configuration is working correctly.</p>
            <p style="margin-top: 20px;">
              <strong>Configuration Details:</strong><br>
              SMTP Host: ${emailSettings.smtp_host}<br>
              SMTP Port: ${emailSettings.smtp_port}<br>
              From: ${emailSettings.from_email || emailSettings.smtp_user}
            </p>
          </div>
          <div style="padding: 10px; background: #e9ecef; text-align: center; font-size: 12px;">
            Generated at: ${new Date().toLocaleString('en-AU')}
          </div>
        </div>
      `
    };

    const info = await this.transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      recipient: recipientEmail
    };
  }

  /**
   * Utility functions
   */
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  calculateEndDate(startDate, weeks) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (weeks * 7) - 1);
    return end.toISOString().split('T')[0];
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;