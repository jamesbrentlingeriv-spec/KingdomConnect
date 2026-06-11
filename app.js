// Kingdom Connect Church Newcomer Connection Portal JS
// Uses ES modules and dynamic imports to handle Firebase and Tesseract.js

// --- Encouraging Scriptures List ---
const SCRIPTURES = [
    {
        text: "Therefore, my beloved brothers, be steadfast, immovable, always abounding in the work of the Lord, knowing that in the Lord your labor is not in vain.",
        ref: "1 Corinthians 15:58"
    },
    {
        text: "For God is not unjust so as to overlook your work and the love that you have shown for his name in serving the saints, as you still do.",
        ref: "Hebrews 6:10"
    },
    {
        text: "Whatever you do, work heartily, as for the Lord and not for men, knowing that from the Lord you will receive the inheritance as your reward. You are serving the Lord Christ.",
        ref: "Colossians 3:23-24"
    },
    {
        text: "Let us not grow weary of doing good, for in due season we will reap, if we do not give up.",
        ref: "Galatians 6:9"
    },
    {
        text: "As each has received a gift, use it to serve one another, as good stewards of God's varied grace.",
        ref: "1 Peter 4:10"
    },
    {
        text: "For we are his workmanship, created in Christ Jesus for good works, which God prepared beforehand, that we should walk in them.",
        ref: "Ephesians 2:10"
    },
    {
        text: "And the King will answer them, 'Truly, I say to you, as you did it to one of the least of these my brothers, you did it to me.'",
        ref: "Matthew 25:40"
    }
];

// State variables
let activeScriptureIndex = 0;
let db = null; // Holds Firebase Firestore database reference if active
let auth = null; // Holds Firebase Auth reference if active
let isFirebase = false; // Flag for active database type
let newcomersData = []; // Local cache of records
let currentFilter = 'all'; // Current database quick filter
let searchQuery = ''; // Search query string
let firebaseUnsubscribe = null; // Firestore listener teardown

// User Credentials Mapping
const USERS = {
    "Riby": "chase",
    "Ron": "pastor",
    "James": "admin",
    "Chase": "riby"
};

// DOM Element Selectors
const docElements = {
    // Auth elements
    loginContainer: document.getElementById('login-container'),
    loginForm: document.getElementById('login-form'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    loginErrorMsg: document.getElementById('login-error-msg'),
    appContainer: document.getElementById('app-container'),
    currentUserDisplay: document.getElementById('current-user-display'),
    logoutBtn: document.getElementById('logout-btn'),

    // Badges & Buttons
    statusBadge: document.getElementById('db-status-badge'),
    settingsBtn: document.getElementById('settings-btn'),
    nextScriptureBtn: document.getElementById('next-scripture-btn'),
    scriptureText: document.getElementById('scripture-text'),
    scriptureRef: document.getElementById('scripture-reference'),
    
    // Tabs
    entryTabs: document.querySelectorAll('.entry-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    // Form & Form Controls
    newcomerForm: document.getElementById('newcomer-form'),
    entryId: document.getElementById('entry-id'),
    fullName: document.getElementById('full-name'),
    emailAddr: document.getElementById('email-addr'),
    phoneNum: document.getElementById('phone-num'),
    visitDate: document.getElementById('visit-date'),
    stepMembership: document.getElementById('step-membership'),
    stepBaptism: document.getElementById('step-baptism'),
    stepGroup: document.getElementById('step-group'),
    stepPrayer: document.getElementById('step-prayer'),
    prayerDetailsGroup: document.getElementById('prayer-details-group'),
    prayerRequestText: document.getElementById('prayer-request'),
    adminNotes: document.getElementById('admin-notes'),
    submitBtn: document.getElementById('submit-btn'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    checkboxCards: document.querySelectorAll('.checkbox-card'),
    
    // OCR elements
    scanDropZone: document.getElementById('scan-drop-zone'),
    cardFileInput: document.getElementById('card-file-input'),
    viewSampleCardBtn: document.getElementById('view-sample-card-btn'),
    scanPreviewContainer: document.getElementById('scan-preview-container'),
    scanImagePreview: document.getElementById('scan-image-preview'),
    scanningLaser: document.getElementById('scanning-laser'),
    scanProgressContainer: document.getElementById('scan-progress-container'),
    scanStatusText: document.getElementById('scan-status-text'),
    scanPercent: document.getElementById('scan-percent'),
    scanProgressFill: document.getElementById('scan-progress-fill'),
    scanResultsPanel: document.getElementById('scan-results-panel'),
    rawExtractedText: document.getElementById('raw-extracted-text'),
    autofillBtn: document.getElementById('autofill-btn'),
    clearScanBtn: document.getElementById('clear-scan-btn'),
    
    // Sample card
    sampleCardModal: document.getElementById('sample-card-modal'),
    closeSampleCardBtn: document.getElementById('close-sample-card-btn'),
    downloadSampleBtn: document.getElementById('download-sample-btn'),
    
    // Database elements
    databaseRows: document.getElementById('database-rows'),
    emptyState: document.getElementById('empty-state'),
    databaseSpinner: document.getElementById('database-spinner'),
    searchInput: document.getElementById('search-input'),
    exportCsvBtn: document.getElementById('export-csv-btn'),
    filterTabs: document.querySelectorAll('.filter-tab'),
    
    // Stats dashboard
    statTotal: document.getElementById('stat-total-val'),
    statBaptism: document.getElementById('stat-baptism-val'),
    statMembership: document.getElementById('stat-membership-val'),
    statGroup: document.getElementById('stat-group-val'),
    statPrayer: document.getElementById('stat-prayer-val'),
    
    // Settings modal
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    firebaseConfigForm: document.getElementById('firebase-config-form'),
    toggleFirebaseDb: document.getElementById('toggle-firebase-db'),
    clearConfigBtn: document.getElementById('clear-config-btn'),
    fbApiKey: document.getElementById('fb-apiKey'),
    fbAuthDomain: document.getElementById('fb-authDomain'),
    fbProjectId: document.getElementById('fb-projectId'),
    fbStorageBucket: document.getElementById('fb-storageBucket'),
    fbMessagingSenderId: document.getElementById('fb-messagingSenderId'),
    fbAppId: document.getElementById('fb-appId')
};

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    docElements.visitDate.value = new Date().toISOString().split('T')[0];
    
    // Pre-populate Firebase credentials if none exist in browser storage
    const savedConfig = localStorage.getItem('kj_firebase_config');
    if (!savedConfig) {
        const defaultConfig = {
            apiKey: "AIzaSyBMqmj7HprjVf4z6zXkS2aynWOPbjGh22w",
            authDomain: "kingdom-connect-187ca.firebaseapp.com",
            projectId: "kingdom-connect-187ca",
            storageBucket: "kingdom-connect-187ca.firebasestorage.app",
            messagingSenderId: "899397395332",
            appId: "1:899397395332:web:886320f679a8b86c5333d1"
        };
        localStorage.setItem('kj_firebase_config', JSON.stringify(defaultConfig));
        // Default to true so that records are synced across all devices automatically
        localStorage.setItem('kj_firebase_enabled', 'true');
    }

    // Initialize Event Listeners
    initEventListeners();
    
    // Initialize Scripture Banner
    rotateScripture(0);
    
    // Check session authentication
    checkSessionAuth();
    
    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((reg) => console.log('[Service Worker] Registered successfully with scope:', reg.scope))
                .catch((err) => console.error('[Service Worker] Registration failed:', err));
        });
    }
});

