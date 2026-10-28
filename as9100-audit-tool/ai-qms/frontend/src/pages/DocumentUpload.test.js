import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DocumentUpload from './DocumentUpload';
import { mockApi } from '../services/mockApi';

jest.mock('../services/mockApi', () => ({
  mockApi: {
    uploadDocument: jest.fn(),
  },
}));

describe('DocumentUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload form', () => {
    render(
      <BrowserRouter>
        <DocumentUpload />
      </BrowserRouter>
    );

    expect(screen.getByText('Upload Document for AS9100 Review')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop a file here, or click to select a file')).toBeInTheDocument();
    expect(screen.getByText('Supported formats: PDF, DOC, DOCX')).toBeInTheDocument();
    expect(screen.getByLabelText('Select AS9100 Clauses')).toBeInTheDocument();
    expect(screen.getByLabelText('Additional Context')).toBeInTheDocument();
    expect(screen.getByTestId('submit-button')).toBeInTheDocument();
  });

  it('handles file upload', async () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    mockApi.uploadDocument.mockResolvedValueOnce({ documentId: '123', message: 'Upload successful' });

    render(
      <BrowserRouter>
        <DocumentUpload />
      </BrowserRouter>
    );

    await act(async () => {
      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const clausesSelect = screen.getByTestId('clauses-select');
      fireEvent.mouseDown(clausesSelect);
      fireEvent.click(screen.getByText('4.1 Understanding the organization and its context'));

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(mockApi.uploadDocument).toHaveBeenCalled();
    });
  });

  it('displays error when upload fails', async () => {
    const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    mockApi.uploadDocument.mockRejectedValueOnce(new Error('Upload failed'));

    render(
      <BrowserRouter>
        <DocumentUpload />
      </BrowserRouter>
    );

    await act(async () => {
      const fileInput = screen.getByTestId('file-input');
      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      const clausesSelect = screen.getByTestId('clauses-select');
      fireEvent.mouseDown(clausesSelect);
      fireEvent.click(screen.getByText('4.1 Understanding the organization and its context'));

      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('displays validation errors', async () => {
    render(
      <BrowserRouter>
        <DocumentUpload />
      </BrowserRouter>
    );

    await act(async () => {
      const submitButton = screen.getByTestId('submit-button');
      fireEvent.click(submitButton);
    });

    expect(screen.getByText('Please select a file to upload')).toBeInTheDocument();
    expect(screen.getByText('Please select at least one AS9100 clause')).toBeInTheDocument();
  });
}); 