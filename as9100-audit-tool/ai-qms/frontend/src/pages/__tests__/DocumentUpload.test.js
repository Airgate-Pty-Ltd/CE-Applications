import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentUpload from '../DocumentUpload';
import { auditService } from '../../services/auditService';

// Mock the audit service
jest.mock('../../services/auditService', () => ({
  auditService: {
    auditDocument: jest.fn(),
    getClauseDetails: jest.fn()
  }
}));

describe('DocumentUpload', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock successful responses
    auditService.getClauseDetails.mockResolvedValue({
      id: '4.1',
      title: 'Understanding the Organization and its Context',
      description: 'Test description'
    });

    auditService.auditDocument.mockResolvedValue({
      clause: '4.1',
      sectionsAudited: [
        {
          level: 2,
          heading: '4.1 Understanding the Organization and its Context',
          requirementSummary: 'Test requirement summary',
          evidenceQuoted: ['Test evidence'],
          nonConformances: ['Test non-conformance'],
          recommendations: ['Test recommendation']
        }
      ],
      overallConclusion: 'Test overall conclusion'
    });
  });

  it('renders the document upload form', () => {
    render(<DocumentUpload />);
    
    expect(screen.getByText('Document Upload and Audit')).toBeInTheDocument();
    expect(screen.getByLabelText('Document Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Document Description')).toBeInTheDocument();
    expect(screen.getByText('Select AS9100 Clauses')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
    expect(screen.getByText('Submit for Audit')).toBeInTheDocument();
  });

  it('allows selecting AS9100 clauses', async () => {
    render(<DocumentUpload />);
    
    // Find and click the checkbox for a clause
    const clauseCheckbox = screen.getByLabelText('4 - Context of the Organization');
    fireEvent.click(clauseCheckbox);
    
    // Verify the clause is selected
    expect(clauseCheckbox).toBeChecked();
  });

  it('handles file selection', async () => {
    render(<DocumentUpload />);
    
    // Create a mock file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    // Find the file input and trigger file selection
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Verify the file name is displayed
    expect(await screen.findByText('Selected file: test.pdf')).toBeInTheDocument();
  });

  it('submits the form and displays audit results', async () => {
    render(<DocumentUpload />);
    
    // Fill in the form
    await userEvent.type(screen.getByLabelText('Document Title'), 'Test Document');
    await userEvent.type(screen.getByLabelText('Document Description'), 'Test Description');
    
    // Select a clause
    const clauseCheckbox = screen.getByLabelText('4 - Context of the Organization');
    fireEvent.click(clauseCheckbox);
    
    // Upload a file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit for Audit'));
    
    // Wait for the audit results to be displayed
    await waitFor(() => {
      expect(screen.getByText('Audit Results')).toBeInTheDocument();
      expect(screen.getByText('Clause 4.1')).toBeInTheDocument();
      expect(screen.getByText('Test overall conclusion')).toBeInTheDocument();
      expect(screen.getByText('Test non-conformance')).toBeInTheDocument();
      expect(screen.getByText('Test recommendation')).toBeInTheDocument();
    });
  });

  it('handles errors during audit', async () => {
    // Mock an error response
    auditService.auditDocument.mockRejectedValue(new Error('Audit failed'));
    
    render(<DocumentUpload />);
    
    // Fill in the form
    await userEvent.type(screen.getByLabelText('Document Title'), 'Test Document');
    await userEvent.type(screen.getByLabelText('Document Description'), 'Test Description');
    
    // Select a clause
    const clauseCheckbox = screen.getByLabelText('4 - Context of the Organization');
    fireEvent.click(clauseCheckbox);
    
    // Upload a file
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Submit the form
    fireEvent.click(screen.getByText('Submit for Audit'));
    
    // Wait for the error message to be displayed
    await waitFor(() => {
      expect(screen.getByText('Audit failed')).toBeInTheDocument();
    });
  });
}); 