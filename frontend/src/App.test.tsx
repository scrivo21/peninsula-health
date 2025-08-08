import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('App Component Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('renders without crashing', () => {
    renderWithRouter(<App />);
    expect(screen.getByText(/Peninsula Health/i)).toBeInTheDocument();
  });

  test('redirects to login page by default', () => {
    renderWithRouter(<App />);
    // App should redirect to login page
    expect(window.location.pathname).toBe('/');
  });

  test('renders main layout structure', () => {
    renderWithRouter(<App />);
    
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });
});