import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Divider,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import axios from 'axios';

function ReviewResults() {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingCorrection, setRequestingCorrection] = useState(false);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const response = await axios.get(`/api/review/${id}`);
        setReview(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch review results');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [id]);

  const handleRequestCorrection = async () => {
    setRequestingCorrection(true);
    try {
      const response = await axios.post(`/api/review/${id}/correction`);
      // Handle successful correction request
      setReview(prev => ({
        ...prev,
        correction_requested: true,
        correction_status: 'pending'
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request correction');
    } finally {
      setRequestingCorrection(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Document Review Results
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Compliance Status
            </Typography>
            <Alert
              severity={review.compliance_status === 'compliant' ? 'success' : 'warning'}
              sx={{ mb: 3 }}
            >
              {review.compliance_status === 'compliant'
                ? 'Document is compliant with selected AS9100 clauses'
                : 'Document has non-conformities that need to be addressed'}
            </Alert>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Reviewed Clauses
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {review.clauses_checked.map((clause) => (
                <Typography
                  key={clause}
                  variant="body2"
                  sx={{
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  {clause}
                </Typography>
              ))}
            </Box>
          </Box>

          {review.findings && review.findings.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Findings
              </Typography>
              {review.findings.map((finding, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Finding {index + 1}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>{finding}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {review.recommendations && review.recommendations.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              {review.recommendations.map((recommendation, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Recommendation {index + 1}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography>{recommendation}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              Review completed on: {new Date(review.completed_at).toLocaleString()}
            </Typography>
            {!review.correction_requested && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleRequestCorrection}
                disabled={requestingCorrection}
              >
                {requestingCorrection ? 'Requesting...' : 'Request Document Correction'}
              </Button>
            )}
            {review.correction_requested && (
              <Alert severity="info">
                Correction request {review.correction_status}
              </Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ReviewResults; 