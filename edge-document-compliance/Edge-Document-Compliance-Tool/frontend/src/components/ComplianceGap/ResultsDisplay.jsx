/**
 * ComplianceGap ResultsDisplay Component
 * Displays gap analysis results with visualizations
 */

import React, { useState, useEffect } from 'react';
import './ResultsDisplay.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function ResultsDisplay({ analysisId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGap, setSelectedGap] = useState(null);

  useEffect(() => {
    if (analysisId) {
      loadAnalysis();
    }
  }, [analysisId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/compliancegap/analysis/${analysisId}`);
      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || 'Failed to load analysis');
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="results-display">
        <div className="loading-state">Loading analysis results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-display">
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={loadAnalysis} className="btn btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="results-display">
        <div className="empty-state">No analysis data available</div>
      </div>
    );
  }

  const analysisData = typeof analysis.analysis_data === 'string' 
    ? JSON.parse(analysis.analysis_data) 
    : analysis.analysis_data;

  const gaps = analysisData?.gaps || [];
  const coveredCount = analysis.covered_count || 0;
  const partiallyCoveredCount = analysis.partially_covered_count || 0;
  const notCoveredCount = analysis.not_covered_count || 0;
  const total = analysis.total_requirements || 0;

  const coveragePercentage = total > 0 ? ((coveredCount / total) * 100).toFixed(1) : 0;

  return (
    <div className="results-display">
      <div className="results-header">
        <h2>Gap Analysis Results</h2>
        <div className="analysis-meta">
          <span className="meta-item">
            <strong>Standard:</strong> {analysis.standard_code || 'N/A'}
          </span>
          <span className="meta-item">
            <strong>Status:</strong> <span className={`status-badge status-${analysis.status}`}>
              {analysis.status}
            </span>
          </span>
          <span className="meta-item">
            <strong>Confidence:</strong> {(analysis.confidence_score * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="results-summary">
        <div className="summary-card">
          <div className="summary-value">{coveragePercentage}%</div>
          <div className="summary-label">Coverage</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{coveredCount}</div>
          <div className="summary-label">Covered</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{partiallyCoveredCount}</div>
          <div className="summary-label">Partial</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{notCoveredCount}</div>
          <div className="summary-label">Gaps</div>
        </div>
      </div>

      <div className="coverage-chart">
        <div className="chart-bar">
          <div 
            className="chart-segment chart-covered" 
            style={{ width: `${(coveredCount / total) * 100}%` }}
            title={`Covered: ${coveredCount}`}
          />
          <div 
            className="chart-segment chart-partial" 
            style={{ width: `${(partiallyCoveredCount / total) * 100}%` }}
            title={`Partially Covered: ${partiallyCoveredCount}`}
          />
          <div 
            className="chart-segment chart-gap" 
            style={{ width: `${(notCoveredCount / total) * 100}%` }}
            title={`Gaps: ${notCoveredCount}`}
          />
        </div>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-color covered"></span> Covered
          </span>
          <span className="legend-item">
            <span className="legend-color partial"></span> Partial
          </span>
          <span className="legend-item">
            <span className="legend-color gap"></span> Gaps
          </span>
        </div>
      </div>

      {analysis.summary && (
        <div className="analysis-summary">
          <h3>Summary</h3>
          <p>{analysis.summary}</p>
        </div>
      )}

      <div className="gaps-list">
        <h3>Detailed Gap Analysis ({gaps.length} requirements)</h3>
        <div className="gaps-filters">
          <button 
            className={`filter-btn ${selectedGap === null ? 'active' : ''}`}
            onClick={() => setSelectedGap(null)}
          >
            All
          </button>
          <button 
            className={`filter-btn ${selectedGap === 'not_covered' ? 'active' : ''}`}
            onClick={() => setSelectedGap('not_covered')}
          >
            Gaps Only
          </button>
          <button 
            className={`filter-btn ${selectedGap === 'partially_covered' ? 'active' : ''}`}
            onClick={() => setSelectedGap('partially_covered')}
          >
            Partial Only
          </button>
        </div>

        <div className="gaps-items">
          {gaps
            .filter(gap => !selectedGap || gap.status === selectedGap)
            .map((gap, idx) => (
              <div key={gap.requirement_id || idx} className={`gap-item gap-${gap.status}`}>
                <div className="gap-header">
                  <span className="gap-clause">{gap.clause_number || `REQ-${idx + 1}`}</span>
                  <span className={`gap-status status-${gap.status}`}>
                    {gap.status.replace('_', ' ')}
                  </span>
                  <span className={`gap-risk risk-${gap.risk_level}`}>
                    {gap.risk_level} risk
                  </span>
                </div>
                <div className="gap-requirement">
                  <strong>Requirement:</strong> {gap.requirement_text}
                </div>
                {gap.evidence && (
                  <div className="gap-evidence">
                    <strong>Evidence:</strong> {gap.evidence}
                  </div>
                )}
                {gap.gap_description && gap.status !== 'covered' && (
                  <div className="gap-description">
                    <strong>Gap:</strong> {gap.gap_description}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