// --- Event Listeners Registration ---
function initEventListeners() {
    // Login Form Submit
    docElements.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLoginSubmit();
    });

    // Logout Button
    docElements.logoutBtn.addEventListener('click', handleLogout);
    // Scripture click
    docElements.nextScriptureBtn.addEventListener('click', () => {
        activeScriptureIndex = (activeScriptureIndex + 1) % SCRIPTURES.length;
        rotateScripture(activeScriptureIndex);
    });
    
    // Settings Modal toggles
    docElements.settingsBtn.addEventListener('click', () => openModal(docElements.settingsModal));
    docElements.closeSettingsBtn.addEventListener('click', () => closeModal(docElements.settingsModal));
    docElements.settingsModal.addEventListener('click', (e) => {
        if (e.target === docElements.settingsModal) closeModal(docElements.settingsModal);
    });
    
    // Tab selectors (Manual vs Scan)
    docElements.entryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            docElements.entryTabs.forEach(t => t.classList.remove('active'));
            docElements.tabPanes.forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const targetPane = document.getElementById(tab.getAttribute('data-tab'));
            if (targetPane) targetPane.classList.add('active');
        });
    });
    
    // Checkbox cards styling and toggle dependencies
    docElements.checkboxCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        
        // Initial visual class if checked
        if (checkbox.checked) card.classList.add('checked-active');
        
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                card.classList.add('checked-active');
            } else {
                card.classList.remove('checked-active');
            }
            
            // Show/hide prayer request details based on checkbox state
            if (checkbox.id === 'step-prayer') {
                docElements.prayerDetailsGroup.style.display = checkbox.checked ? 'block' : 'none';
                if (checkbox.checked) docElements.prayerRequestText.focus();
            }
        });
    });
    
    // Firebase Toggle state
    docElements.toggleFirebaseDb.addEventListener('change', () => {
        const fields = [
            docElements.fbApiKey, docElements.fbAuthDomain, docElements.fbProjectId, 
            docElements.fbStorageBucket, docElements.fbMessagingSenderId, docElements.fbAppId
        ];
        fields.forEach(f => f.required = docElements.toggleFirebaseDb.checked);
    });
    
    // Firebase Config Form submit
    docElements.firebaseConfigForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveFirebaseConfig();
    });
    
    // Clear Firebase Config button
    docElements.clearConfigBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear your Firebase credentials? This will revert the database to offline Local Mode.")) {
            clearFirebaseConfig();
        }
    });

    // Form Submission
    docElements.newcomerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveNewcomerRecord();
    });

    // Cancel Edit
    docElements.cancelEditBtn.addEventListener('click', resetNewcomerForm);

    // Database Filters
    docElements.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            docElements.filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter');
            renderDatabaseTable();
        });
    });

    // Database Search input
    docElements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderDatabaseTable();
    });

    // Export CSV
    docElements.exportCsvBtn.addEventListener('click', exportToCSV);

    // OCR Drag and Drop Area
    const dropZone = docElements.scanDropZone;
    
    dropZone.addEventListener('click', () => docElements.cardFileInput.click());
    docElements.cardFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleCardFile(e.target.files[0]);
        }
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleCardFile(files[0]);
        }
    });

    // Clear OCR Scanner
    docElements.clearScanBtn.addEventListener('click', resetScanner);

    // View Sample Card modal
    docElements.viewSampleCardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(docElements.sampleCardModal);
    });
    docElements.closeSampleCardBtn.addEventListener('click', () => closeModal(docElements.sampleCardModal));
    docElements.sampleCardModal.addEventListener('click', (e) => {
        if (e.target === docElements.sampleCardModal) closeModal(docElements.sampleCardModal);
    });

    // Download Sample Card PNG helper
    docElements.downloadSampleBtn.addEventListener('click', downloadSampleCard);
}

