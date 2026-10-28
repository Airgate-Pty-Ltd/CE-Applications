// ===== APPLICATION STATE =====
// Manages customer data, documents, saved customers, chat messages

const appState = {
    documents: [],
    messages: [],
    savedCustomers: JSON.parse(localStorage.getItem('savedCustomers')) || [],
    currentCustomer: null,
    analysisResults: null,
    questionCount: 0
};

// ===== PERSISTENCE =====
function saveStateToStorage() {
    localStorage.setItem('appState', JSON.stringify({
        savedCustomers: appState.savedCustomers,
        questionCount: appState.questionCount
    }));
}

function loadStateFromStorage() {
    const stored = localStorage.getItem('appState');
    if (stored) {
        const data = JSON.parse(stored);
        appState.savedCustomers = data.savedCustomers || [];
        appState.questionCount = data.questionCount || 0;
    }
}

// Initialize on load
loadStateFromStorage();

