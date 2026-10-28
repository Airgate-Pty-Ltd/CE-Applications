/**
 * Chat Interface for EDCAT Administrator
 * Handles analysis requests, clarifications, and results display
 */

const API_BASE = window.location.origin;

let currentAnalysisId = null;
let currentClarification = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadStandards();
  loadCustomers();
});

/**
 * Load available standards
 */
async function loadStandards() {
  try {
    const response = await fetch(`${API_BASE}/api/standards`);
    const standards = await response.json();
    
    const list = document.getElementById('standards-list');
    if (standards.length === 0) {
      list.innerHTML = '<div class="empty">No standards available</div>';
      return;
    }
    
    list.innerHTML = standards.map(s => `
      <div class="list-item">
        <strong>${s.name}</strong>
        <span class="badge">${s.code}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading standards:', error);
    document.getElementById('standards-list').innerHTML = 
      '<div class="error">Error loading standards</div>';
  }
}

/**
 * Load available customers
 */
async function loadCustomers() {
  try {
    // For now, using mock data - replace with actual API call
    const customers = [
      { id: '1', name: 'Customer ABC', docs: 3, procedures: 89 },
      { id: '2', name: 'Customer XYZ', docs: 5, procedures: 156 },
    ];
    
    const list = document.getElementById('customers-list');
    list.innerHTML = customers.map(c => `
      <div class="list-item">
        <strong>${c.name}</strong>
        <span class="info">${c.docs} docs, ${c.procedures} procedures</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading customers:', error);
  }
}

/**
 * Handle chat input
 */
function handleChatInput(event) {
  if (event.key === 'Enter') {
    sendMessage();
  }
}

/**
 * Send message and process analysis request
 */
async function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Display user message
  displayMessage('user', message);
  input.value = '';
  
  // Check if it's an analysis request
  const analysisMatch = message.match(/analyze\s+(.+?)\s+against\s+(.+)/i);
  
  if (analysisMatch) {
    const [, customerName, standardName] = analysisMatch;
    await startAnalysis(customerName.trim(), standardName.trim());
  } else {
    displayMessage('ai', 'I can help you analyze compliance. Try: "Analyze Customer ABC against ISO 9001:2015"');
  }
}

/**
 * Start a new analysis
 */
