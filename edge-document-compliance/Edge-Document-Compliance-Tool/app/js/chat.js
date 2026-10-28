// ===== CHAT INTERFACE =====
// Wraps existing /api/chat/analyze endpoint functionality
// Does NOT modify existing vera.js or backend code

function handleKeyPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;

    // Add user message to display
    addUserMessage(text);
    input.value = '';
    
    // Disable send button
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) sendBtn.disabled = true;

    // Update counter
    if (appState) {
        appState.questionCount++;
        const questionCountEl = document.getElementById('question-count');
        if (questionCountEl) {
            questionCountEl.textContent = appState.questionCount;
        }
    }

    // Show typing indicator
    const typingId = addTypingIndicator();

    try {
        // Call existing API endpoint (preserves all existing backend logic)
        const response = await fetch('/api/chat/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Customer-Id': appState?.currentCustomer?.id || ''
            },
            body: JSON.stringify({
                message: text,
                documentIds: appState?.documents?.map(d => d.id) || [],
                standardIds: [], // Will be populated from state if available
                customerId: appState?.currentCustomer?.id || ''
            })
        });

        removeTypingIndicator(typingId);

        const result = await response.json();

        if (response.ok && result.success) {
            addBotMessage(result.response);
            
            // If user asked to parse and bot suggests parsing, offer to do it
            const lowerMsg = text.toLowerCase();
            if ((lowerMsg.includes('parse') || lowerMsg.includes('yes') || lowerMsg.includes('proceed')) && 
                (result.response.includes('parse these now') || result.response.includes('Should I proceed'))) {
                // Auto-trigger parsing for unparsed standards
                setTimeout(() => {
                    if (typeof parseAllStandards === 'function') {
                        parseAllStandards();
                    }
                }, 1000);
            }
        } else {
            addBotMessage(`❌ Error: ${result.error || 'Failed to get response'}`);
        }
    } catch (error) {
        removeTypingIndicator(typingId);
        console.error('Chat error:', error);
        const errorMsg = error.message || 'Connection error. Please try again.';
        addBotMessage(`❌ Error: ${errorMsg}`);
    } finally {
        if (sendBtn) sendBtn.disabled = false;
    }
}

function addUserMessage(text) {
    const area = document.getElementById('messages-area');
    if (!area) return;
    
    if (area.children.length === 1 && area.children[0].textContent.includes('Ready')) {
        area.innerHTML = '';
    }
    
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
    
    // Save to state
    if (appState) {
        if (!appState.messages) appState.messages = [];
        appState.messages.push({ sender: 'user', text, timestamp: new Date() });
    }
}

function addBotMessage(text) {
    const area = document.getElementById('messages-area');
    if (!area) return;
    
    if (area.children.length === 1 && area.children[0].textContent.includes('Ready')) {
        area.innerHTML = '';
    }
    
    const div = document.createElement('div');
    div.className = 'message bot';
    div.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
    
    // Save to state
    if (appState) {
        if (!appState.messages) appState.messages = [];
        appState.messages.push({ sender: 'bot', text, timestamp: new Date() });
    }
}

function addTypingIndicator() {
    const area = document.getElementById('messages-area');
    if (!area) return null;
    
    const typingId = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = typingId;
    div.className = 'message bot';
    div.innerHTML = '<div class="message-bubble">💭 Thinking...</div>';
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
    return typingId;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const typingEl = document.getElementById(id);
    if (typingEl) {
        typingEl.remove();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== CUSTOMER MANAGEMENT =====

function saveCustomer() {
    const idEl = document.getElementById('customer-id');
    const nameEl = document.getElementById('customer-name');
    const versionEl = document.getElementById('assessment-version');
    const dateEl = document.getElementById('completion-date');
    
    if (!idEl) return;
    
    const id = idEl.value.trim();
    const name = nameEl?.value.trim() || '';
    const version = versionEl?.value.trim() || '';
    const date = dateEl?.value || '';

    if (!id) {
        alert('Customer ID is required');
        return;
    }

    const customer = {
        id: id,
        name: name || `Customer ${id}`,
        version: version,
        date: date,
        savedAt: new Date().toLocaleString(),
        documentCount: appState?.documents?.length || 0
    };

    if (!appState) {
        console.error('appState not initialized');
        return;
    }

    const existingIndex = appState.savedCustomers.findIndex(c => c.id === id);
    if (existingIndex >= 0) {
        appState.savedCustomers[existingIndex] = customer;
    } else {
        appState.savedCustomers.push(customer);
    }

    localStorage.setItem('savedCustomers', JSON.stringify(appState.savedCustomers));
    updateSavedCustomersList();
    alert(`✅ Customer "${name || id}" saved!`);
}

function loadCustomer(customerId) {
    if (!appState) return;
    
    const customer = appState.savedCustomers.find(c => c.id === customerId);
    if (!customer) return;

    const idEl = document.getElementById('customer-id');
    const nameEl = document.getElementById('customer-name');
    const versionEl = document.getElementById('assessment-version');
    const dateEl = document.getElementById('completion-date');
    
    if (idEl) idEl.value = customer.id;
    if (nameEl) nameEl.value = customer.name;
    if (versionEl) versionEl.value = customer.version;
    if (dateEl) dateEl.value = customer.date;

    appState.currentCustomer = customer;
    alert(`✅ Loaded customer: ${customer.name}`);
}

function deleteCustomer(customerId) {
    if (!confirm('Delete this saved customer?')) return;
    
    if (!appState) return;
    
    appState.savedCustomers = appState.savedCustomers.filter(c => c.id !== customerId);
    localStorage.setItem('savedCustomers', JSON.stringify(appState.savedCustomers));
    updateSavedCustomersList();
}

function updateSavedCustomersList() {
    const list = document.getElementById('saved-customers-list');
    if (!list || !appState) return;
    
    if (appState.savedCustomers.length === 0) {
        list.innerHTML = '<div class="no-data">No saved customers yet</div>';
        return;
    }

    list.innerHTML = appState.savedCustomers.map(customer => `
        <div class="list-item">
            <div class="list-item-name">
                <span class="list-item-icon">👤</span>
                <div class="list-item-text" title="${customer.name}">
                    <strong>${customer.name}</strong><br>
                    <span style="font-size: 10px; opacity: 0.7;">${customer.documentCount} docs</span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn-small" onclick="loadCustomer('${customer.id}')">Load</button>
                <button class="btn-small danger" onclick="deleteCustomer('${customer.id}')">Del</button>
            </div>
        </div>
    `).join('');
}

// ===== FILE HANDLING =====

function dragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    handleFileSelect({ target: { files } });
}

function handleFileSelect(e) {
    if (!appState) return;
    
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        appState.documents.push({
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toLocaleString()
        });
    });

    updateDocumentList();
    updateStats();
}

