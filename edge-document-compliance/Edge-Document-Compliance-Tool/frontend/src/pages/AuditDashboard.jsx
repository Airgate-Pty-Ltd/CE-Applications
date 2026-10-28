/**
 * Audit Dashboard
 * Lists open and completed audits
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auditsAPI } from '../services/api';
import './AuditDashboard.css';

export default function AuditDashboard() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, completed
  const [dateRange, setDateRange] = useState('12months');
  const navigate = useNavigate();

  useEffect(() => {
    loadAudits();
  }, [filter, dateRange]);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'open') {
        params.status = 'IN_PROGRESS';
      } else if (filter === 'completed') {
        params.status = 'CLOSED';
      }

      // Date range filter
      if (dateRange === '12months') {
        const dateFrom = new Date();
        dateFrom.setMonth(dateFrom.getMonth() - 12);
        params.date_from = dateFrom.toISOString();
      }

      const response = await auditsAPI.list(params);
      setAudits(response.data);
    } catch (err) {
      console.error('Failed to load audits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAudit = () => {
    navigate('/audits/create');
  };

  const handleViewAudit = (id) => {
    navigate(`/audits/${id}`);
  };

  return (
    <div className="audit-dashboard">
      <header className="dashboard-header">
        <h1>Audit Dashboard</h1>
        <button onClick={handleCreateAudit} className="btn-primary">
          Create New Audit
        </button>
      </header>

      <div className="dashboard-filters">
        <div className="filter-group">
          <label>Filter:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Audits</option>
            <option value="open">Open Audits</option>
            <option value="completed">Completed Audits</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Date Range:</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="12months">Last 12 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="3months">Last 3 Months</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading audits...</div>
      ) : audits.length === 0 ? (
        <div className="empty-state">
          <p>No audits found.</p>
          <button onClick={handleCreateAudit} className="btn-primary">
            Create Your First Audit
          </button>
        </div>
      ) : (
        <div className="audit-list">
          {audits.map((audit) => (
            <div key={audit.id} className="audit-card" onClick={() => handleViewAudit(audit.id)}>
              <div className="audit-card-header">
                <h3>{audit.title}</h3>
                <span className={`status-badge status-${audit.status.toLowerCase().replace('_', '-')}`}>
                  {audit.status}
                </span>
              </div>
              {audit.description && <p className="audit-description">{audit.description}</p>}
              <div className="audit-card-footer">
                <span>Items: {audit.item_count || 0}</span>
                <span>Responses: {audit.response_count || 0}</span>
                <span>Created: {new Date(audit.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
