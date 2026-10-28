/**
 * ComplianceGap Main Page
 * Complete chat interface with upload, analysis, clarifications, and results
 */

import React, { useState, useEffect } from 'react';
import UploadForm from '../components/ComplianceGap/UploadForm';
import ChatInterface from '../components/ComplianceGap/ChatInterface';
import ResultsDisplay from '../components/ComplianceGap/ResultsDisplay';
import './ComplianceGap.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function ComplianceGap() {
  const [customerId, setCustomerId] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [activeSection, setActiveSection] = useState('upload'); // upload, chat, results, feedback
  const [uploadProgress, setUploadProgress] = useState({ standard: null, document: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get customer ID from localStorage or prompt
    const savedCustomerId = localStorage.getItem('compliancegap_customer_id');
    if (savedCustomerId) {
      setCustomerId(savedCustomerId);
    } else {
      // Prompt for customer ID (in production, get from auth)
      const input = prompt('Enter Customer ID:');
      if (input) {
        setCustomerId(input);
        localStorage.setItem('compliancegap_customer_id', input);
      }
    }

    // Load analysis history
    if (savedCustomerId) {
      loadAnalysisHistory(savedCustomerId);
    }
  }, []);

  const loadAnalysisHistory = async (customerId) => {
    try {
      const response = await fetch(`${API_BASE}/compliancegap/analyses?customerId=${customerId}`);
      const data = await response.json();
      if (data.success) {
        setAnalysisHistory(data.analyses);
      }
    } catch (error) {
      console.error('Error loading analysis history:', error);
    }
  };

  const handleAnalysisStarted = async (analysis) => {
    setCurrentAnalysis(analysis);
    setActiveSection('chat');
    
    // Load analysis history
    if (customerId) {
      await loadAnalysisHistory(customerId);
    }
  };

  const handleClarificationAnswered = async (clarificationId, answer) => {
    // Check if analysis is complete
    try {
      const response = await fetch(`${API_BASE}/compliancegap/analysis/${currentAnalysis.analysis_id}`);
      const data = await response.json();
      
      if (data.success && data.analysis.status === 'completed') {
        setActiveSection('results');
        // Reload current analysis
        setCurrentAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error checking analysis status:', error);
    }
  };

  const handleFileUpload = async (file, type) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('customerId', customerId);

    try {
      const response = await fetch(`${API_BASE}/compliancegap/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadProgress(prev => ({
          ...prev,
          [type]: { status: 'completed', documentId: data.document.id }
        }));
      } else {
        setUploadProgress(prev => ({
          ...prev,
          [type]: { status: 'error', error: data.error }
        }));
      }
    } catch (error) {
      setUploadProgress(prev => ({
        ...prev,
        [type]: { status: 'error', error: error.message }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (rating, feedbackText) => {
    if (!currentAnalysis) return;

    try {
      const response = await fetch(`${API_BASE}/compliancegap/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: currentAnalysis.analysis_id,
          rating,
          feedbackText
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`Thank you for your feedback! Model version: ${data.model_version}`);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Error submitting feedback');
    }
  };

  const handleExportPDF = () => {
    // In production, this would generate and download a PDF report
    alert('PDF export feature coming soon!');
  };

  if (!customerId) {
    return (
      <div className="compliancegap-container">
        <div className="customer-id-prompt">
          <h2>Customer ID Required</h2>
          <p>Please enter your Customer ID to continue.</p>
          <input
            type="text"
            placeholder="Customer ID"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                setCustomerId(e.target.value);
                localStorage.setItem('compliancegap_customer_id', e.target.value);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="compliancegap-container">
      <header className="compliancegap-header">
        <h1>ComplianceGap Analysis</h1>
        <div className="header-actions">
          <span className="customer-id">Customer: {customerId}</span>
          <button onClick={() => setActiveSection('upload')} className="btn-nav">Upload</button>
          <button onClick={() => setActiveSection('history')} className="btn-nav">History</button>
        </div>
      </header>

      <div className="compliancegap-content">
        {/* Section 1: Upload */}
        {activeSection === 'upload' && (
          <div className="section-upload">
            <h2>Upload Documents</h2>
            <div className="upload-grid">
              <div className="upload-card">
                <h3>Compliance Standard</h3>
                <div className="drop-zone" 
                     onDrop={(e) => {
                       e.preventDefault();
                       const file = e.dataTransfer.files[0];
                       if (file) handleFileUpload(file, 'standard');
                     }}
                     onDragOver={(e) => e.preventDefault()}>
                  <p>Drag & drop compliance standard PDF here</p>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleFileUpload(file, 'standard');
                    }}
                  />
                </div>
                {uploadProgress.standard && (
                  <div className={`upload-status ${uploadProgress.standard.status}`}>
                    {uploadProgress.standard.status === 'completed' ? '✅ Uploaded' : 
                     uploadProgress.standard.status === 'error' ? `❌ ${uploadProgress.standard.error}` : 
                     '⏳ Uploading...'}
                  </div>
                )}
              </div>

              <div className="upload-card">
                <h3>Customer Document</h3>
                <div className="drop-zone"
                     onDrop={(e) => {
                       e.preventDefault();
                       const file = e.dataTransfer.files[0];
                       if (file) handleFileUpload(file, 'document');
                     }}
                     onDragOver={(e) => e.preventDefault()}>
                  <p>Drag & drop customer document (PDF/Word) here</p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleFileUpload(file, 'document');
                    }}
                  />
                </div>
                {uploadProgress.document && (
                  <div className={`upload-status ${uploadProgress.document.status}`}>
                    {uploadProgress.document.status === 'completed' ? '✅ Uploaded' : 
                     uploadProgress.document.status === 'error' ? `❌ ${uploadProgress.document.error}` : 
                     '⏳ Uploading...'}
                  </div>
                )}
              </div>
            </div>

            <div className="upload-actions">
              <UploadForm 
                onAnalysisStarted={handleAnalysisStarted}
                customerId={customerId}
              />
            </div>
          </div>
        )}

        {/* Section 2: Chat */}
        {activeSection === 'chat' && currentAnalysis && (
          <div className="section-chat">
            <h2>Analysis Progress</h2>
            <ChatInterface
              analysisId={currentAnalysis.analysis_id}
              onClarificationAnswered={handleClarificationAnswered}
            />
            <div className="chat-actions">
              <button onClick={() => setActiveSection('results')} className="btn-primary">
                View Results
              </button>
            </div>
          </div>
        )}

        {/* Section 3: Results */}
        {activeSection === 'results' && currentAnalysis && (
          <div className="section-results">
            <h2>Gap Analysis Results</h2>
            <ResultsDisplay analysisId={currentAnalysis.analysis_id} />
            
            {/* Section 4: Feedback */}
            <div className="section-feedback">
              <h3>Feedback</h3>
              <div className="feedback-widget">
                <div className="rating-widget">
                  <label>Rate this analysis:</label>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        className="star-btn"
                        onClick={() => handleFeedback(star, '')}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>
                <div className="feedback-actions">
                  <button onClick={handleExportPDF} className="btn-secondary">
                    Export PDF
                  </button>
                  <button 
                    onClick={() => setActiveSection('history')} 
                    className="btn-secondary"
                  >
                    View Previous Analyses
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section: History */}
        {activeSection === 'history' && (
          <div className="section-history">
            <h2>Analysis History</h2>
            <div className="history-list">
              {analysisHistory.length === 0 ? (
                <p>No previous analyses found.</p>
              ) : (
                analysisHistory.map(analysis => (
                  <div 
                    key={analysis.analysis_id} 
                    className="history-item"
                    onClick={() => {
                      setCurrentAnalysis(analysis);
                      setActiveSection('results');
                    }}
                  >
                    <div className="history-header">
                      <span className="history-standard">{analysis.standard_code}</span>
                      <span className={`history-status status-${analysis.status}`}>
                        {analysis.status}
                      </span>
                    </div>
                    <div className="history-stats">
                      <span>Covered: {analysis.covered_count}</span>
                      <span>Partial: {analysis.partially_covered_count}</span>
                      <span>Gaps: {analysis.not_covered_count}</span>
                      <span>Confidence: {(analysis.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="history-date">
                      {new Date(analysis.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

