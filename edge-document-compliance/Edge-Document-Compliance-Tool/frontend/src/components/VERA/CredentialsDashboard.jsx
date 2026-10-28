/**
 * VERA Credentials Dashboard
 * 
 * Membership Management Dashboard for viewing and managing stored credentials
 * Shows all websites, access levels, expiration dates, and audit logs
 */

import React, { useState, useEffect } from 'react';
import './CredentialsDashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export default function CredentialsDashboard() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [filter, setFilter] = useState('all'); // all, active, expired, expiring_soon
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    website: '',
    username: '',
    password: '',
    access_level: '',
    membership_type: '',
    organization: '',
    membership_number: '',
    expiration_date: ''
  });

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/vera/credentials`, {
        headers: {
          'x-user-id': localStorage.getItem('user_id') || 'default'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCredentials(data.credentials || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load credentials');
      }
    } catch (err) {
      console.error('Error loading credentials:', err);
      setError('Failed to load credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async (credentialId) => {
    try {
      const response = await fetch(`${API_BASE}/vera/credentials/${credentialId}/audit`, {
        headers: {
          'x-user-id': localStorage.getItem('user_id') || 'default'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAuditLog(data.audit_log || []);
        setShowAuditLog(true);
      }
    } catch (err) {
      console.error('Error loading audit log:', err);
    }
  };

  const handleAddCredential = async (e) => {
    e.preventDefault();
    
    // Show verification status
    setVerifying(true);
    setVerificationStatus({
      message: `Verifying credentials for ${formData.website}...`,
      website: formData.website
    });
    
    try {
      const response = await fetch(`${API_BASE}/vera/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('user_id') || 'default'
        },
        body: JSON.stringify({
          website: formData.website,
          username: formData.username,
          password: formData.password,
          metadata: {
            access_level: formData.access_level,
            membership_type: formData.membership_type,
            organization: formData.organization,
            membership_number: formData.membership_number,
            expiration_date: formData.expiration_date || null
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setVerificationStatus({
          success: true,
          message: data.verification_result?.message || `✅ Credentials verified!`,
          website: data.website
        });
        
        // Wait a moment to show success message
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        await loadCredentials();
        setShowAddForm(false);
        resetForm();
        setVerifying(false);
        setVerificationStatus(null);
        
        alert(`✅ ${data.message || `Credentials for ${data.website} verified and stored securely!`}`);
      } else {
        setVerifying(false);
        setVerificationStatus({
          success: false,
          message: data.message || data.error || 'Verification failed',
          website: formData.website,
          error: data.error
        });
        
        // Show error alert
        if (data.error === 'LOGIN_VERIFICATION_FAILED') {
          alert(`❌ Login verification failed!\n\n${data.message}\n\n${data.suggestion || 'Please check your username and password are correct.'}`);
        } else {
          alert(`❌ Error: ${data.message || data.error}`);
        }
      }
    } catch (err) {
      console.error('Error adding credential:', err);
      setVerifying(false);
      setVerificationStatus({
        success: false,
        message: 'Failed to verify credentials',
        error: err.message
      });
      alert('Failed to add credential. Please try again.');
    }
  };

  const handleUpdateCredential = async (e) => {
    e.preventDefault();
    if (!selectedCredential) return;

    try {
      const response = await fetch(`${API_BASE}/vera/credentials/${selectedCredential.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('user_id') || 'default'
        },
        body: JSON.stringify({
          password: formData.password || undefined,
          username: formData.username || undefined,
          access_level: formData.access_level || undefined,
          membership_type: formData.membership_type || undefined,
          organization: formData.organization || undefined,
          membership_number: formData.membership_number || undefined,
          expiration_date: formData.expiration_date || undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadCredentials();
        setShowEditForm(false);
        setSelectedCredential(null);
        resetForm();
        alert('✅ Credential updated successfully!');
      } else {
        alert(`❌ Error: ${data.message || data.error}`);
      }
    } catch (err) {
      console.error('Error updating credential:', err);
      alert('Failed to update credential. Please try again.');
    }
  };

  const handleDeleteCredential = async (credentialId, website) => {
    if (!confirm(`Are you sure you want to revoke access to ${website}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/vera/credentials/${credentialId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': localStorage.getItem('user_id') || 'default'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        await loadCredentials();
        alert(`✅ Access to ${website} revoked successfully.`);
      } else {
        alert(`❌ Error: ${data.message || data.error}`);
      }
    } catch (err) {
      console.error('Error deleting credential:', err);
      alert('Failed to delete credential. Please try again.');
    }
  };

  const handleTestCredential = async (credentialId) => {
    try {
      const response = await fetch(`${API_BASE}/vera/credentials/${credentialId}/test`, {
        method: 'POST',
        headers: {
          'x-user-id': localStorage.getItem('user_id') || 'default'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Login test successful! ${data.message}`);
      } else {
        alert(`❌ Login test failed: ${data.message || data.test_result?.message}`);
      }
    } catch (err) {
      console.error('Error testing credential:', err);
      alert('Failed to test credential. Please try again.');
    }
  };

  const handleEdit = (credential) => {
    setSelectedCredential(credential);
    setFormData({
      website: credential.website,
      username: credential.username,
      password: '', // Don't show existing password
      access_level: credential.access_level || '',
      membership_type: credential.membership_type || '',
      organization: credential.organization || '',
      membership_number: credential.membership_number || '',
      expiration_date: credential.expiration_date || ''
    });
    setShowEditForm(true);
  };

  const resetForm = () => {
    setFormData({
      website: '',
      username: '',
      password: '',
      access_level: '',
      membership_type: '',
      organization: '',
      membership_number: '',
      expiration_date: ''
    });
  };

  const isExpiringSoon = (expirationDate) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const isExpired = (expirationDate) => {
    if (!expirationDate) return false;
    return new Date(expirationDate) < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No expiration';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastUsed = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const getFilteredCredentials = () => {
    switch (filter) {
      case 'active':
        return credentials.filter(c => !isExpired(c.expiration_date));
      case 'expired':
        return credentials.filter(c => isExpired(c.expiration_date));
      case 'expiring_soon':
        return credentials.filter(c => isExpiringSoon(c.expiration_date));
      default:
        return credentials;
    }
  };

  const exportCredentials = () => {
    const exportData = credentials.map(c => ({
      website: c.website,
      access_level: c.access_level,
      membership_type: c.membership_type,
      organization: c.organization,
      membership_number: c.membership_number,
      expiration_date: c.expiration_date,
      last_used: c.last_used
      // Note: Passwords are NOT exported for security
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vera-credentials-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredCredentials = getFilteredCredentials();

  if (loading) {
    return (
      <div className="credentials-dashboard">
        <div className="loading">Loading credentials...</div>
      </div>
    );
  }

  return (
    <div className="credentials-dashboard">
      <div className="dashboard-header">
        <h1>🔐 VERA Credentials Dashboard</h1>
        <p className="subtitle">Manage your website credentials and memberships</p>
      </div>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={loadCredentials}>Retry</button>
        </div>
      )}

      <div className="dashboard-controls">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All ({credentials.length})
          </button>
          <button 
            className={filter === 'active' ? 'active' : ''} 
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button 
            className={filter === 'expiring_soon' ? 'active' : ''} 
            onClick={() => setFilter('expiring_soon')}
          >
            Expiring Soon
          </button>
          <button 
            className={filter === 'expired' ? 'active' : ''} 
            onClick={() => setFilter('expired')}
          >
            Expired
          </button>
        </div>

        <div className="action-buttons">
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            ➕ Add Credential
          </button>
          <button className="btn-secondary" onClick={exportCredentials}>
            📥 Export List
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verifying && verificationStatus && (
        <div className={`verification-banner ${verificationStatus.success === false ? 'error' : verificationStatus.success === true ? 'success' : 'verifying'}`}>
          <div className="verification-content">
            {verificationStatus.success === true ? (
              <>
                <span className="verification-icon">✅</span>
                <span>{verificationStatus.message}</span>
              </>
            ) : verificationStatus.success === false ? (
              <>
                <span className="verification-icon">❌</span>
                <span>{verificationStatus.message}</span>
              </>
            ) : (
              <>
                <span className="verification-icon spinning">⏳</span>
                <span>{verificationStatus.message}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Credential Form */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => { 
          if (!verifying) {
            setShowAddForm(false); 
            resetForm(); 
            setVerificationStatus(null);
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Credential</h2>
            <p className="form-description">
              VERA will verify your credentials work before storing them securely.
            </p>
            <form onSubmit={handleAddCredential} disabled={verifying}>
              <div className="form-group">
                <label>Website *</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="ansi.org"
                  required
                />
              </div>

              <div className="form-group">
                <label>Username/Email *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required
                />
                <small>🔒 Password will be encrypted with AES-256</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Access Level</label>
                  <select
                    value={formData.access_level}
                    onChange={(e) => setFormData({ ...formData, access_level: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="free">Free</option>
                    <option value="member">Member</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Membership Type</label>
                  <input
                    type="text"
                    value={formData.membership_type}
                    onChange={(e) => setFormData({ ...formData, membership_type: e.target.value })}
                    placeholder="ANSI, ASQ, ISO, etc."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Membership Number</label>
                  <input
                    type="text"
                    value={formData.membership_number}
                    onChange={(e) => setFormData({ ...formData, membership_number: e.target.value })}
                    placeholder="A12345"
                  />
                </div>

                <div className="form-group">
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={verifying}
                >
                  {verifying ? 'Verifying...' : 'Verify & Save Credential'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => { 
                    if (!verifying) {
                      setShowAddForm(false); 
                      resetForm(); 
                      setVerificationStatus(null);
                    }
                  }}
                  disabled={verifying}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Credential Form */}
      {showEditForm && selectedCredential && (
        <div className="modal-overlay" onClick={() => { setShowEditForm(false); setSelectedCredential(null); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Credential: {selectedCredential.website}</h2>
            <form onSubmit={handleUpdateCredential}>
              <div className="form-group">
                <label>Username/Email</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>New Password (leave blank to keep current)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Access Level</label>
                  <select
                    value={formData.access_level}
                    onChange={(e) => setFormData({ ...formData, access_level: e.target.value })}
                  >
                    <option value="">Select...</option>
                    <option value="free">Free</option>
                    <option value="member">Member</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Membership Type</label>
                  <input
                    type="text"
                    value={formData.membership_type}
                    onChange={(e) => setFormData({ ...formData, membership_type: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Organization</label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Membership Number</label>
                  <input
                    type="text"
                    value={formData.membership_number}
                    onChange={(e) => setFormData({ ...formData, membership_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">Update Credential</button>
                <button type="button" className="btn-secondary" onClick={() => { setShowEditForm(false); setSelectedCredential(null); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditLog && selectedCredential && (
        <div className="modal-overlay" onClick={() => { setShowAuditLog(false); setSelectedCredential(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Audit Log: {selectedCredential.website}</h2>
            <div className="audit-log">
              {auditLog.length === 0 ? (
                <p>No audit log entries found.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Timestamp</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.map((entry, idx) => (
                      <tr key={idx}>
                        <td><span className={`action-badge action-${entry.action}`}>{entry.action}</span></td>
                        <td>{new Date(entry.timestamp).toLocaleString()}</td>
                        <td>{entry.details ? JSON.stringify(entry.details, null, 2) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => { setShowAuditLog(false); setSelectedCredential(null); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials List */}
      <div className="credentials-list">
        {filteredCredentials.length === 0 ? (
          <div className="empty-state">
            <p>No credentials found.</p>
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
              Add Your First Credential
            </button>
          </div>
        ) : (
          <table className="credentials-table">
            <thead>
              <tr>
                <th>Website</th>
                <th>Access Level</th>
                <th>Membership</th>
                <th>Organization</th>
                <th>Expiration</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCredentials.map((cred) => {
                const expiringSoon = isExpiringSoon(cred.expiration_date);
                const expired = isExpired(cred.expiration_date);
                
                return (
                  <tr key={cred.id} className={expired ? 'expired' : expiringSoon ? 'expiring-soon' : ''}>
                    <td>
                      <strong>{cred.website}</strong>
                      <br />
                      <small>{cred.username}</small>
                    </td>
                    <td>
                      <span className={`badge badge-${cred.access_level || 'unknown'}`}>
                        {cred.access_level || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {cred.membership_type && (
                        <>
                          <strong>{cred.membership_type}</strong>
                          {cred.membership_number && (
                            <br />
                            <small>#{cred.membership_number}</small>
                          )}
                        </>
                      )}
                    </td>
                    <td>{cred.organization || '-'}</td>
                    <td>
                      {expired ? (
                        <span className="status-expired">⚠️ Expired: {formatDate(cred.expiration_date)}</span>
                      ) : expiringSoon ? (
                        <span className="status-warning">⚠️ Expires: {formatDate(cred.expiration_date)}</span>
                      ) : (
                        formatDate(cred.expiration_date)
                      )}
                    </td>
                    <td>{formatLastUsed(cred.last_used)}</td>
                    <td>
                      <div className="action-buttons-inline">
                        <button 
                          className="btn-icon" 
                          onClick={() => handleTestCredential(cred.id)}
                          title="Test Login"
                        >
                          🧪
                        </button>
                        <button 
                          className="btn-icon" 
                          onClick={() => { setSelectedCredential(cred); loadAuditLog(cred.id); }}
                          title="View Audit Log"
                        >
                          📋
                        </button>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleEdit(cred)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn-icon btn-danger" 
                          onClick={() => handleDeleteCredential(cred.id, cred.website)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="dashboard-footer">
        <p className="security-note">
          🔒 <strong>Security:</strong> All passwords are encrypted using AES-256-GCM encryption. 
          Passwords are never displayed and are only decrypted when needed for authentication.
        </p>
        <p className="help-text">
          💡 <strong>Tip:</strong> Set expiration dates to receive renewal reminders. 
          VERA will automatically check credential validity when accessing gated content.
        </p>
      </div>
    </div>
  );
}

