/**
 * VERA Root Cause Analysis Interface
 * Guided RCA workflow with 5-Why analysis
 */

import React, { useState, useEffect } from 'react';
import './RCAInterface.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function RCAInterface({ nonconformanceId, onRCAComplete }) {
  const [nonconformance, setNonconformance] = useState(null);
  const [rca, setRca] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('details'); // details, analyze, corrective-actions, verify
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [newCA, setNewCA] = useState({
    action_description: '',
    responsible_person: '',
    target_completion_date: ''
  });

  useEffect(() => {
    if (nonconformanceId) {
      loadNonconformance();
    }
  }, [nonconformanceId]);

  const loadNonconformance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/vera/rca/nonconformance/${nonconformanceId}`);
      const data = await response.json();

      if (data.success) {
        setNonconformance(data.nonconformance);
        if (data.root_cause_analysis) {
          setRca(data.root_cause_analysis);
          setStep('corrective-actions');
        }
        if (data.corrective_actions) {
          setCorrectiveActions(data.corrective_actions);
        }
      }
    } catch (error) {
      console.error('Error loading nonconformance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/vera/rca/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nonconformanceId })
      });

      const data = await response.json();

      if (data.success) {
        setRca(data.rca);
        setStep('corrective-actions');
        
        if (onRCAComplete) {
          onRCAComplete(data.rca);
        }
      }
    } catch (error) {
      console.error('Error performing RCA:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCA = async (e) => {
    e.preventDefault();
    
    if (!newCA.action_description) {
      alert('Action description is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/vera/rca/corrective-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nonconformanceId,
          rootCauseId: rca?.root_cause_id,
          ...newCA
        })
      });

      const data = await response.json();

      if (data.success) {
        setCorrectiveActions([...correctiveActions, data.corrective_action]);
        setNewCA({
          action_description: '',
          responsible_person: '',
          target_completion_date: ''
        });
      }
    } catch (error) {
      console.error('Error creating CA:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCA = async (caId, effectivenessScore) => {
    const verification = prompt('Enter effectiveness verification notes:');
    if (!verification) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/vera/rca/corrective-action/${caId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveness_verification: verification,
          verified_by: 'Current User', // In production, get from auth
          effectiveness_score: effectivenessScore
        })
      });

      const data = await response.json();

      if (data.success) {
        await loadNonconformance();
        if (data.nonconformance_closed) {
          alert('Corrective action verified! Nonconformance closed.');
        }
      }
    } catch (error) {
      console.error('Error verifying CA:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !nonconformance) {
    return <div className="rca-loading">Loading nonconformance...</div>;
  }

  if (!nonconformance) {
    return <div className="rca-error">Nonconformance not found</div>;
  }

  return (
    <div className="rca-interface">
      <div className="rca-header">
        <h2>Root Cause Analysis</h2>
        <div className="nc-info">
          <span className="nc-number">{nonconformance.nc_number}</span>
          <span className={`nc-status status-${nonconformance.status}`}>
            {nonconformance.status}
          </span>
        </div>
      </div>

      {/* Step 1: Nonconformance Details */}
      {step === 'details' && (
        <div className="rca-step">
          <h3>Nonconformance Details</h3>
          <div className="nc-details">
            <div className="detail-row">
              <strong>Title:</strong> {nonconformance.title}
            </div>
            <div className="detail-row">
              <strong>Description:</strong> {nonconformance.description}
            </div>
            <div className="detail-row">
              <strong>Location:</strong> {nonconformance.location || 'Not specified'}
            </div>
            <div className="detail-row">
              <strong>Severity:</strong> 
              <span className={`severity severity-${nonconformance.severity}`}>
                {nonconformance.severity}
              </span>
            </div>
            <div className="detail-row">
              <strong>Detected:</strong> {new Date(nonconformance.detected_at).toLocaleString()}
            </div>
          </div>
          <button onClick={handleAnalyze} className="btn-primary" disabled={loading}>
            {loading ? 'Analyzing...' : 'Start Root Cause Analysis'}
          </button>
        </div>
      )}

      {/* Step 2: RCA Results */}
      {step === 'corrective-actions' && rca && (
        <div className="rca-step">
          <h3>5-Why Analysis Results</h3>
          
          <div className="why-analysis">
            <div className="why-level">
              <div className="why-label">Why 1:</div>
              <div className="why-answer">{rca.analysis.why_levels.level_1}</div>
            </div>
            <div className="why-level">
              <div className="why-label">Why 2:</div>
              <div className="why-answer">{rca.analysis.why_levels.level_2}</div>
            </div>
            <div className="why-level">
              <div className="why-label">Why 3:</div>
              <div className="why-answer">{rca.analysis.why_levels.level_3}</div>
            </div>
            <div className="why-level">
              <div className="why-label">Why 4:</div>
              <div className="why-answer">{rca.analysis.why_levels.level_4}</div>
            </div>
            <div className="why-level">
              <div className="why-label">Why 5:</div>
              <div className="why-answer">{rca.analysis.why_levels.level_5}</div>
            </div>
          </div>

          <div className="root-cause-box">
            <h4>Root Cause Identified</h4>
            <p>{rca.analysis.root_cause}</p>
            <div className="rca-meta">
              <span>Category: {rca.analysis.category}</span>
              <span>Confidence: {(rca.analysis.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Fishbone Diagram */}
          {rca.fishbone_diagram && (
            <div className="fishbone-diagram">
              <h4>Fishbone Diagram</h4>
              <div className="fishbone-categories">
                {rca.fishbone_diagram.categories.map(cat => (
                  <div key={cat.id} className="fishbone-category">
                    <div className="category-label">{cat.label}</div>
                    <div className="category-factors">
                      {cat.factors.map((factor, idx) => (
                        <div key={idx} className="factor">{factor}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Corrective Action Recommendations */}
          {rca.corrective_action_recommendations && (
            <div className="ca-recommendations">
              <h4>Recommended Corrective Actions</h4>
              {rca.corrective_action_recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation">
                  <div className="rec-priority priority-{rec.priority}">{rec.priority}</div>
                  <div className="rec-content">
                    <p><strong>{rec.action}</strong></p>
                    <p>Responsible: {rec.responsible}</p>
                    <p>Timeline: {rec.timeline}</p>
                    <p>Verification: {rec.effectiveness_verification}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Corrective Action */}
          <div className="create-ca">
            <h4>Create Corrective Action</h4>
            <form onSubmit={handleCreateCA}>
              <div className="form-group">
                <label>Action Description *</label>
                <textarea
                  value={newCA.action_description}
                  onChange={(e) => setNewCA({ ...newCA, action_description: e.target.value })}
                  required
                  rows="4"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Responsible Person</label>
                  <input
                    type="text"
                    value={newCA.responsible_person}
                    onChange={(e) => setNewCA({ ...newCA, responsible_person: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Target Completion Date</label>
                  <input
                    type="date"
                    value={newCA.target_completion_date}
                    onChange={(e) => setNewCA({ ...newCA, target_completion_date: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                Create Corrective Action
              </button>
            </form>
          </div>

          {/* Existing Corrective Actions */}
          {correctiveActions.length > 0 && (
            <div className="existing-cas">
              <h4>Corrective Actions</h4>
              {correctiveActions.map(ca => (
                <div key={ca.id} className="ca-item">
                  <div className="ca-header">
                    <span className="ca-number">{ca.ca_number}</span>
                    <span className={`ca-status status-${ca.status}`}>{ca.status}</span>
                  </div>
                  <p>{ca.action_description}</p>
                  {ca.status === 'completed' && (
                    <div className="ca-verify">
                      <label>Effectiveness Score:</label>
                      <div className="score-buttons">
                        <button onClick={() => handleVerifyCA(ca.id, 0.6)} className="btn-score low">
                          Low (0.6)
                        </button>
                        <button onClick={() => handleVerifyCA(ca.id, 0.8)} className="btn-score medium">
                          Medium (0.8)
                        </button>
                        <button onClick={() => handleVerifyCA(ca.id, 1.0)} className="btn-score high">
                          High (1.0)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

