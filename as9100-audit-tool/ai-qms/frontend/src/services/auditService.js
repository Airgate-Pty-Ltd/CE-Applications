import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';

export const auditService = {
  async auditDocument(clause, documentJson) {
    try {
      const requestData = {
        clause: clause,
        document: Array.isArray(documentJson) ? documentJson : [documentJson]
      };
      
      console.log('Sending request data:', requestData);
      const response = await axios.post(`${API_BASE_URL}/api/audit`, requestData);
      return response.data;
    } catch (error) {
      console.error('Error auditing document:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },

  async getClauseDetails(clauseId) {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/clauses/${clauseId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching clause details:', error);
      throw error;
    }
  }
}; 