async function startAnalysis(customerName, standardName) {
  try {
    displayMessage('ai', `Starting analysis: ${customerName} vs ${standardName}...`);
    
    // Get customer ID and standard ID (simplified - in production, use proper lookup)
    const customerId = '1'; // TODO: Lookup by name
    const standardId = 'ISO9001'; // TODO: Lookup by name
    
    const response = await fetch(`${API_BASE}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId, standardId }),
    });
    
    const result = await response.json();
    currentAnalysisId = result.analysis.analysis_id;
    
    displayMessage('ai', 
      `Analysis started!\n` +
      `Found ${result.matches.length} initial matches.\n` +
      `Need clarification on ${result.ambiguousCount} ambiguous areas.\n\n` +
      `Starting clarification sequence...`
    );
    
    // Start clarification process
    await processClarifications();
    
    // Update analysis results panel
    updateAnalysisResults(result);
    
  } catch (error) {
    console.error('Error starting analysis:', error);
    displayMessage('ai', `Error: ${error.message}`);
  }
}

/**
 * Process clarifications
 */
async function processClarifications() {
  if (!currentAnalysisId) return;
  
  try {
    const response = await fetch(
      `${API_BASE}/api/analysis/${currentAnalysisId}/clarification/next`
    );
    const clarification = await response.json();
    
    if (!clarification.hasMore) {
      // All clarifications done - finalize analysis
      await finalizeAnalysis();
      return;
    }
    
    // Show clarification question
    showClarification(clarification);
    
  } catch (error) {
    console.error('Error getting clarification:', error);
    displayMessage('ai', `Error: ${error.message}`);
  }
}

/**
 * Show clarification question
 */
function showClarification(clarification) {
  currentClarification = clarification;
  
  const panel = document.getElementById('clarification-panel');
  const title = document.getElementById('clarification-title');
  const question = document.getElementById('clarification-question');
  
  title.textContent = `Question ${clarification.questionNumber} of ${clarification.totalQuestions}`;
  question.innerHTML = formatClarificationQuestion(clarification.question);
  
  panel.style.display = 'block';
  
  // Scroll to clarification
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Format clarification question for display
 */
function formatClarificationQuestion(questionText) {
  // Split by newlines and format
  const parts = questionText.split('\n\n');
  return parts.map(part => {
    if (part.startsWith('ISO Requirement:')) {
      return `<div class="requirement-text">${part.replace('ISO Requirement:', '').trim()}</div>`;
    } else if (part.startsWith('Customer Document:')) {
      return `<div class="procedure-text">${part.replace('Customer Document:', '').trim()}</div>`;
    } else {
      return `<p>${part}</p>`;
    }
  }).join('');
}

/**
 * Handle clarification response
 */
async function handleClarificationResponse(response) {
  if (!currentClarification) return;
  
  try {
    const res = await fetch(
      `${API_BASE}/api/clarification/${currentClarification.clarificationId}/respond`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      }
    );
    
    const result = await res.json();
    
    // Hide clarification panel
    document.getElementById('clarification-panel').style.display = 'none';
    
    // Display confirmation
    const responseText = {
      'yes': 'Got it. Learning: This procedure covers the requirement.',
      'no': 'Understood. Gap confirmed.',
      'not_sure': 'Noted. Will mark as uncertain.',
    };
    
    displayMessage('ai', responseText[response] || 'Response recorded.');
    
    // Get next clarification
    await processClarifications();
    
  } catch (error) {
    console.error('Error submitting clarification:', error);
    displayMessage('ai', `Error: ${error.message}`);
  }
}

/**
 * Finalize analysis after all clarifications
 */
async function finalizeAnalysis() {
  if (!currentAnalysisId) return;
  
  try {
    const response = await fetch(`${API_BASE}/api/analysis/${currentAnalysisId}`);
    const analysis = await response.json();
    
    const covered = analysis.covered_count || 0;
    const gaps = analysis.gaps_found || 0;
    const total = analysis.total_requirements || 0;
    const confidence = analysis.final_confidence || 0.85;
    
    displayMessage('ai', 
      `ANALYSIS COMPLETE\n\n` +
      `Summary:\n` +
      `├─ Total requirements: ${total}\n` +
      `├─ Covered: ${covered} (${((covered/total)*100).toFixed(1)}%)\n` +
      `├─ GAPS: ${gaps} (${((gaps/total)*100).toFixed(1)}%)\n` +
      `└─ Analysis confidence: ${(confidence * 100).toFixed(0)}%\n\n` +
      `[Download Report] [Rate Accuracy] [Compare to Previous]`
    );
    
    // Show feedback options
    showFeedbackOptions();
    
    // Update results panel
    updateAnalysisResults(analysis);
    
  } catch (error) {
    console.error('Error finalizing analysis:', error);
  }
}

/**
 * Show feedback rating options
 */
function showFeedbackOptions() {
  const feedbackHtml = `
    <div class="feedback-panel">
      <p>Rate this analysis accuracy:</p>
      <div class="rating-buttons">
        ${[1, 2, 3, 4, 5].map(rating => `
          <button class="btn btn-rating" onclick="submitFeedback(${rating})">
            ${rating}/5
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  displayMessage('system', feedbackHtml);
}

/**
 * Submit feedback rating
 */
async function submitFeedback(rating) {
  if (!currentAnalysisId) return;
  
  try {
    const response = await fetch(
      `${API_BASE}/api/analysis/${currentAnalysisId}/feedback`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      }
    );
    
    const result = await response.json();
    
    if (result.modelVersionCreated) {
      displayMessage('ai', 
        `Thanks! Your feedback helped us learn.\n` +
        `Model now ${result.modelVersionCreated} (improved from previous version).\n` +
        `Next analysis will be ~${(result.improvement * 100).toFixed(0)}% more accurate.`
      );
    } else {
      displayMessage('ai', 'Thank you for your feedback!');
    }
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
  }
}

/**
 * Display a message in the chat
 */
function displayMessage(sender, content) {
  const messagesDiv = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  
  if (typeof content === 'string' && content.includes('<')) {
    messageDiv.innerHTML = content;
  } else {
    const lines = content.split('\n');
    lines.forEach(line => {
      const p = document.createElement('p');
      p.textContent = line;
      messageDiv.appendChild(p);
    });
  }
  
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/**
 * Update analysis results panel
 */
function updateAnalysisResults(analysis) {
  const resultsDiv = document.getElementById('analysis-results');
  
  if (!analysis || !analysis.analysis_id) {
    resultsDiv.innerHTML = '<div class="empty-state"><p>No active analysis</p></div>';
    return;
  }
  
  const covered = analysis.covered_count || 0;
  const gaps = analysis.gaps_found || 0;
  const total = analysis.total_requirements || 0;
  const confidence = analysis.final_confidence || 0.85;
  
  resultsDiv.innerHTML = `
    <div class="analysis-summary">
      <h3>Current Analysis</h3>
      <div class="stat">
        <span class="stat-label">Total Requirements:</span>
        <span class="stat-value">${total}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Covered:</span>
        <span class="stat-value covered">${covered} (${((covered/total)*100).toFixed(1)}%)</span>
      </div>
      <div class="stat">
        <span class="stat-label">Gaps:</span>
        <span class="stat-value gaps">${gaps} (${((gaps/total)*100).toFixed(1)}%)</span>
      </div>
      <div class="stat">
        <span class="stat-label">Confidence:</span>
        <span class="stat-value">${(confidence * 100).toFixed(0)}%</span>
      </div>
      <div class="stat">
        <span class="stat-label">Status:</span>
        <span class="stat-value">${analysis.status || 'in_progress'}</span>
      </div>
    </div>
  `;
}

// Export functions for global access
window.handleChatInput = handleChatInput;
window.sendMessage = sendMessage;
window.handleClarificationResponse = handleClarificationResponse;
window.submitFeedback = submitFeedback;