// --- Scripture Banner Rotator ---
function rotateScripture(index) {
    const scripture = SCRIPTURES[index];
    // Add brief fade animation out
    docElements.scriptureText.style.opacity = 0;
    docElements.scriptureRef.style.opacity = 0;
    
    setTimeout(() => {
        docElements.scriptureText.textContent = `"${scripture.text}"`;
        docElements.scriptureRef.textContent = scripture.ref;
        docElements.scriptureText.style.opacity = 1;
        docElements.scriptureRef.style.opacity = 1;
    }, 250);
}

// --- Modal Helper Functions ---
function openModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// --- Database Engine: Firebase Firestore & LocalStorage fallback ---

async function initializeDatabaseConnection() {
    showDatabaseSpinner(true);
    
    // Load config from localStorage
    const savedConfig = localStorage.getItem('kj_firebase_config');
    const isFirebaseEnabledSetting = localStorage.getItem('kj_firebase_enabled') === 'true';
    
    // Set UI config inputs
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            docElements.fbApiKey.value = config.apiKey || '';
            docElements.fbAuthDomain.value = config.authDomain || '';
            docElements.fbProjectId.value = config.projectId || '';
            docElements.fbStorageBucket.value = config.storageBucket || '';
            docElements.fbMessagingSenderId.value = config.messagingSenderId || '';
            docElements.fbAppId.value = config.appId || '';
        } catch (e) {
            console.error("Failed to parse saved Firebase config", e);
        }
    }
    
    docElements.toggleFirebaseDb.checked = isFirebaseEnabledSetting;
    const fields = [
        docElements.fbApiKey, docElements.fbAuthDomain, docElements.fbProjectId, 
        docElements.fbStorageBucket, docElements.fbMessagingSenderId, docElements.fbAppId
    ];
    fields.forEach(f => f.required = isFirebaseEnabledSetting);
    
    // Unsubscribe from any previous Firestore observer
    if (firebaseUnsubscribe) {
        firebaseUnsubscribe();
        firebaseUnsubscribe = null;
    }

    if (isFirebaseEnabledSetting && savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            
            // Dynamic import of Firebase modules (no Auth modules needed)
            const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
            const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            
            // Prevent duplicate initialization error
            let app;
            try {
                // Look for existing app named default
                const { getApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
                app = getApp();
            } catch (e) {
                app = initializeApp(config);
            }
            
            db = getFirestore(app);
            isFirebase = true;
            
            // Update UI status badge
            docElements.statusBadge.className = "badge badge-active";
            docElements.statusBadge.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Firebase Cloud Connected';
            
            // Set up Firestore sync
            setupFirestoreSync();
            showDatabaseSpinner(false);
            
        } catch (error) {
            console.error("Firebase CDN loading or setup error:", error);
            alert("Could not connect to Firebase Cloud. Reverting to Local Storage.\nDetail: " + error.message);
            fallbackToLocalStorage();
        }
    } else {
        fallbackToLocalStorage();
    }
}

