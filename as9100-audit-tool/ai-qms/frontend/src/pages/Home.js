import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, Typography, Box, Grid, Card, CardContent } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';

function Home() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          AS9100 AI Audit Tool
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph>
          AI-powered compliance review for aerospace quality management systems
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<UploadIcon />}
          onClick={() => navigate('/upload')}
          sx={{ mt: 2 }}
        >
          Start Review
        </Button>
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI-Powered Analysis
              </Typography>
              <Typography color="text.secondary">
                Our AI system reviews your documentation against AS9100 standards, identifying potential compliance issues.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Reports
              </Typography>
              <Typography color="text.secondary">
                Get comprehensive reports on compliance issues, with specific recommendations for improvement.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Correction
              </Typography>
              <Typography color="text.secondary">
                Request AI-assisted document correction to address identified compliance issues.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Home; 