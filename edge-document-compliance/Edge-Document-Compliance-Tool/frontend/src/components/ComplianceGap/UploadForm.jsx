/**
 * ComplianceGap UploadForm Component
 * Form for uploading compliance standards and starting gap analysis
 */

import React, { useState, useEffect } from 'react';
import './UploadForm.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function UploadForm({ onAnalysisStarted, customerId }) {
  const [standards, setStandards] = useState([]);
  const [selectedStandard, setSelectedStandard] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    try {
      const response = await fetch(`${API_BASE}/compliancegap/standards`);
      const data = await response.json();

      if (data.success) {
        setStandards(data.standards);
      }
    } catch (error) {
      console.error('Error loading standards:', error);
      setError('Failed to load compliance standards');
    }
  };

  const handleStartAnalysis = async (e) => {
    e.preventDefault();
    
    if (!selectedStandard) {
      setError('Please select a compliance standard');
      return;
    }

    if (!customerId) {
      setError('Customer ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_BASE}/compliancegap/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          standardId: selectedStandard
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Analysis started! Analysis ID: ${data.analysis.analysis_id}`);
        
        if (onAnalysisStarted) {
          onAnalysisStarted(data.analysis);
        }
      } else {
        setError(data.error || 'Failed to start analysis');
      }
    } catch (error) {
      console.error('Error starting analysis:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStandard = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const standardData = {
      code: formData.get('code'),
      name: formData.get('name'),
      version: formData.get('version'),
      authority_source: formData.get('authority_source'),
      sector: formData.get('sector'),
      description: formData.get('description'),
      document_url: formData.get('document_url')
    };

    if (!standardData.code || !standardData.name) {
      setError('Code and name are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/compliancegap/standards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(standardData)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Standard "${standardData.name}" created successfully`);
        await loadStandards();
        e.target.reset();
      } else {
        setError(data.error || 'Failed to create standard');
      }
    } catch (error) {
      console.error('Error creating standard:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-form-container">
      <div className="upload-form-section">
        <h3>Start Gap Analysis</h3>
        <form onSubmit={handleStartAnalysis} className="upload-form">
          <div className="form-group">
            <label htmlFor="standard-select">Select Compliance Standard:</label>
            <select
              id="standard-select"
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              required
              disabled={loading}
              className="form-select"
            >
              <option value="">-- Select a standard --</option>
              {standards.map(standard => (
                <option key={standard.id} value={standard.id}>
                  {standard.code} - {standard.name} {standard.version ? `(${standard.version})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Customer ID:</label>
            <input
              type="text"
              value={customerId || ''}
              disabled
              className="form-input"
              placeholder="Set customer ID"
            />
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" disabled={loading || !selectedStandard} className="btn btn-primary">
            {loading ? 'Starting Analysis...' : 'Start Analysis'}
          </button>
        </form>
      </div>

      <div className="upload-form-section">
        <h3>Create New Standard</h3>
        <form onSubmit={handleCreateStandard} className="upload-form">
          <div className="form-group">
            <label htmlFor="code">Code *:</label>
            <input
              type="text"
              id="code"
              name="code"
              required
              disabled={loading}
              className="form-input"
              placeholder="e.g., ISO9001"
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Name *:</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              disabled={loading}
              className="form-input"
              placeholder="e.g., ISO 9001:2015 Quality Management"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="version">Version:</label>
              <input
                type="text"
                id="version"
                name="version"
                disabled={loading}
                className="form-input"
                placeholder="e.g., 2015"
              />
            </div>

            <div className="form-group">
              <label htmlFor="sector">Sector:</label>
              <input
                type="text"
                id="sector"
                name="sector"
                disabled={loading}
                className="form-input"
                placeholder="e.g., Manufacturing"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="authority_source">Authority Source:</label>
            <input
              type="text"
              id="authority_source"
              name="authority_source"
              disabled={loading}
              className="form-input"
              placeholder="e.g., ISO, FDA, FAA"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              rows="3"
              disabled={loading}
              className="form-textarea"
              placeholder="Standard description..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="document_url">Document URL:</label>
            <input
              type="url"
              id="document_url"
              name="document_url"
              disabled={loading}
              className="form-input"
              placeholder="https://..."
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-secondary">
            {loading ? 'Creating...' : 'Create Standard'}
          </button>
        </form>
      </div>
    </div>
  );
}

