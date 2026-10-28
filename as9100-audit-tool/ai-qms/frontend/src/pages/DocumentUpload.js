import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Container,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Send as SendIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { mockApi } from '../services/mockApi';
import ClauseSelector from '../components/ClauseSelector';
import { auditService } from '../services/auditService';

const AS9100_CLAUSES = [
  {
    id: '4',
    title: 'Context of the Organization',
    subclauses: [
      {
        id: '4.1',
        title: 'Understanding the Organization and its Context',
        subclauses: [
          { id: '4.1.1', title: 'General Requirements' },
          { id: '4.1.2', title: 'External Issues' },
          { id: '4.1.3', title: 'Internal Issues' }
        ]
      },
      {
        id: '4.2',
        title: 'Understanding the Needs and Expectations of Interested Parties',
        subclauses: [
          { id: '4.2.1', title: 'General Requirements' },
          { id: '4.2.2', title: 'Customer Requirements' },
          { id: '4.2.3', title: 'Regulatory Requirements' }
        ]
      },
      {
        id: '4.3',
        title: 'Determining the Scope of the Quality Management System',
        subclauses: [
          { id: '4.3.1', title: 'General Requirements' },
          { id: '4.3.2', title: 'Scope Boundaries' },
          { id: '4.3.3', title: 'Documentation Requirements' }
        ]
      }
    ]
  },
  {
    id: '5',
    title: 'Leadership',
    subclauses: [
      {
        id: '5.1',
        title: 'Leadership and Commitment',
        subclauses: [
          { id: '5.1.1', title: 'General Requirements' },
          { id: '5.1.2', title: 'Customer Focus' },
          { id: '5.1.3', title: 'Quality Policy' }
        ]
      },
      {
        id: '5.2',
        title: 'Policy',
        subclauses: [
          { id: '5.2.1', title: 'Quality Policy' },
          { id: '5.2.2', title: 'Policy Communication' },
          { id: '5.2.3', title: 'Policy Review' }
        ]
      }
    ]
  },
  {
    id: '6',
    title: 'Planning',
    subclauses: [
      {
        id: '6.1',
        title: 'Actions to Address Risks and Opportunities',
        subclauses: [
          { id: '6.1.1', title: 'General Requirements' },
          { id: '6.1.2', title: 'Risk Assessment' },
          { id: '6.1.3', title: 'Risk Treatment' }
        ]
      },
      {
        id: '6.2',
        title: 'Quality Objectives and Planning to Achieve Them',
        subclauses: [
          { id: '6.2.1', title: 'Quality Objectives' },
          { id: '6.2.2', title: 'Planning' }
        ]
      }
    ]
  },
  {
    id: '7',
    title: 'Support',
    subclauses: [
      {
        id: '7.1',
        title: 'Resources',
        subclauses: [
          { id: '7.1.1', title: 'General Requirements' },
          { id: '7.1.2', title: 'People' },
          { id: '7.1.3', title: 'Infrastructure' },
          { id: '7.1.4', title: 'Environment for Operation' },
          { id: '7.1.5', title: 'Monitoring and Measuring Resources' },
          { id: '7.1.6', title: 'Organizational Knowledge' }
        ]
      },
      {
        id: '7.2',
        title: 'Competence',
        subclauses: [
          { id: '7.2.1', title: 'General Requirements' },
          { id: '7.2.2', title: 'Training' }
        ]
      },
      {
        id: '7.3',
        title: 'Awareness',
        subclauses: [
          { id: '7.3.1', title: 'General Requirements' },
          { id: '7.3.2', title: 'Communication' }
        ]
      },
      {
        id: '7.4',
        title: 'Communication',
        subclauses: [
          { id: '7.4.1', title: 'General Requirements' },
          { id: '7.4.2', title: 'Internal Communication' },
          { id: '7.4.3', title: 'External Communication' }
        ]
      },
      {
        id: '7.5',
        title: 'Documented Information',
        subclauses: [
          { id: '7.5.1', title: 'General Requirements' },
          { id: '7.5.2', title: 'Creating and Updating' },
          { id: '7.5.3', title: 'Control of Documented Information' }
        ]
      }
    ]
  },
  {
    id: '8',
    title: 'Operation',
    subclauses: [
      {
        id: '8.1',
        title: 'Operational Planning and Control',
        subclauses: [
          { id: '8.1.1', title: 'General Requirements' },
          { id: '8.1.2', title: 'Planning' },
          { id: '8.1.3', title: 'Control' }
        ]
      },
      {
        id: '8.2',
        title: 'Requirements for Products and Services',
        subclauses: [
          { id: '8.2.1', title: 'Customer Communication' },
          { id: '8.2.2', title: 'Requirements Related to Products and Services' },
          { id: '8.2.3', title: 'Review of Requirements Related to Products and Services' },
          { id: '8.2.4', title: 'Changes to Requirements for Products and Services' }
        ]
      },
      {
        id: '8.3',
        title: 'Design and Development of Products and Services',
        subclauses: [
          { id: '8.3.1', title: 'General Requirements' },
          { id: '8.3.2', title: 'Design and Development Planning' },
          { id: '8.3.3', title: 'Design and Development Inputs' },
          { id: '8.3.4', title: 'Design and Development Controls' },
          { id: '8.3.5', title: 'Design and Development Outputs' },
          { id: '8.3.6', title: 'Design and Development Changes' }
        ]
      },
      {
        id: '8.4',
        title: 'Control of Externally Provided Processes, Products and Services',
        subclauses: [
          { id: '8.4.1', title: 'General Requirements' },
          { id: '8.4.2', title: 'Type and Extent of Control' },
          { id: '8.4.3', title: 'Information for External Providers' }
        ]
      },
      {
        id: '8.5',
        title: 'Production and Service Provision',
        subclauses: [
          { id: '8.5.1', title: 'Control of Production and Service Provision' },
          { id: '8.5.2', title: 'Identification and Traceability' },
          { id: '8.5.3', title: 'Property Belonging to Customers or External Providers' },
          { id: '8.5.4', title: 'Preservation' },
          { id: '8.5.5', title: 'Post-delivery Activities' },
          { id: '8.5.6', title: 'Control of Changes' }
        ]
      },
      {
        id: '8.6',
        title: 'Release of Products and Services',
        subclauses: [
          { id: '8.6.1', title: 'General Requirements' },
          { id: '8.6.2', title: 'Verification' }
        ]
      },
      {
        id: '8.7',
        title: 'Control of Nonconforming Outputs',
        subclauses: [
          { id: '8.7.1', title: 'General Requirements' },
          { id: '8.7.2', title: 'Actions' }
        ]
      }
    ]
  },
  {
    id: '9',
    title: 'Performance Evaluation',
    subclauses: [
      {
        id: '9.1',
        title: 'Monitoring, Measurement, Analysis and Evaluation',
        subclauses: [
          { id: '9.1.1', title: 'General Requirements' },
          { id: '9.1.2', title: 'Customer Satisfaction' },
          { id: '9.1.3', title: 'Analysis and Evaluation' }
        ]
      },
      {
        id: '9.2',
        title: 'Internal Audit',
        subclauses: [
          { id: '9.2.1', title: 'General Requirements' },
          { id: '9.2.2', title: 'Audit Program' }
        ]
      },
      {
        id: '9.3',
        title: 'Management Review',
        subclauses: [
          { id: '9.3.1', title: 'General Requirements' },
          { id: '9.3.2', title: 'Management Review Inputs' },
          { id: '9.3.3', title: 'Management Review Outputs' }
        ]
      }
    ]
  },
  {
    id: '10',
    title: 'Improvement',
    subclauses: [
      {
        id: '10.1',
        title: 'General',
        subclauses: [
          { id: '10.1.1', title: 'General Requirements' },
          { id: '10.1.2', title: 'Continual Improvement' }
        ]
      },
      {
        id: '10.2',
        title: 'Nonconformity and Corrective Action',
        subclauses: [
          { id: '10.2.1', title: 'General Requirements' },
          { id: '10.2.2', title: 'Corrective Action' }
        ]
      }
    ]
  }
];

