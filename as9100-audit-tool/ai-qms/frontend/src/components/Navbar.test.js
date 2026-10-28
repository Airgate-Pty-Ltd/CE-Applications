import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';

// Mock component wrapper
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Navbar Component', () => {
  test('renders navigation links', () => {
    renderWithRouter(<Navbar />);
    expect(screen.getByText(/AS9100 Audit Tool/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Document/i)).toBeInTheDocument();
  });

  test('user menu opens on click', () => {
    renderWithRouter(<Navbar />);
    const userButton = screen.getByRole('button', { name: /account of current user/i });
    fireEvent.click(userButton);
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/Subscription/i)).toBeInTheDocument();
    expect(screen.getByText(/Logout/i)).toBeInTheDocument();
  });
}); 