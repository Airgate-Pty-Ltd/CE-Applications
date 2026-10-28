// Mock API service to simulate backend responses
export const mockApi = {
  uploadDocument: async (formData) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate successful upload
    return {
      documentId: 'mock-123',
      message: 'Document uploaded successfully'
    };
  },

  getReview: async (documentId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate review results
    return {
      status: 'completed',
      findings: [
        {
          clause: '4.1',
          description: 'Organization context not clearly defined',
          severity: 'medium',
          recommendation: 'Add a section describing the organization context'
        }
      ],
      recommendations: [
        'Update the quality manual to include organization context',
        'Document the internal and external issues affecting the QMS'
      ]
    };
  },

  requestCorrection: async (documentId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate correction request
    return {
      success: true,
      message: 'Correction request submitted successfully'
    };
  },

  subscribe: async (planId) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate subscription
    return {
      success: true,
      message: 'Subscription processed successfully'
    };
  }
}; 