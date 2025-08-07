import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../Logo';
import { DoctorProfile, DoctorFormData, DoctorStatistics, DoctorListFilters } from '../../types/doctor';
import { User } from '../../types/auth';
import { DoctorList } from './DoctorList';
import { DoctorProfileView } from './DoctorProfileView';
import { DoctorFormModal } from './DoctorFormModal';
import { getAllDoctors, addDoctor, updateDoctor, removeDoctor } from '../../services/doctorApi';
import styles from './DoctorsPage.module.css';

export const DoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statistics, setStatistics] = useState<DoctorStatistics | null>(null);
  const [filters, setFilters] = useState<DoctorListFilters>({
    search: '',
    status: 'all',
    eft_range: { min: 0, max: 1 },
    rosebud_preference: 'all'
  });

  // Check authentication
  useEffect(() => {
    const userData = localStorage.getItem('shift_happens_user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Load doctors from API on component mount
  useEffect(() => {
    if (user) {
      loadDoctorsFromAPI();
    }
  }, [user]);

  // Calculate statistics whenever doctors list changes
  useEffect(() => {
    calculateStatistics();
  }, [doctors]);

  // Watch for URL parameter changes and select corresponding doctor
  useEffect(() => {
    const doctorId = searchParams.get('id');
    if (doctorId && doctors.length > 0) {
      const requestedDoctor = doctors.find(d => d.id === doctorId);
      if (requestedDoctor && selectedDoctor?.id !== requestedDoctor.id) {
        setSelectedDoctor(requestedDoctor);
      }
    }
  }, [searchParams, doctors, selectedDoctor]);

  const loadDoctorsFromAPI = async () => {
    setIsLoading(true);
    
    try {
      const response = await getAllDoctors();
      
      if (response.success && response.data) {
        setDoctors(response.data);
        
        // Check if a specific doctor ID is requested in URL params
        const doctorId = searchParams.get('id');
        if (doctorId && response.data.length > 0) {
          const requestedDoctor = response.data.find(d => d.id === doctorId);
          if (requestedDoctor) {
            setSelectedDoctor(requestedDoctor);
          } else {
            // Fallback to first doctor if requested doctor not found
            setSelectedDoctor(response.data[0]);
          }
        } else if (response.data.length > 0) {
          // Select first doctor by default
          setSelectedDoctor(response.data[0]);
        }
        
        console.log('Doctors loaded from API:', response.data.length);
      } else {
        console.error('Failed to load doctors:', response.error);
        alert(`Failed to load doctors: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to load doctors from API:', error);
      alert(`Failed to load doctors from API: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStatistics = () => {
    if (doctors.length === 0) {
      setStatistics(null);
      return;
    }

    const active = doctors.filter(d => d.status === 'active').length;
    const inactive = doctors.filter(d => d.status === 'inactive').length;
    const onLeave = doctors.filter(d => d.status === 'on_leave').length;
    const totalEft = doctors.reduce((sum, d) => sum + d.eft, 0);
    const avgEft = totalEft / doctors.length;

    setStatistics({
      total_doctors: doctors.length,
      active_doctors: active,
      inactive_doctors: inactive,
      on_leave_doctors: onLeave,
      average_eft: Math.round(avgEft * 100) / 100,
      total_eft_capacity: Math.round(totalEft * 100) / 100
    });
  };

  const handleAddDoctor = async (doctorData: DoctorFormData) => {
    try {
      const response = await addDoctor(doctorData);
      
      if (response.success && response.data) {
        setDoctors(prev => [...prev, response.data!]);
        setSelectedDoctor(response.data);
        setIsAddModalOpen(false);
        console.log('Added new doctor:', response.data);
      } else {
        console.error('Failed to add doctor:', response.error);
        alert(`Failed to add doctor: ${response.error}`);
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      alert('Failed to add doctor. Please try again.');
    }
  };

  const handleEditDoctor = async (doctorData: DoctorFormData) => {
    if (!selectedDoctor) return;

    try {
      const response = await updateDoctor(selectedDoctor.id, doctorData);
      
      if (response.success && response.data) {
        setDoctors(prev => prev.map(d => 
          d.id === selectedDoctor.id ? response.data! : d
        ));
        setSelectedDoctor(response.data);
        setIsEditModalOpen(false);
        console.log('Updated doctor:', response.data);
      } else {
        console.error('Failed to update doctor:', response.error);
        alert(`Failed to update doctor: ${response.error}`);
      }
    } catch (error) {
      console.error('Error updating doctor:', error);
      alert('Failed to update doctor. Please try again.');
    }
  };

  const handleRemoveDoctor = async (doctorId: string) => {
    const doctorToRemove = doctors.find(d => d.id === doctorId);
    if (!doctorToRemove) return;

    const confirmMessage = `Are you sure you want to remove ${doctorToRemove.name} from the system? This action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        const response = await removeDoctor(doctorId);
        
        if (response.success) {
          setDoctors(prev => prev.filter(d => d.id !== doctorId));
          
          // If we're removing the selected doctor, select another one
          if (selectedDoctor?.id === doctorId) {
            const remainingDoctors = doctors.filter(d => d.id !== doctorId);
            setSelectedDoctor(remainingDoctors.length > 0 ? remainingDoctors[0] : null);
          }
          
          console.log('Removed doctor:', doctorToRemove.name);
        } else {
          console.error('Failed to remove doctor:', response.error);
          alert(`Failed to remove doctor: ${response.error}`);
        }
      } catch (error) {
        console.error('Error removing doctor:', error);
        alert('Failed to remove doctor. Please try again.');
      }
    }
  };

  const handleDoctorSelect = (doctor: DoctorProfile) => {
    setSelectedDoctor(doctor);
  };

  const generateDoctorId = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') + '_' + Date.now();
  };

  const handleLogout = () => {
    localStorage.removeItem('shift_happens_user');
    localStorage.removeItem('shift_happens_token');
    navigate('/login');
  };

  if (!user) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.doctorsContainer}>
      {/* Navigation Bar */}
      <nav className={styles.navigationBar}>
        <div className={styles.navContent}>
          <div className={styles.navLogo}>
            <Logo size="small" showText={true} />
          </div>
          
          <div className={styles.navMenu}>
            <button className={styles.navItem} onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
            <button className={styles.navItem} onClick={() => navigate('/schedule')}>
              Schedules
            </button>
            <button className={`${styles.navItem} ${styles.navItemActive}`}>
              Doctors
            </button>
            <button className={styles.navItem} onClick={() => navigate('/reports')}>Reports</button>
            <button className={styles.navItem} onClick={() => navigate('/shifts')}>Shifts</button>
            <button className={styles.navItem} onClick={() => navigate('/config')}>Config</button>
          </div>
          
          <div className={styles.navActions}>
            <span className={styles.userGreeting}>
              Hi, {user.fullName.split(' ')[0]}!
            </span>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Manage Doctors</h1>
            {statistics && (
              <div className={styles.quickStats}>
                <span className={styles.stat}>
                  {statistics.total_doctors} Total
                </span>
                <span className={styles.stat}>
                  {statistics.active_doctors} Active
                </span>
                <span className={styles.stat}>
                  {statistics.total_eft_capacity} EFT Capacity
                </span>
              </div>
            )}
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.addButton}
              onClick={() => setIsAddModalOpen(true)}
            >
              + Add Doctor
            </button>
          </div>
        </div>

        {isLoading && (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner} />
            <p>Loading doctors...</p>
          </div>
        )}

        {!isLoading && (
          <div className={styles.contentLayout}>
            {/* Left Panel - Doctor List */}
            <div className={styles.leftPanel}>
              <DoctorList
                doctors={doctors}
                selectedDoctor={selectedDoctor}
                filters={filters}
                onDoctorSelect={handleDoctorSelect}
                onFiltersChange={setFilters}
                onRemoveDoctor={handleRemoveDoctor}
              />
            </div>

            {/* Right Panel - Doctor Profile */}
            <div className={styles.rightPanel}>
              {selectedDoctor ? (
                <DoctorProfileView
                  doctor={selectedDoctor}
                  onEdit={() => setIsEditModalOpen(true)}
                  onRemove={() => handleRemoveDoctor(selectedDoctor.id)}
                />
              ) : (
                <div className={styles.noSelection}>
                  <div className={styles.noSelectionIcon}>👥</div>
                  <h3>No Doctor Selected</h3>
                  <p>Select a doctor from the list to view their profile and preferences.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {isAddModalOpen && (
          <DoctorFormModal
            title="Add New Doctor"
            onSave={handleAddDoctor}
            onCancel={() => setIsAddModalOpen(false)}
          />
        )}

        {isEditModalOpen && selectedDoctor && (
          <DoctorFormModal
            title="Edit Doctor"
            doctor={selectedDoctor}
            onSave={handleEditDoctor}
            onCancel={() => setIsEditModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default DoctorsPage;