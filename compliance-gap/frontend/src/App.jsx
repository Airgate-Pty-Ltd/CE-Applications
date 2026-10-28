import { useState } from 'react'
import axios from 'axios'

const VERA_API = import.meta.env.VITE_VERA_API || 'http://localhost:3001'

export default function App() {
  const [standard, setStandard] = useState('')
  const [requirements, setRequirements] = useState('')
  const [procedures, setProcedures] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const analyzeGaps = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.post(`${VERA_API}/api/vera/gap-analysis/analyze`, {
        standard,
        standardRequirements: requirements.split('\n').filter(r => r.trim()),
        customerProcedures: procedures.split('\n').filter(p => p.trim()),
        userId: 'demo-user'
      })
      
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>ComplianceGap with VERA</h1>
        <p className="subtitle">Powered by fine-tuned Mistral AI for compliance gap analysis</p>
      </header>

      <div className="card">
        <form onSubmit={analyzeGaps}>
          <div className="form-group">
            <label>Standard (e.g., ISO 9001:2015)</label>
            <textarea
              value={standard}
              onChange={(e) => setStandard(e.target.value)}
              placeholder="Enter standard name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Requirements (one per line)</label>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Requirement 1&#10;Requirement 2&#10;Requirement 3"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Customer Procedures (one per line)</label>
            <textarea
              value={procedures}
              onChange={(e) => setProcedures(e.target.value)}
              placeholder="Procedure 1&#10;Procedure 2&#10;Procedure 3"
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading || !standard || !requirements}>
            {loading ? 'Analyzing Gaps...' : 'Analyze Gaps with VERA'}
          </button>
        </form>
      </div>

      {error && (
        <div className="card error">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="results">
          <h2>Gap Analysis Results</h2>
          <p><strong>Standard:</strong> {results.standard || 'N/A'}</p>
          <p><strong>Total Requirements:</strong> {results.totalRequirements || 0}</p>
          <p><strong>Covered:</strong> {results.coveredRequirements || 0}</p>
          <p><strong>Gaps:</strong> {results.gapCount || 0}</p>
          <p><strong>Gap %:</strong> {results.gapPercentage || 0}%</p>
          {results.confidence && (
            <p className="success"><strong>Confidence:</strong> {(results.confidence * 100).toFixed(1)}%</p>
          )}
          
          {results.gaps && results.gaps.length > 0 && (
            <div>
              <h3>Identified Gaps:</h3>
              {results.gaps.map((gap, i) => (
                <div key={i} className="result-item">
                  {typeof gap === 'string' ? gap : JSON.stringify(gap)}
                </div>
              ))}
            </div>
          )}

          {results.analysis && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '4px' }}>
              <h3>Detailed Analysis:</h3>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{typeof results.analysis === 'string' ? results.analysis : JSON.stringify(results.analysis, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