async function setupFirestoreSync() {
    if (firebaseUnsubscribe) return; // Already syncing
    
    showDatabaseSpinner(true);
    try {
        const { collection, onSnapshot } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        const newcomersCollection = collection(db, "newcomers");
        firebaseUnsubscribe = onSnapshot(newcomersCollection, (snapshot) => {
            const list = [];
            snapshot.forEach(doc => {
                list.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort by date or createdAt
            list.sort((a, b) => new Date(b.visitDate || b.createdAt) - new Date(a.visitDate || a.createdAt));
            newcomersData = list;
            
            showDatabaseSpinner(false);
            renderDatabaseTable();
            updateStatsDashboard();
        }, (error) => {
            console.error("Firestore snapshot syncing failed:", error);
            alert("Firebase database syncing issue. Reverting to Local Storage.\nError: " + error.message);
            fallbackToLocalStorage();
        });
    } catch (e) {
        console.error("Failed to load firestore sync libraries", e);
        fallbackToLocalStorage();
    }
}

function fallbackToLocalStorage() {
    isFirebase = false;
    db = null;
    auth = null;
    if (firebaseUnsubscribe) {
        firebaseUnsubscribe();
        firebaseUnsubscribe = null;
    }
    
    docElements.statusBadge.className = "badge badge-demo";
    docElements.statusBadge.innerHTML = '<i class="fa-solid fa-circle-nodes"></i> Local Demo Mode';
    
    // Check local session
    const currentUser = sessionStorage.getItem('kj_current_user');
    if (currentUser && USERS[currentUser]) {
        docElements.loginContainer.style.display = 'none';
        docElements.appContainer.style.display = 'flex';
        docElements.currentUserDisplay.textContent = currentUser;
        
        loadLocalStorageData();
        showDatabaseSpinner(false);
        renderDatabaseTable();
        updateStatsDashboard();
    } else {
        docElements.loginContainer.style.display = 'flex';
        docElements.appContainer.style.display = 'none';
        showDatabaseSpinner(false);
    }
}

function loadLocalStorageData() {
    const localDb = localStorage.getItem('kj_newcomers_db');
    if (localDb) {
        try {
            newcomersData = JSON.parse(localDb);
            newcomersData.sort((a, b) => new Date(b.visitDate || b.createdAt) - new Date(a.visitDate || a.createdAt));
        } catch (e) {
            newcomersData = [];
        }
    } else {
        newcomersData = [];
    }
}

function saveLocalStorageData() {
    localStorage.setItem('kj_newcomers_db', JSON.stringify(newcomersData));
    if (!isFirebase) {
        renderDatabaseTable();
        updateStatsDashboard();
    }
}

// --- Save & Update Firebase Configuration ---
function saveFirebaseConfig() {
    const config = {
        apiKey: docElements.fbApiKey.value.trim(),
        authDomain: docElements.fbAuthDomain.value.trim(),
        projectId: docElements.fbProjectId.value.trim(),
        storageBucket: docElements.fbStorageBucket.value.trim(),
        messagingSenderId: docElements.fbMessagingSenderId.value.trim(),
        appId: docElements.fbAppId.value.trim()
    };
    
    localStorage.setItem('kj_firebase_config', JSON.stringify(config));
    localStorage.setItem('kj_firebase_enabled', docElements.toggleFirebaseDb.checked ? 'true' : 'false');
    
    closeModal(docElements.settingsModal);
    initializeDatabaseConnection();
}

function clearFirebaseConfig() {
    localStorage.removeItem('kj_firebase_config');
    localStorage.setItem('kj_firebase_enabled', 'false');
    
    // Reset form fields
    docElements.fbApiKey.value = '';
    docElements.fbAuthDomain.value = '';
    docElements.fbProjectId.value = '';
    docElements.fbStorageBucket.value = '';
    docElements.fbMessagingSenderId.value = '';
    docElements.fbAppId.value = '';
    docElements.toggleFirebaseDb.checked = false;
    
    closeModal(docElements.settingsModal);
    initializeDatabaseConnection();
}

// --- CRUD Database Operations ---

async function saveNewcomerRecord() {
    const id = docElements.entryId.value;
    
    // Create record object
    const record = {
        fullName: docElements.fullName.value.trim(),
        email: docElements.emailAddr.value.trim(),
        phone: docElements.phoneNum.value.trim(),
        visitDate: docElements.visitDate.value,
        membership: docElements.stepMembership.checked,
        baptism: docElements.stepBaptism.checked,
        group: docElements.stepGroup.checked,
        prayer: docElements.stepPrayer.checked,
        prayerRequest: docElements.stepPrayer.checked ? docElements.prayerRequestText.value.trim() : '',
        adminNotes: docElements.adminNotes.value.trim(),
        updatedAt: new Date().toISOString()
    };

    if (!id) {
        // --- ADD OPERATION ---
        record.createdAt = new Date().toISOString();
        
        if (isFirebase && db) {
            try {
                showDatabaseSpinner(true);
                const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                await addDoc(collection(db, "newcomers"), record);
                alert("Successfully saved to Firebase Cloud!");
            } catch (error) {
                console.error("Firestore add failed:", error);
                alert("Failed to write to cloud. Saving locally. Details: " + error.message);
                // Save locally as fallback
                saveLocalAdd(record);
            }
        } else {
            saveLocalAdd(record);
        }
    } else {
        // --- UPDATE OPERATION ---
        if (isFirebase && db) {
            try {
                showDatabaseSpinner(true);
                const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
                await updateDoc(doc(db, "newcomers", id), record);
                alert("Successfully updated on Firebase Cloud!");
            } catch (error) {
                console.error("Firestore update failed:", error);
                alert("Failed to update in cloud. Updating locally. Details: " + error.message);
                saveLocalUpdate(id, record);
            }
        } else {
            saveLocalUpdate(id, record);
        }
    }
    
    resetNewcomerForm();
}

function saveLocalAdd(record) {
    // Generate simple ID
    record.id = 'local_' + Date.now();
    newcomersData.unshift(record);
    saveLocalStorageData();
}

function saveLocalUpdate(id, record) {
    const index = newcomersData.findIndex(item => item.id === id);
    if (index !== -1) {
        newcomersData[index] = { ...newcomersData[index], ...record };
        saveLocalStorageData();
    }
}

async function editRecord(id) {
    const record = newcomersData.find(item => item.id === id);
    if (!record) return;

    // Scroll to form
    document.querySelector('.input-panel').scrollIntoView({ behavior: 'smooth' });
    
    // Activate manual tab
    document.querySelector('[data-tab="manual-tab"]').click();

    // Populate fields
    docElements.entryId.value = record.id;
    docElements.fullName.value = record.fullName;
    docElements.emailAddr.value = record.email || '';
    docElements.phoneNum.value = record.phone || '';
    docElements.visitDate.value = record.visitDate || new Date().toISOString().split('T')[0];
    
    docElements.stepMembership.checked = !!record.membership;
    docElements.stepBaptism.checked = !!record.baptism;
    docElements.stepGroup.checked = !!record.group;
    docElements.stepPrayer.checked = !!record.prayer;
    
    // Handle checkbox custom styling active classes
    docElements.checkboxCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            card.classList.add('checked-active');
        } else {
            card.classList.remove('checked-active');
        }
    });

    if (record.prayer) {
        docElements.prayerDetailsGroup.style.display = 'block';
        docElements.prayerRequestText.value = record.prayerRequest || '';
    } else {
        docElements.prayerDetailsGroup.style.display = 'none';
        docElements.prayerRequestText.value = '';
    }
    
    docElements.adminNotes.value = record.adminNotes || '';
    
    // Change submit button text
    docElements.submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Connection';
    docElements.cancelEditBtn.style.display = 'inline-flex';
}