const DocumentUpload = () => {
  const navigate = useNavigate();
  const [selectedClauses, setSelectedClauses] = useState([]);
  const [context, setContext] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [auditResults, setAuditResults] = useState(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setFile(acceptedFiles[0]);
      setError(null);
    },
  });

  const handleClauseChange = (e, clauseId) => {
    if (e.target.checked) {
      setSelectedClauses(prev => [...prev, clauseId]);
    } else {
      setSelectedClauses(prev => prev.filter(id => id !== clauseId));
    }
  };

  const handleContextChange = (event) => {
    setContext(event.target.value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAuditResults(null);

    if (!file) {
      setError('Please select a file to upload');
      setLoading(false);
      return;
    }

    if (selectedClauses.length === 0) {
      setError('Please select at least one AS9100 clause');
      setLoading(false);
      return;
    }

    try {
      // First, upload the document
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('clauses', JSON.stringify(selectedClauses));

      // Then, perform the audit for each selected clause
      const results = await Promise.all(
        selectedClauses.map(async (clauseId) => {
          const clauseDetails = await auditService.getClauseDetails(clauseId);
          const documentJson = [{
            level: 1,
            heading: formData.title,
            text: formData.description
          }];
          return auditService.auditDocument(clauseId, documentJson);
        })
      );

      setAuditResults(results);
    } catch (err) {
      console.error('Error during audit:', err);
      setError(err.response?.data?.detail || err.message || 'An error occurred during the audit');
    } finally {
      setLoading(false);
    }
  };

  const renderAuditResults = () => {
    if (!auditResults) return null;

    return (
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Audit Results
        </Typography>
        {auditResults.map((result, index) => (
          <Box key={index} sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Clause {result.clause} - {result.complianceStatus}
            </Typography>
            
            <Typography variant="subtitle1" gutterBottom>
              Overall Conclusion:
            </Typography>
            <Typography paragraph>
              {result.overallConclusion}
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Risk Assessment:
            </Typography>
            <Typography paragraph>
              {result.riskAssessment}
            </Typography>

            <Typography variant="subtitle1" gutterBottom>
              Detailed Findings:
            </Typography>
            {result.findings.map((finding, idx) => (
              <Box key={idx} sx={{ mb: 2, pl: 2, borderLeft: '4px solid', borderColor: 'primary.main' }}>
                <Typography variant="subtitle2">
                  {finding.title}
                </Typography>
                <Typography paragraph>
                  {finding.description}
                </Typography>
                {finding.evidence && (
                  <Typography variant="body2" color="text.secondary">
                    Evidence: {finding.evidence}
                  </Typography>
                )}
                {finding.impact && (
                  <Typography variant="body2" color="error">
                    Impact: {finding.impact}
                  </Typography>
                )}
              </Box>
            ))}

            <Typography variant="subtitle1" gutterBottom>
              Recommendations:
            </Typography>
            <List>
              {result.recommendations.map((recommendation, idx) => (
                <ListItem key={idx}>
                  <ListItemText primary={recommendation} />
                </ListItem>
              ))}
            </List>

            {index < auditResults.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
      </Paper>
    );
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Document Upload and Audit
        </Typography>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Document Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Document Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Select AS9100 Clauses
              </Typography>
              <ClauseSelector
                clauses={AS9100_CLAUSES}
                selectedClauses={selectedClauses}
                onClauseChange={handleClauseChange}
              />
            </Grid>
            <Grid item xs={12}>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                >
                  Choose File
                </Button>
              </label>
              {file && (
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Selected file: {file.name}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading || !file || selectedClauses.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              >
                {loading ? 'Processing...' : 'Submit for Audit'}
              </Button>
            </Grid>
          </Grid>
        </form>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {renderAuditResults()}
      </Box>
    </Container>
  );
};

export default DocumentUpload; 