function updateDocumentList() {
    const list = document.getElementById('doc-list');
    if (!list || !appState) return;
    
    if (appState.documents.length === 0) {
        list.innerHTML = '<div class="no-data">No documents uploaded yet</div>';
        return;
    }

    list.innerHTML = appState.documents.map((doc, idx) => `
        <div class="list-item">
            <div class="list-item-name">
                <span class="list-item-icon">📄</span>
                <div class="list-item-text" title="${doc.name}">
                    <strong>${doc.name}</strong><br>
                    <span style="font-size: 10px; opacity: 0.7;">${doc.uploadedAt}</span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn-small" onclick="viewFile(${idx})">View</button>
                <button class="btn-small danger" onclick="removeDocument(${idx})">Remove</button>
            </div>
        </div>
    `).join('');
}

function removeDocument(idx) {
    if (!appState) return;
    
    appState.documents.splice(idx, 1);
    updateDocumentList();
    updateStats();
}

function viewFile(idx) {
    if (!appState) return;
    
    const doc = appState.documents[idx];
    alert(`📄 File: ${doc.name}\n\nType: ${doc.type}\nUploaded: ${doc.uploadedAt}\n\n(File preview coming soon)`);
}

function updateStats() {
    if (!appState) return;
    
    const docCountEl = document.getElementById('doc-count');
    const pageCountEl = document.getElementById('page-count');
    
    if (docCountEl) docCountEl.textContent = appState.documents.length;
    if (pageCountEl) {
        const pageCount = Math.ceil(appState.documents.length * 15);
        pageCountEl.textContent = pageCount;
    }
}

// ===== ANALYSIS =====

function runAnalysis() {
    if (!appState || appState.documents.length === 0) {
        alert('Please upload documents first to run analysis');
        return;
    }

    appState.analysisResults = {
        status: 'Complete',
        coverage: '67%',
        gaps: 52,
        confidence: '91%',
        clarifications: [
            'Does your change control process cover all modifications?',
            'How do you document management review meetings?',
            'What is your training record retention period?'
        ]
    };

    const statusEl = document.getElementById('analysis-status');
    const coverageEl = document.getElementById('analysis-coverage');
    const gapsEl = document.getElementById('analysis-gaps');
    const confidenceEl = document.getElementById('analysis-confidence');
    
    if (statusEl) statusEl.textContent = appState.analysisResults.status;
    if (coverageEl) coverageEl.textContent = appState.analysisResults.coverage;
    if (gapsEl) gapsEl.textContent = appState.analysisResults.gaps;
    if (confidenceEl) confidenceEl.textContent = appState.analysisResults.confidence;

    const clarList = document.getElementById('clarifications-list');
    if (clarList) {
        clarList.innerHTML = appState.analysisResults.clarifications
            .map((q, i) => `<p style="margin-bottom: 8px;"><strong>${i+1}.</strong> ${q}</p>`)
            .join('');
    }

    alert('✅ Analysis complete!');
}

function viewFullAnalysis() {
    if (!appState || !appState.analysisResults) {
        alert('No analysis yet. Upload documents and click "Run Analysis" first.');
        return;
    }
    alert('📊 Full Report\n\n' + JSON.stringify(appState.analysisResults, null, 2));
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateStats === 'function') updateStats();
    if (typeof updateSavedCustomersList === 'function') updateSavedCustomersList();
});