async function deleteRecord(id) {
    if (!confirm("Are you sure you want to permanently delete this newcomer record?")) return;

    if (isFirebase && db) {
        try {
            showDatabaseSpinner(true);
            const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
            await deleteDoc(doc(db, "newcomers", id));
        } catch (error) {
            console.error("Firestore delete failed:", error);
            alert("Could not delete from cloud. Deleting locally instead. Error: " + error.message);
            deleteLocalRecord(id);
        }
    } else {
        deleteLocalRecord(id);
    }
}

function deleteLocalRecord(id) {
    newcomersData = newcomersData.filter(item => item.id !== id);
    saveLocalStorageData();
}

function resetNewcomerForm() {
    docElements.entryId.value = '';
    docElements.newcomerForm.reset();
    
    // Trigger checkbox class updates
    docElements.checkboxCards.forEach(card => {
        card.classList.remove('checked-active');
    });
    docElements.prayerDetailsGroup.style.display = 'none';
    
    docElements.visitDate.value = new Date().toISOString().split('T')[0];
    docElements.submitBtn.innerHTML = '<i class="fa-solid fa-heart"></i> Save Newcomer';
    docElements.cancelEditBtn.style.display = 'none';
}


// --- UI Table Rendering & Calculations ---

function renderDatabaseTable() {
    // Clear list
    docElements.databaseRows.innerHTML = '';
    
    // Filter list
    let filteredList = newcomersData;
    
    // 1. Filter by Quick Tabs
    if (currentFilter !== 'all') {
        filteredList = filteredList.filter(item => {
            if (currentFilter === 'membership') return item.membership === true;
            if (currentFilter === 'baptism') return item.baptism === true;
            if (currentFilter === 'group') return item.group === true;
            if (currentFilter === 'prayer') return item.prayer === true;
            return true;
        });
    }
    
    // 2. Filter by search query
    if (searchQuery !== '') {
        filteredList = filteredList.filter(item => {
            return (item.fullName && item.fullName.toLowerCase().includes(searchQuery)) ||
                   (item.email && item.email.toLowerCase().includes(searchQuery)) ||
                   (item.phone && item.phone.toLowerCase().includes(searchQuery));
        });
    }

    if (filteredList.length === 0) {
        docElements.emptyState.style.display = 'flex';
        return;
    }
    
    docElements.emptyState.style.display = 'none';
    
    // Draw records
    filteredList.forEach(item => {
        const row = document.createElement('tr');
        
        // Formatted date
        let dateStr = 'No date';
        if (item.visitDate) {
            const dateObj = new Date(item.visitDate + 'T00:00:00'); // Prevent UTC offset timezone shift
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        
        // Badges elements
        let badgesHtml = '<div class="step-tags">';
        if (item.membership) badgesHtml += '<span class="tag tag-member"><i class="fa-solid fa-users-rectangle"></i> Member Request</span>';
        if (item.baptism) badgesHtml += '<span class="tag tag-baptism"><i class="fa-solid fa-droplet"></i> Wants Baptism</span>';
        if (item.group) badgesHtml += '<span class="tag tag-group"><i class="fa-solid fa-people-group"></i> Group</span>';
        if (item.prayer) {
            const title = item.prayerRequest ? escapeHtml(item.prayerRequest) : 'Special prayer requested';
            badgesHtml += `<span class="tag tag-prayer" title="${title}"><i class="fa-solid fa-hands-praying"></i> Prayers</span>`;
        }
        badgesHtml += '</div>';

        // Contact columns
        const contactHtml = `
            <div class="visitor-meta">
                ${item.email ? `<span><i class="fa-regular fa-envelope"></i> ${escapeHtml(item.email)}</span>` : ''}
                ${item.phone ? `<span><i class="fa-solid fa-phone"></i> ${escapeHtml(item.phone)}</span>` : ''}
            </div>
        `;

        row.innerHTML = `
            <td>
                <div class="visitor-name">${escapeHtml(item.fullName)}</div>
                ${item.adminNotes ? `<span class="visitor-meta" style="color: var(--text-muted); font-style: italic; font-size:11px;">Note: ${escapeHtml(item.adminNotes)}</span>` : ''}
            </td>
            <td>${dateStr}</td>
            <td>${contactHtml}</td>
            <td>${badgesHtml}</td>
            <td class="action-cell">
                <button class="btn-icon edit-btn" data-id="${item.id}" title="Edit newcomer details"><i class="fa-solid fa-pencil"></i></button>
                <button class="btn-icon text-danger delete-btn" data-id="${item.id}" title="Delete newcomer"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        
        // Add events directly
        row.querySelector('.edit-btn').addEventListener('click', () => editRecord(item.id));
        row.querySelector('.delete-btn').addEventListener('click', () => deleteRecord(item.id));
        
        docElements.databaseRows.appendChild(row);
    });
}

function updateStatsDashboard() {
    let total = newcomersData.length;
    let membershipCount = 0;
    let baptismCount = 0;
    let groupCount = 0;
    let prayerCount = 0;

    newcomersData.forEach(item => {
        if (item.membership) membershipCount++;
        if (item.baptism) baptismCount++;
        if (item.group) groupCount++;
        if (item.prayer) prayerCount++;
    });

    docElements.statTotal.textContent = total;
    docElements.statMembership.textContent = membershipCount;
    docElements.statBaptism.textContent = baptismCount;
    docElements.statGroup.textContent = groupCount;
    docElements.statPrayer.textContent = prayerCount;
}

function showDatabaseSpinner(show) {
    docElements.databaseSpinner.style.display = show ? 'flex' : 'none';
}

// --- OCR Card Scanner Engine via Tesseract.js ---

let lastExtractedInfo = null;

function handleCardFile(file) {
    if (!file.type.startsWith('image/')) {
        alert("Please select a valid image file.");
        return;
    }

    // Reset scanner state
    resetScanner();

    // Show Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        docElements.scanImagePreview.src = e.target.result;
        docElements.scanPreviewContainer.style.display = 'block';
        docElements.scanProgressContainer.style.display = 'block';
        docElements.scanningLaser.style.display = 'block';
        docElements.scanDropZone.style.display = 'none';
        
        // Start OCR process
        processCardImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

function processCardImage(imageData) {
    updateScanProgress("Initializing OCR engine...", 10);
    
    // Check if Tesseract is loaded
    if (!window.Tesseract) {
        updateScanProgress("OCR Engine error: Library not loaded. Please check your network.", 0);
        return;
    }

    window.Tesseract.recognize(
        imageData,
        'eng',
        {
            logger: message => {
                if (message.status === 'recognizing text') {
                    const progress = Math.round(message.progress * 100);
                    updateScanProgress(`Reading text lines (${progress}%)`, 20 + (progress * 0.75));
                } else {
                    updateScanProgress(message.status, 15);
                }
            }
        }
    ).then(({ data: { text } }) => {
        updateScanProgress("Decoding card data...", 95);
        console.log("Extracted Card OCR:", text);
        
        setTimeout(() => {
            // Hide scanner progress, laser scan line
            docElements.scanProgressContainer.style.display = 'none';
            docElements.scanningLaser.style.display = 'none';
            
            // Render scan results box
            docElements.rawExtractedText.textContent = text;
            docElements.scanResultsPanel.style.display = 'block';
            
            // Parse info
            lastExtractedInfo = parseCardText(text);
            
            // Dynamic Autofill Action
            docElements.autofillBtn.onclick = () => {
                autofillNewcomerForm(lastExtractedInfo);
            };
            
        }, 800);
        
    }).catch(err => {
        console.error("Tesseract scanner error:", err);
        updateScanProgress("Error during scanning: " + err.message, 0);
        alert("Text extraction failed. You can still manually enter the newcomer details.");
    });
}

function updateScanProgress(text, percentage) {
    docElements.scanStatusText.textContent = text;
    docElements.scanPercent.textContent = `${Math.round(percentage)}%`;
    docElements.scanProgressFill.style.width = `${percentage}%`;
}

function parseCardText(text) {
    const result = {
        name: '',
        email: '',
        phone: '',
        date: '',
        membership: false,
        baptism: false,
        group: false,
        prayer: false,
        prayerRequest: '',
        notes: ''
    };
    
    // Split text into lines for specific processing
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract Name
    // Pattern matches: "NAME: John Doe" or "Name John Doe"
    const nameMatch = text.match(/name\s*:\s*([^\n\r]+)/i);
    if (nameMatch) {
        result.name = nameMatch[1].trim();
    } else {
        // Fallback: look for a line starting with "name" without a colon
        const altName = lines.find(l => /^name\s/i.test(l));
        if (altName) result.name = altName.replace(/^name\s+/i, '').trim();
    }
    
    // Extract Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
        result.email = emailMatch[1].trim();
    }
    
    // Extract Phone
    const phoneMatch = text.match(/(?:phone\s*:\s*)?((?:\+?\d{1,2}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i);
    if (phoneMatch) {
        result.phone = phoneMatch[1].trim();
    }
    
    // Extract Date
    const dateMatch = text.match(/(?:date\s*:\s*)?(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/i);
    if (dateMatch) {
        // Convert MM/DD/YYYY to YYYY-MM-DD for input[type="date"]
        let rawDate = dateMatch[1].trim();
        const parts = rawDate.split(/[/\-.]/);
        if (parts.length === 3) {
            let month = parts[0].padStart(2, '0');
            let day = parts[1].padStart(2, '0');
            let year = parts[2];
            if (year.length === 2) year = '20' + year; // Convert 26 to 2026
            result.date = `${year}-${month}-${day}`;
        }
    }
    
    // Parser for checkboxes
    // Standard connection cards have checkboxes. Handwritings or Tesseract results may look like:
    // "[x] Become a New Member", "[X] Get Baptised", "v Get Baptised", "[*] Get Baptised" etc.
    lines.forEach(line => {
        // Membership
        if (/member/i.test(line)) {
            if (/\[\s*[xv*]\s*\]|checked|✔|■|☒/i.test(line) || (line.includes('Become a New Member') && text.includes('[x] Become'))) {
                result.membership = true;
            }
        }
        
        // Baptism
        if (/bapti/i.test(line)) {
            if (/\[\s*[xv*]\s*\]|checked|✔|■|☒/i.test(line) || (line.includes('Get Baptised') && text.includes('[x] Get Baptised'))) {
                result.baptism = true;
            }
        }
        
        // Group
        if (/group/i.test(line)) {
            if (/\[\s*[xv*]\s*\]|checked|✔|■|☒/i.test(line) || (line.includes('Join Church Group') && text.includes('[x] Join Church Group'))) {
                result.group = true;
            }
        }
        
        // Prayer Checkbox
        if (/prayer/i.test(line) && !/requests/i.test(line)) {
            if (/\[\s*[xv*]\s*\]|checked|✔|■|☒/i.test(line) || (line.includes('Prayer Request') && text.includes('[x] Prayer Request'))) {
                result.prayer = true;
            }
        }
    });

    // Extract Prayer Request details
    // Match anything after "PRAYER REQUESTS / NOTES: " or "PRAYER REQUESTS: "
    const prayerDetailsMatch = text.match(/(?:prayer\s*requests?\s*\/?\s*notes?\s*:\s*)([^\n\r]+)/i);
    if (prayerDetailsMatch) {
        result.prayerRequest = prayerDetailsMatch[1].trim();
        result.prayer = true; // Make sure the checkbox checks
    } else {
        // Fallback: look for "Please pray for"
        const prayForMatch = text.match(/(please pray for [^\n\r]+)/i);
        if (prayForMatch) {
            result.prayerRequest = prayForMatch[1].trim();
            result.prayer = true;
        }
    }
    
    return result;
}

function autofillNewcomerForm(data) {
    if (!data) return;

    docElements.fullName.value = data.name || '';
    docElements.emailAddr.value = data.email || '';
    docElements.phoneNum.value = data.phone || '';
    if (data.date) docElements.visitDate.value = data.date;
    
    docElements.stepMembership.checked = !!data.membership;
    docElements.stepBaptism.checked = !!data.baptism;
    docElements.stepGroup.checked = !!data.group;
    docElements.stepPrayer.checked = !!data.prayer;

    // Checkbox cards styling classes
    docElements.checkboxCards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            card.classList.add('checked-active');
        } else {
            card.classList.remove('checked-active');
        }
    });

    if (data.prayer) {
        docElements.prayerDetailsGroup.style.display = 'block';
        docElements.prayerRequestText.value = data.prayerRequest || '';
    } else {
        docElements.prayerDetailsGroup.style.display = 'none';
        docElements.prayerRequestText.value = '';
    }
    
    // Switch to manual input tab automatically
    document.querySelector('[data-tab="manual-tab"]').click();
    
    alert("Connection details loaded into form. Please review and save!");
}

function resetScanner() {
    docElements.cardFileInput.value = '';
    docElements.scanImagePreview.src = '';
    docElements.scanPreviewContainer.style.display = 'none';
    docElements.scanResultsPanel.style.display = 'none';
    docElements.scanDropZone.style.display = 'flex';
    docElements.scanningLaser.style.display = 'none';
    docElements.scanProgressContainer.style.display = 'none';
    lastExtractedInfo = null;
}

// --- Sample Card Exporter Helper (SVG -> Canvas PNG download) ---
function downloadSampleCard() {
    const svgElement = document.querySelector("#sample-card-to-download svg");
    
    // Serialize SVG
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
        // Draw onto canvas
        const canvas = document.createElement("canvas");
        canvas.width = 1200; // high resolution PNG
        canvas.height = 700;
        const context = canvas.getContext("2d");
        
        // Fill canvas with white background before drawing svg
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 1200, 700);
        
        context.drawImage(image, 0, 0, 1200, 700);
        
        // Export to PNG data URL and click download
        const pngURL = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngURL;
        downloadLink.download = "kingdom_connect_welcome_card_sample.png";
        
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Cleanup blob URL
        URL.revokeObjectURL(blobURL);
    };
    image.onerror = (e) => {
        console.error("Canvas draw SVG failed", e);
        alert("Failed to export sample card image automatically.");
    };
    image.src = blobURL;
}

// --- CSV Exporter Engine ---
function exportToCSV() {
    if (newcomersData.length === 0) {
        alert("The newcomer database is currently empty. Add records before exporting.");
        return;
    }
    
    // Define headers
    const headers = [
        "Full Name", "Visit Date", "Email", "Phone", 
        "Wants Membership", "Wants Baptism", "Wants Group", 
        "Has Prayer Request", "Prayer Details", "Admin Notes", "Created At"
    ];
    
    // Construct rows
    const csvRows = [headers.join(",")];
    
    newcomersData.forEach(item => {
        const row = [
            escapeCsvValue(item.fullName || ''),
            escapeCsvValue(item.visitDate || ''),
            escapeCsvValue(item.email || ''),
            escapeCsvValue(item.phone || ''),
            item.membership ? "YES" : "NO",
            item.baptism ? "YES" : "NO",
            item.group ? "YES" : "NO",
            item.prayer ? "YES" : "NO",
            escapeCsvValue(item.prayerRequest || ''),
            escapeCsvValue(item.adminNotes || ''),
            escapeCsvValue(item.createdAt || '')
        ];
        csvRows.push(row.join(","));
    });
    
    // Trigger file download
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.href = url;
    link.download = `kingdom_connect_newcomers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function escapeCsvValue(val) {
    const stringVal = String(val);
    // Escape quotes and wrap values containing quotes, commas, or newlines
    if (stringVal.includes('"') || stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('\r')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
}

// --- Utility Functions ---
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- Session & Authentication Engine ---
function checkSessionAuth() {
    const isFirebaseEnabledSetting = localStorage.getItem('kj_firebase_enabled') === 'true';
    const savedConfig = localStorage.getItem('kj_firebase_config');
    
    // Check local session
    const currentUser = sessionStorage.getItem('kj_current_user');
    if (currentUser && USERS[currentUser]) {
        // User is logged in locally! Show the main app container.
        docElements.loginContainer.style.display = 'none';
        docElements.appContainer.style.display = 'flex';
        docElements.currentUserDisplay.textContent = currentUser;
        
        if (isFirebaseEnabledSetting && savedConfig) {
            initializeDatabaseConnection();
        } else {
            fallbackToLocalStorage();
        }
    } else {
        // Not logged in: show login screen
        docElements.loginContainer.style.display = 'flex';
        docElements.appContainer.style.display = 'none';
    }
}

async function handleLoginSubmit() {
    const usernameInput = docElements.loginUsername.value.trim();
    const password = docElements.loginPassword.value;
    
    // --- LOCAL AUTHENTICATION ---
    if (USERS[usernameInput] && USERS[usernameInput] === password) {
        sessionStorage.setItem('kj_current_user', usernameInput);
        docElements.loginErrorMsg.style.display = 'none';
        docElements.loginForm.reset();
        
        // Transition to main dashboard
        docElements.loginContainer.style.display = 'none';
        docElements.appContainer.style.display = 'flex';
        docElements.currentUserDisplay.textContent = usernameInput;
        
        // Load database configuration
        const isFirebaseEnabledSetting = localStorage.getItem('kj_firebase_enabled') === 'true';
        const savedConfig = localStorage.getItem('kj_firebase_config');
        if (isFirebaseEnabledSetting && savedConfig) {
            initializeDatabaseConnection();
        } else {
            fallbackToLocalStorage();
        }
    } else {
        docElements.loginErrorMsg.textContent = "Invalid username or password.";
        docElements.loginErrorMsg.style.display = 'flex';
        docElements.loginPassword.value = '';
        docElements.loginPassword.focus();
    }
}

async function handleLogout() {
    if (confirm("Are you sure you want to sign out?")) {
        sessionStorage.removeItem('kj_current_user');
        
        // Transition UI to login
        docElements.appContainer.style.display = 'none';
        docElements.loginContainer.style.display = 'flex';
        
        // Stop Firestore listener
        if (firebaseUnsubscribe) {
            firebaseUnsubscribe();
            firebaseUnsubscribe = null;
        }
    }
}
