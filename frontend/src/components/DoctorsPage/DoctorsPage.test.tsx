import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { DoctorsPage } from './DoctorsPage';
import * as doctorApi from '../../services/doctorApi';

jest.mock('../../services/doctorApi');

describe('DoctorsPage Component Tests', () => {
  const mockDoctors = [
    {
      id: 'doc1',
      name: 'Dr. John Smith',
      type: 'RESIDENT',
      weekdayShifts: ['AM', 'PM'],
      weekendShifts: ['SAT_AM'],
      unavailability: [],
      preferences: {
        maxConsecutiveDays: 5,
        minRestDays: 2
      }
    },
    {
      id: 'doc2',
      name: 'Dr. Jane Doe',
      type: 'REGISTRAR',
      weekdayShifts: ['NIGHT'],
      weekendShifts: ['SUN_PM'],
      unavailability: [],
      preferences: {
        maxConsecutiveDays: 4,
        minRestDays: 2
      }
    }
  ];

  beforeEach(() => {
    (doctorApi.getAllDoctors as jest.Mock).mockResolvedValue({ success: true, data: mockDoctors });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders doctors page with title', async () => {
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    expect(screen.getByText(/Doctor Management/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    });
  });

  test('displays list of doctors', async () => {
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
      expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
    });
  });

  test('opens add doctor modal when clicking add button', async () => {
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    const addButton = screen.getByText(/Add Doctor/i);
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Add New Doctor/i)).toBeInTheDocument();
    });
  });

  test('searches for doctors', async () => {
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search doctors/i);
    fireEvent.change(searchInput, { target: { value: 'Jane' } });

    expect(screen.queryByText('Dr. John Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
  });

  test('filters doctors by type', async () => {
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    });

    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'REGISTRAR' } });

    expect(screen.queryByText('Dr. John Smith')).not.toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Doe')).toBeInTheDocument();
  });

  test('deletes a doctor', async () => {
    (doctorApi.removeDoctor as jest.Mock).mockResolvedValue({ success: true });
    
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText(/Delete/i);
    fireEvent.click(deleteButtons[0]);

    const confirmButton = screen.getByText(/Confirm/i);
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(doctorApi.removeDoctor).toHaveBeenCalledWith('doc1');
    });
  });

  test('edits a doctor', async () => {
    (doctorApi.updateDoctor as jest.Mock).mockResolvedValue({ success: true });
    
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Dr. John Smith')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText(/Edit/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Edit Doctor/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Dr. John Smith');
    fireEvent.change(nameInput, { target: { value: 'Dr. John Smith Jr.' } });

    const saveButton = screen.getByText(/Save/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(doctorApi.updateDoctor).toHaveBeenCalled();
    });
  });

  test('handles API errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    (doctorApi.getAllDoctors as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(
      <MemoryRouter>
        <DoctorsPage />
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Error loading doctors/i)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});