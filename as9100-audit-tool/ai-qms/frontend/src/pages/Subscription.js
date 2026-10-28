import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly Subscription',
    price: 99.99,
    features: [
      '10 document reviews per month',
      'Priority processing',
      'Unlimited corrections',
      'Email support',
    ],
  },
  {
    id: 'pay_per_doc',
    name: 'Pay Per Document',
    price: 29.99,
    features: [
      'Pay only for what you need',
      'No monthly commitment',
      'Standard processing',
      'Email support',
    ],
  },
];

const CORRECTION_SERVICE = {
  id: 'correction',
  name: 'Document Correction Service',
  price: 49.99,
  features: [
    'AI-powered document correction',
    'Compliance verification',
    'Detailed revision report',
    'Priority processing',
  ],
};

function Subscription() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubscribe = async (planId) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await axios.post('/api/subscription', {
        plan_id: planId,
      });

      // Handle payment processing
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Subscription Plans
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Subscription updated successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        {SUBSCRIPTION_PLANS.map((plan) => (
          <Grid item xs={12} md={6} key={plan.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: selectedPlan === plan.id ? '2px solid #1976d2' : 'none',
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                  {plan.name}
                </Typography>
                <Typography variant="h4" component="div" gutterBottom>
                  ${plan.price}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box component="ul" sx={{ pl: 2 }}>
                  {plan.features.map((feature, index) => (
                    <Typography
                      key={index}
                      component="li"
                      variant="body1"
                      sx={{ mb: 1 }}
                    >
                      {feature}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
              <Box sx={{ p: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Subscribe'}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Additional Services
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="h6" component="h3" gutterBottom>
              {CORRECTION_SERVICE.name}
            </Typography>
            <Typography variant="h5" component="div" gutterBottom>
              ${CORRECTION_SERVICE.price} per document
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box component="ul" sx={{ pl: 2 }}>
              {CORRECTION_SERVICE.features.map((feature, index) => (
                <Typography
                  key={index}
                  component="li"
                  variant="body1"
                  sx={{ mb: 1 }}
                >
                  {feature}
                </Typography>
              ))}
            </Box>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleSubscribe(CORRECTION_SERVICE.id)}
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Request Correction Service'}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default Subscription; 