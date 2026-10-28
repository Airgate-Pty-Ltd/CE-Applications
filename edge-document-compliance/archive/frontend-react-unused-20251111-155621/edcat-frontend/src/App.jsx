import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchCustomers,
  fetchAssessments,
  fetchDocuments,
  uploadDocument,
  triggerParsePending
} from './services/api.js';
import { fetchReports, generateReport, fetchLegalPages, fetchLegalPage } from './services/reportApi.js';
import { searchDocuments, searchRequirements } from './services/libraryApi.js';
import { fetchAdminOverview, sendTestEmail, processEmailQueue } from './services/adminApi.js';
import { fetchAnalyticsOverview, fetchAnalyticsTrend } from './services/analyticsApi.js';
import { suggestFromText } from './services/remediationApi.js';
import { fetchTenantConfig, updateTenantConfig } from './services/configApi.js';
import { fetchMarketplace, installMarketplaceItem } from './services/marketplaceApi.js';
import { registerMobileDevice, fetchMobileSync } from './services/mobileApi.js';
import { fetchRealtimeStatus } from './services/realtimeApi.js';
import { fetchExecutiveDashboard, fetchBoardReport } from './services/executiveApi.js';

function App() {
  const [customers, setCustomers] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [reports, setReports] = useState([]);
  const [legalPages, setLegalPages] = useState([]);
  const [legalPageContent, setLegalPageContent] = useState(null);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [analyticsTrend, setAnalyticsTrend] = useState(null);
  const [remediationText, setRemediationText] = useState('');
  const [remediationSuggestions, setRemediationSuggestions] = useState([]);
  const [assistantConfig, setAssistantConfig] = useState(null);
  const [marketplaceItems, setMarketplaceItems] = useState([]);
  const [mobileSyncData, setMobileSyncData] = useState(null);
  const [mobileDeviceName, setMobileDeviceName] = useState('Analyst iPad');
  const [realtimeStatus, setRealtimeStatus] = useState('disconnected');
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [boardReport, setBoardReport] = useState(null);
  const realtimeSocketRef = useRef(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [flash, setFlash] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryDocs, setLibraryDocs] = useState([]);
  const [libraryRequirements, setLibraryRequirements] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        const [customersRes, assessmentsRes, documentsRes, reportsRes, legalRes, adminRes, analyticsRes, trendRes, marketplaceRes, realtimeRes] = await Promise.all([
          fetchCustomers(),
          fetchAssessments(),
          fetchDocuments(),
          fetchReports(),
          fetchLegalPages(),
          fetchAdminOverview(),
          fetchAnalyticsOverview(),
          fetchAnalyticsTrend(),
          fetchMarketplace(),
          fetchRealtimeStatus()
        ]);

        const customerList = customersRes.data || customersRes.customers || [];
        setCustomers(customerList);
        setAssessments(assessmentsRes.data || assessmentsRes.assessments || []);
        setDocuments(documentsRes.data || documentsRes.documents || []);
        setReports(reportsRes.data || reportsRes.reports || []);
        setLegalPages(legalRes.data || legalRes.pages || []);
        setAdminOverview(adminRes.data || adminRes);
        setAnalyticsOverview(analyticsRes.data || analyticsRes);
        setAnalyticsTrend(trendRes.data || trendRes);
        setMarketplaceItems(marketplaceRes.listings || marketplaceRes);
        setRealtimeStatus(realtimeRes.status || 'connected');

        if (!selectedCustomerId && customerList.length > 0) {
          setSelectedCustomerId(customerList[0].id);
        }
      } catch (error) {
        console.error('Bootstrap failed:', error);
        setFlash({ type: 'error', message: error.message });
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    async function loadTenantConfig() {
      try {
        if (!selectedCustomerId) return;
        const [configResult, execDashboard, boardReportResult] = await Promise.all([
          fetchTenantConfig(selectedCustomerId),
          fetchExecutiveDashboard(selectedCustomerId),
          fetchBoardReport(selectedCustomerId)
        ]);
        setAssistantConfig(configResult.config || configResult);
        setExecutiveSummary(execDashboard.data || execDashboard);
        setBoardReport(boardReportResult.data || boardReportResult);
      } catch (error) {
        setFlash({ type: 'error', message: error.message });
      }
    }

    loadTenantConfig();
  }, [selectedCustomerId]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    realtimeSocketRef.current = socket;
    setRealtimeStatus('connecting');

    socket.onopen = () => {
      setRealtimeStatus('connected');
      setRealtimeMessages((prev) => [{ type: 'system', message: 'Realtime connected.' }, ...prev.slice(0, 9)]);
    };

    socket.onmessage = (event) => {
      const payload = (() => {
        try {
          return JSON.parse(event.data);
        } catch (_error) {
          return { type: 'message', message: event.data };
        }
      })();

      setRealtimeMessages((prev) => [{ type: payload.type || 'message', message: payload.message || JSON.stringify(payload) }, ...prev.slice(0, 9)]);
    };

    socket.onclose = () => {
      setRealtimeStatus('disconnected');
    };

    socket.onerror = () => {
      setRealtimeStatus('error');
    };

    return () => {
      socket.close();
    };
  }, []);

  const filteredAssessments = useMemo(() => {
    if (!selectedCustomerId) return assessments;
    return assessments.filter((assessment) => assessment.customer_id === selectedCustomerId);
  }, [assessments, selectedCustomerId]);

  const filteredDocuments = useMemo(() => {
    let rows = documents;
    if (selectedCustomerId) {
      rows = rows.filter((doc) => doc.customer_id === selectedCustomerId);
    }
    if (selectedAssessmentId) {
      rows = rows.filter((doc) => doc.assessment_id === selectedAssessmentId);
    }
    return rows;
  }, [documents, selectedCustomerId, selectedAssessmentId]);

  const filteredReports = useMemo(() => {
    let rows = reports;
    if (selectedCustomerId) {
      rows = rows.filter((report) => report.customer_id === selectedCustomerId);
    }
    if (selectedAssessmentId) {
      rows = rows.filter((report) => report.assessment_id === selectedAssessmentId);
    }
    return rows;
  }, [reports, selectedCustomerId, selectedAssessmentId]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) {
      setFlash({ type: 'warning', message: 'Please choose a file to upload.' });
      return;
    }
    if (!selectedCustomerId) {
      setFlash({ type: 'warning', message: 'Select a customer before uploading.' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('customer_id', selectedCustomerId);
      if (selectedAssessmentId) {
        formData.append('assessment_id', selectedAssessmentId);
      }

      const response = await uploadDocument(formData);
      // merge new document
      setDocuments((prev) => [response.document, ...prev]);
      setFlash({
        type: 'success',
        message: `Uploaded ${response.document.document_name}. Extracted ${response.extractedRequirements.length} potential requirements.`
      });
      setUploadFile(null);
      event.target.reset();
    } catch (error) {
      console.error('Upload failed:', error);
      setFlash({ type: 'error', message: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleRefreshDocuments = async (silent = false) => {
    try {
      const res = await fetchDocuments();
      setDocuments(res.data || res.documents || []);
      if (!silent) {
        setFlash({ type: 'info', message: 'Document list updated.' });
      }
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleParsePending = async () => {
    try {
      setParsing(true);
      const res = await triggerParsePending();
      setFlash({ type: 'info', message: `Parsing complete. Processed ${res.parsed} document(s).` });
      await handleRefreshDocuments(true);
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    } finally {
      setParsing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedAssessmentId) {
      setFlash({ type: 'warning', message: 'Select an assessment before generating a report.' });
      return;
    }

    try {
      setReporting(true);
      const report = await generateReport(selectedAssessmentId, 'executive_summary');
      setReports((prev) => [report, ...prev]);
      setFlash({ type: 'success', message: 'Report generated successfully.' });
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    } finally {
      setReporting(false);
    }
  };

  const handleViewLegalPage = async (slug) => {
    try {
      const result = await fetchLegalPage(slug);
      setLegalPageContent(result.page);
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleLibrarySearch = async (event) => {
    event.preventDefault();
    if (!libraryQuery) {
      setLibraryDocs([]);
      setLibraryRequirements([]);
      return;
    }
    try {
      const [docsRes, reqRes] = await Promise.all([
        searchDocuments(libraryQuery),
        searchRequirements(libraryQuery)
      ]);
      setLibraryDocs(docsRes.documents || []);
      setLibraryRequirements(reqRes.requirements || []);
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleSendTestEmail = async (event) => {
    event.preventDefault();
    if (!testEmailRecipient) {
      setFlash({ type: 'warning', message: 'Enter an email address first.' });
      return;
    }
    try {
      setAdminLoading(true);
      await sendTestEmail(testEmailRecipient);
      setFlash({ type: 'success', message: 'Email queued successfully.' });
      setTestEmailRecipient('');
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleProcessEmailQueue = async () => {
    try {
      setAdminLoading(true);
      await processEmailQueue();
      setFlash({ type: 'info', message: 'Email queue processed.' });
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRefreshAnalytics = async () => {
    try {
      const [overview, trend] = await Promise.all([fetchAnalyticsOverview(), fetchAnalyticsTrend()]);
      setAnalyticsOverview(overview.data || overview);
      setAnalyticsTrend(trend.data || trend);
      setFlash({ type: 'info', message: 'Analytics refreshed.' });
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleRemediationSuggest = async () => {
    try {
      if (!remediationText.trim()) {
        setFlash({ type: 'warning', message: 'Enter requirement text before requesting suggestions.' });
        return;
      }
      const res = await suggestFromText(remediationText);
      setRemediationSuggestions(res.suggestions || []);
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleAssistantToggle = async () => {
    try {
      if (!selectedCustomerId || !assistantConfig) return;
      const updated = await updateTenantConfig(selectedCustomerId, {
        ...assistantConfig,
        edcatAssistant: {
          ...assistantConfig.edcatAssistant,
          enabled: !assistantConfig.edcatAssistant?.enabled
        }
      });
      setAssistantConfig(updated);
      setFlash({ type: 'success', message: `EDCAT Assistant ${updated.edcatAssistant.enabled ? 'enabled' : 'disabled'}.` });
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleMarketplaceInstall = async (id) => {
    try {
      await installMarketplaceItem(id);
      setMarketplaceItems((prev) => prev.map((item) => (item.id === id ? { ...item, install_count: (item.install_count || 0) + 1 } : item)));
      setFlash({ type: 'success', message: 'Item installed successfully.' });
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleMobileRegister = async () => {
    try {
      const result = await registerMobileDevice({ userId: 'demo-user', deviceName: mobileDeviceName, deviceOS: 'iOS', appVersion: '1.0' });
      setFlash({ type: 'success', message: `Device registered with id ${result.device.id}` });
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleMobileSync = async () => {
    try {
      const result = await fetchMobileSync();
      setMobileSyncData(result.data || result);
      setFlash({ type: 'info', message: 'Mobile sync package generated.' });
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  const handleRealtimePing = () => {
    if (realtimeSocketRef.current && realtimeSocketRef.current.readyState === WebSocket.OPEN) {
      realtimeSocketRef.current.send(JSON.stringify({ type: 'ping', message: 'Hello from dashboard' }));
    }
  };

  const handleRefreshRealtime = async () => {
    try {
      const status = await fetchRealtimeStatus();
      setRealtimeStatus(status.status || 'connected');
    } catch (error) {
      setFlash({ type: 'error', message: error.message });
    }
  };

  return (
    <main>
      <header>
        <div>
          <h1>EDCAT Assessment Workbench</h1>
          <p style={{ marginTop: '0.35rem', color: '#475569' }}>
            Monitor document ingestion, parsing status, and regulatory coverage.
          </p>
        </div>
        <div>
          <button className="primary" onClick={handleRefreshDocuments} disabled={loading}>
            Refresh Data
          </button>
        </div>
      </header>

      {flash ? <Flash type={flash.type} message={flash.message} onClose={() => setFlash(null)} /> : null}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>1. Select Context</h2>
        <div className="grid two" style={{ marginTop: '1rem' }}>
          <div>
            <label htmlFor="customer-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Customer
            </label>
            <select
              id="customer-select"
              value={selectedCustomerId}
              onChange={(event) => {
                setSelectedCustomerId(event.target.value);
                setSelectedAssessmentId('');
              }}
              disabled={loading || customers.length === 0}
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.org_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="assessment-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Assessment
            </label>
            <select
              id="assessment-select"
              value={selectedAssessmentId}
              onChange={(event) => setSelectedAssessmentId(event.target.value)}
              disabled={filteredAssessments.length === 0}
            >
              <option value="">All assessments</option>
              {filteredAssessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.assessment_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>2. Upload Document</h2>
        <form onSubmit={handleUpload} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <input type="file" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="primary" type="submit" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload & Parse'}
            </button>
            <button type="button" onClick={handleParsePending} disabled={parsing}>
              {parsing ? 'Parsing…' : 'Parse Pending'}
            </button>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            Supported formats: PDF, TXT, DOCX. Files are parsed immediately and queued for NLP extraction.
          </p>
        </form>
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>3. Document Status</h2>
          <span className="badge">
            <span className={classNames('status-dot')}></span>
            Total {filteredDocuments.length}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">Loading documents…</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">No documents found. Upload one to get started.</div>
        ) : (
          <table className="table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Assessment</th>
                <th>Status</th>
                <th>Last parsed</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.document_name}</td>
                  <td>{lookupAssessmentName(doc.assessment_id, assessments)}</td>
                  <td>
                    <span className="badge">
                      <span className={classNames('status-dot', doc.parse_status)}></span>
                      {doc.parse_status}
                    </span>
                  </td>
                  <td>{doc.last_parsed ? new Date(doc.last_parsed).toLocaleString() : '—'}</td>
                  <td>{new Date(doc.uploaded_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>4. Analytics</h2>
          <button type="button" onClick={handleRefreshAnalytics} className="primary" disabled={loading}>
            Refresh Analytics
          </button>
        </div>
        {analyticsOverview ? (
          <div className="grid two" style={{ marginTop: '1rem' }}>
            <div>
              <h3>Assessments by status</h3>
              <ul className="list">
                {analyticsOverview.assessments.map((row) => (
                  <li key={row.status}>{row.status}: {row.total}</li>
                ))}
              </ul>
              <h3>Documents</h3>
              <ul className="list">
                {analyticsOverview.documents.map((row) => (
                  <li key={row.parse_status}>{row.parse_status}: {row.total}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Recent assessments</h3>
              <ul className="list">
                {analyticsOverview.recentAssessments.map((row) => (
                  <li key={row.id}>
                    <strong>{row.assessment_name}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{row.status} · {new Date(row.created_at).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
              {analyticsTrend ? (
                <div style={{ marginTop: '1rem' }}>
                  <h3>Assessment trend (14 days)</h3>
                  <ul className="list">
                    {analyticsTrend.assessments.map((row) => (
                      <li key={row.date}>{row.date}: {row.total}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="empty-state">Analytics not available yet.</div>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>5. Remediation Assistant</h2>
        <p style={{ color: '#64748b', marginTop: 0 }}>
          Paste requirement text to receive suggested remediation actions.
        </p>
        <textarea
          rows={4}
          value={remediationText}
          onChange={(event) => setRemediationText(event.target.value)}
          style={{ width: '100%', borderRadius: '12px', border: '1px solid #cbd5f5', padding: '0.75rem' }}
          placeholder="Requirement text..."
        />
        <button type="button" className="primary" style={{ marginTop: '0.75rem' }} onClick={handleRemediationSuggest}>
          Generate Suggestions
        </button>
        {remediationSuggestions.length > 0 ? (
          <ul className="list" style={{ marginTop: '1rem' }}>
            {remediationSuggestions.map((suggestion, index) => (
              <li key={index}>
                <strong>{suggestion.action}</strong> ({suggestion.priority})
                <div style={{ color: '#475569' }}>{suggestion.message}</div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>6. Reports</h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="primary" onClick={handleGenerateReport} disabled={reporting}>
              {reporting ? 'Generating…' : 'Generate Executive Summary'}
            </button>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="empty-state">No reports yet. Generate one to see history.</div>
        ) : (
          <table className="table" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Generated</th>
                <th>Generated by</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.report_title}</td>
                  <td>{report.report_type}</td>
                  <td>{new Date(report.generated_at).toLocaleString()}</td>
                  <td>{report.generated_by || 'system'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>7. Legal & Compliance</h2>
        <div className="grid two" style={{ marginTop: '1rem' }}>
          <div>
            <h3 style={{ marginTop: 0 }}>Available pages</h3>
            <ul className="list">
              {legalPages.length === 0 ? (
                <li style={{ color: '#64748b' }}>No legal pages published yet.</li>
              ) : (
                legalPages.map((page) => (
                  <li key={page.slug}>
                    <button
                      type="button"
                      className="link"
                      onClick={() => handleViewLegalPage(page.slug)}
                    >
                      {page.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>Preview</h3>
            {legalPageContent ? (
              <article
                style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: '#f8fafc'
                }}
              >
                <h4>{legalPageContent.title}</h4>
                <div
                  dangerouslySetInnerHTML={{ __html: legalPageContent.content }}
                  style={{ lineHeight: 1.6 }}
                />
              </article>
            ) : (
              <div className="empty-state">Select a page to view its content.</div>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>8. Document Library</h2>
        <form onSubmit={handleLibrarySearch} style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <input
            type="text"
            placeholder="Search documents or requirements"
            value={libraryQuery}
            onChange={(event) => setLibraryQuery(event.target.value)}
            style={{ flex: 1, padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5f5' }}
          />
          <button type="submit" className="primary">
            Search
          </button>
        </form>
        <div className="grid two" style={{ marginTop: '1.25rem' }}>
          <div>
            <h3>Documents</h3>
            {libraryDocs.length === 0 ? (
              <div className="empty-state">No documents match this query yet.</div>
            ) : (
              <ul className="list">
                {libraryDocs.map((doc) => (
                  <li key={doc.id}>
                    <strong>{doc.document_name}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Status: {doc.parse_status}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3>Requirements</h3>
            {libraryRequirements.length === 0 ? (
              <div className="empty-state">No requirements found.</div>
            ) : (
              <ul className="list">
                {libraryRequirements.map((req) => (
                  <li key={req.requirement_ref}>
                    <strong>{req.requirement_ref}</strong>
                    <div style={{ color: '#475569' }}>{req.requirement_text}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>9. Admin Dashboard</h2>
        <div className="grid two" style={{ marginTop: '1rem' }}>
          <div>
            <h3>Snapshot</h3>
            {adminOverview ? (
              <ul className="list">
                <li>Customers: {adminOverview.customers}</li>
                <li>Assessments: {adminOverview.assessments}</li>
                <li>Parsed documents: {adminOverview.parsedDocuments}</li>
                <li>Reports: {adminOverview.reports}</li>
              </ul>
            ) : (
              <div className="empty-state">No admin metrics available.</div>
            )}
          </div>
          <div>
            <h3>Email Notifications</h3>
            <form onSubmit={handleSendTestEmail} style={{ display: 'grid', gap: '0.75rem' }}>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={testEmailRecipient}
                onChange={(event) => setTestEmailRecipient(event.target.value)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5f5' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="primary" disabled={adminLoading}>
                  Send Test Email
                </button>
                <button type="button" onClick={handleProcessEmailQueue} disabled={adminLoading}>
                  Process Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>10. Realtime & Mobile</h2>
        <div className="grid two" style={{ marginTop: '1rem' }}>
          <div>
            <h3>Realtime Stream</h3>
            <p style={{ color: '#64748b' }}>Status: {realtimeStatus}</p>
            <button className="primary" type="button" onClick={handleRealtimePing} style={{ marginRight: '0.5rem' }}>
              Send Ping
            </button>
            <button type="button" onClick={handleRefreshRealtime}>
              Refresh Status
            </button>
            <ul className="list" style={{ marginTop: '1rem' }}>
              {realtimeMessages.map((msg, idx) => (
                <li key={idx}>
                  <strong>{msg.type}</strong>: {msg.message}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Mobile Sync</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleMobileRegister(); }} style={{ display: 'grid', gap: '0.75rem' }}>
              <input
                type="text"
                value={mobileDeviceName}
                onChange={(event) => setMobileDeviceName(event.target.value)}
                style={{ padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid #cbd5f5' }}
              />
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="primary" type="submit">Register Device</button>
                <button type="button" onClick={handleMobileSync}>Download Sync Package</button>
              </div>
            </form>
            {mobileSyncData ? (
              <div style={{ marginTop: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                Latest snapshot generated {mobileSyncData.generatedAt}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>11. Marketplace</h2>
        {marketplaceItems.length === 0 ? (
          <div className="empty-state">Marketplace catalogue coming soon.</div>
        ) : (
          <ul className="list">
            {marketplaceItems.map((item) => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.title}</strong>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{item.description}</div>
                  <div style={{ color: '#475569', fontSize: '0.85rem' }}>Installs: {item.install_count || 0}</div>
                </div>
                <button type="button" onClick={() => handleMarketplaceInstall(item.id)}>
                  Install
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>12. AI Assistant Configuration</h2>
        {assistantConfig ? (
          <div>
            <p style={{ color: '#64748b' }}>
              EDCAT Assistant is currently <strong>{assistantConfig.edcatAssistant?.enabled ? 'enabled' : 'disabled'}</strong> in {assistantConfig.edcatAssistant?.mode} mode.
            </p>
            <button className="primary" type="button" onClick={handleAssistantToggle}>
              {assistantConfig.edcatAssistant?.enabled ? 'Disable Assistant' : 'Enable Assistant'}
            </button>
          </div>
        ) : (
          <div className="empty-state">Select a customer to view AI assistant preferences.</div>
        )}
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>13. Executive Intelligence</h2>
        {executiveSummary ? (
          <div className="grid two" style={{ marginTop: '1rem' }}>
            <div>
              <h3>Overview</h3>
              <p style={{ fontSize: '2rem', fontWeight: 700 }}>{executiveSummary.overallCompliancePosture.score}%</p>
              <p style={{ color: '#64748b' }}>{executiveSummary.overallCompliancePosture.rating} posture</p>
              <p style={{ color: '#475569' }}>Assessments: {executiveSummary.keyMetrics.totalAssessments}</p>
              <p style={{ color: '#475569' }}>Parsed documents: {executiveSummary.keyMetrics.documentsParsed}/{executiveSummary.keyMetrics.totalDocuments}</p>
            </div>
            <div>
              <h3>Board Snapshot</h3>
              <p style={{ color: '#475569' }}>{boardReport?.executiveSummary}</p>
              <button type="button" onClick={() => window.open('/executive-dashboard.html', '_blank')} className="primary">
                Open Executive Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="empty-state">Executive data not available yet.</div>
        )}
      </section>
    </main>
  );
}

function lookupAssessmentName(assessmentId, assessments) {
  if (!assessmentId) return '—';
  const assessment = assessments.find((item) => item.id === assessmentId);
  return assessment ? assessment.assessment_name : '—';
}

function classNames(...names) {
  return names.filter(Boolean).join(' ');
}

function Flash({ type = 'info', message, onClose }) {
  const palette = {
    info: '#0ea5e9',
    success: '#22c55e',
    warning: '#f97316',
    error: '#ef4444'
  };

  return (
    <div
      style={{
        marginBottom: '1.25rem',
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        color: '#0f172a',
        backgroundColor: `${palette[type]}1A`,
        border: `1px solid ${palette[type]}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        style={{
          border: 'none',
          background: 'transparent',
          color: '#0f172a',
          cursor: 'pointer',
          fontWeight: 600
        }}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

export default App;
