// ===== SIDEBAR NAVIGATION =====
// Routes to different sections without modifying existing code

function goToDashboard() {
    console.log('Navigating to Dashboard');
    // Hide all areas
    document.querySelectorAll('.left-area').forEach(area => {
        area.style.display = 'none';
    });
    // Show main content area
    const mainArea = document.getElementById('main-content-area');
    if (mainArea) {
        mainArea.style.display = 'flex';
    }
    // Update active nav button
    setActiveNavButton('dashboard');
}

function goToAdmin() {
    console.log('Navigating to Admin');
    // Hide all areas
    document.querySelectorAll('.left-area').forEach(area => {
        area.style.display = 'none';
    });
    // Show admin panel
    const adminArea = document.getElementById('admin-panel-area');
    if (adminArea) {
        adminArea.style.display = 'flex';
    }
    // Update active nav button
    setActiveNavButton('admin');
}

function goToComplianceLibrary() {
    console.log('Navigating to Compliance Library');
    // Hide all areas
    document.querySelectorAll('.left-area').forEach(area => {
        area.style.display = 'none';
    });
    // Show compliance library area
    const libraryArea = document.getElementById('compliance-library-area');
    if (libraryArea) {
        libraryArea.style.display = 'flex';
    }
    // Update active nav button
    setActiveNavButton('compliance-library');
}

// Optional: Add active button state
function setActiveNavButton(buttonName) {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-nav="${buttonName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Legacy function names for compatibility
function showMainContent() {
    goToDashboard();
}

function openAdminPanel() {
    goToAdmin();
}

function showComplianceLibrary() {
    goToComplianceLibrary();
}

function showReports() {
    console.log('Navigating to Reports');
    goToDashboard(); // Reports are in the dashboard
    // Scroll to reports section if it exists
    const reportsSection = document.getElementById('reports-section');
    if (reportsSection) {
        reportsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

