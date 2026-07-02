import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env) ? (import.meta.env.VITE_SUPABASE_URL || '') : '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env) ? (import.meta.env.VITE_SUPABASE_ANON_KEY || '') : '';

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Supabase client creation failed:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  
  // Register Service Worker for PWA installation
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered with scope:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  }

  // PWA Install Button Logic — targets ALL .pwa-install-btn elements across pages
  let deferredPrompt = null;
  const allInstallBtns = document.querySelectorAll('.pwa-install-btn');

  // Detect if already running as installed PWA (standalone mode)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  function showInstallButtons() {
    if (!isStandalone) {
      allInstallBtns.forEach(btn => btn.classList.remove('hide'));
    }
  }

  function hideInstallButtons() {
    allInstallBtns.forEach(btn => btn.classList.add('hide'));
  }

  // Listen for the browser's install prompt (Chrome, Edge, Samsung Internet)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
    console.log('[PWA] beforeinstallprompt fired — install button shown');
  });

  // Attach click handler to every install button
  allInstallBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        // Browser supports native install prompt
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User response to install prompt:', outcome);
        deferredPrompt = null;
        if (outcome === 'accepted') {
          hideInstallButtons();
        }
      } else {
        // Fallback for browsers without beforeinstallprompt (e.g. iOS Safari)
        // Show instructions
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          alert('To install this app on your iPhone/iPad:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
        } else {
          alert('To install this app:\n\n• On Chrome/Edge: Look for the install icon in the address bar\n• On Firefox: This browser may not support PWA installation\n• On Safari: Use "Add to Home Screen" from the share menu');
        }
      }
    });
  });

  // Hide all buttons when app is installed
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;
    hideInstallButtons();
  });

  // Fallback: If beforeinstallprompt doesn't fire within 3 seconds
  // and we're NOT in standalone mode, show the button anyway.
  // This covers iOS Safari and other browsers that don't fire the event.
  if (!isStandalone) {
    setTimeout(() => {
      if (!deferredPrompt) {
        console.log('[PWA] beforeinstallprompt not fired — showing install button as fallback');
        showInstallButtons();
      }
    }, 3000);
  } else {
    // Already installed — keep buttons hidden
    hideInstallButtons();
  }
  
  // --- 1. Seed Data Definition ---
  // Events are sorted chronologically. Each event has a unified income pool.
  const SEED_DATA = {
    events: [
      {
        id: 'evt-1',
        name: 'IT Day',
        date: '2026-06-12',
        status: 'Active',
        initialBalance: 5000.00,
        students: 150,
        fee: 50.00,
        membership: 0,
        sanctions: 0,
        semester: '1',
        schoolYear: '2025-2026'
      },
      {
        id: 'evt-2',
        name: 'Indigay',
        date: '2026-06-20',
        status: 'Active',
        initialBalance: 0,
        students: 0,
        fee: 0,
        membership: 12000.00,
        sanctions: 1500.00,
        semester: '2',
        schoolYear: '2025-2026'
      },
      {
        id: 'evt-3',
        name: 'Buwan ng Wika',
        date: '2026-07-01',
        status: 'Active',
        initialBalance: 0,
        students: 0,
        fee: 0,
        membership: 15000.00,
        sanctions: 2500.00,
        semester: '1',
        schoolYear: '2025-2026'
      }
    ],
    expenses: {
      'evt-1': [
        {
          id: 'exp-1',
          date: '2026-06-12',
          description: 'Sound System Rental',
          unit: 'Pc',
          quantity: 1,
          unitCost: 1500.00,
          amount: 1500.00,
          receiptUrl: 'assets/receipt_hotel.png'
        },
        {
          id: 'exp-2',
          date: '2026-06-12',
          description: 'Food & Refreshments',
          unit: 'Pax',
          quantity: 32,
          unitCost: 100.00,
          amount: 3200.00,
          receiptUrl: 'assets/receipt_dinner.png'
        },
        {
          id: 'exp-3',
          date: '2026-06-12',
          description: 'Tarpaulin & Printing',
          unit: 'Pc',
          quantity: 1,
          unitCost: 850.00,
          amount: 850.00,
          receiptUrl: 'assets/receipt_taxi.png'
        }
      ],
      'evt-2': [
        {
          id: 'exp-4',
          date: '2026-06-20',
          description: 'Stage Decorations',
          unit: 'Lot',
          quantity: 1,
          unitCost: 2500.00,
          amount: 2500.00,
          receiptUrl: 'assets/receipt_hotel.png'
        }
      ],
      'evt-3': [
        {
          id: 'exp-5',
          date: '2026-07-01',
          description: 'Venue Booking Deposit',
          unit: 'Lot',
          quantity: 1,
          unitCost: 5000.00,
          amount: 5000.00,
          receiptUrl: 'assets/receipt_dinner.png'
        }
      ]
    }
  };

  // --- 2. State Management Configuration ---
  let appState = {
    currentUser: null,
    events: [],
    expenses: {},
    activeEventId: null,
    // Computed balances per event (keyed by event id)
    computedBalances: {},
    filters: {
      category: 'all',
      sort: 'date-asc',
      search: '',
      semester: 'all',
      schoolYear: 'all'
    },
    lightbox: {
      zoomScale: 1.0,
      panX: 0,
      panY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      currentExpenseId: null,
      currentEventId: null
    },
    attachedReceiptBase64: null,
    profileAvatarPendingBase64: null,
    pendingProjectPhotoBase64: null
  };

  let appAccounts = null;

  // --- 3. Database Layer (Supabase Wrapper) ---
  async function initDatabase() {
    if (!supabase) {
      alert('Configuration Error: Supabase credentials are missing or invalid.\n\nPlease add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the .env file in the project directory, then restart the Vite server.');
      // Show setup page as fallback
      el.authView.classList.remove('active-view');
      el.dashboardView.classList.remove('active-view');
      el.setupView.classList.add('active-view');
      return;
    }
    try {
      // 1. Fetch Accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*');
      
      if (accountsError) throw accountsError;
      
      if (accountsData && accountsData.length > 0) {
        appAccounts = {};
        accountsData.forEach(acc => {
          appAccounts[acc.role] = {
            email: acc.email,
            password: acc.password,
            name: acc.name,
            avatarUrl: acc.avatar_url
          };
        });
      } else {
        appAccounts = null;
      }

      // 2. Fetch Events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });
      
      if (eventsError) throw eventsError;

      // 3. Fetch Expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');
      
      if (expensesError) throw expensesError;

      if (eventsData && eventsData.length > 0) {
        appState.events = eventsData.map(evt => ({
          id: evt.id,
          name: evt.name,
          date: evt.date,
          status: evt.status,
          initialBalance: parseFloat(evt.initial_balance || 0),
          students: parseInt(evt.students || 0),
          fee: parseFloat(evt.fee || 0),
          membership: parseFloat(evt.membership || 0),
          sanctions: parseFloat(evt.sanctions || 0),
          photoUrl: evt.photo_url,
          semester: evt.semester || null,
          schoolYear: evt.school_year || null
        }));

        appState.expenses = {};
        (expensesData || []).forEach(exp => {
          if (!appState.expenses[exp.event_id]) {
            appState.expenses[exp.event_id] = [];
          }
          appState.expenses[exp.event_id].push({
            id: exp.id,
            date: exp.date,
            description: exp.description,
            unit: exp.unit,
            quantity: parseFloat(exp.quantity || 1),
            unitCost: parseFloat(exp.unit_cost || 0),
            amount: parseFloat(exp.amount || 0),
            receiptUrl: exp.receipt_url
          });
        });
      } else {
        await restoreSeeds();
      }

      sortEventsChronologically();
      computeAllBalances();
    } catch (e) {
      console.error('Error initializing Supabase database:', e);
      // Fallback local structures if DB query fails completely on connection error
      appState.events = [];
      appState.expenses = {};
    }
  }
  
  // Helper to update database tables (e.g., accounts)
  async function setDBValue(table, data) {
    // data is an object where keys are roles (e.g., 'auditor', 'secretary')
    const entries = Object.entries(data);
    const promises = entries.map(([role, acc]) => {
      const payload = {
        role,
        email: acc.email,
        password: acc.password,
        name: acc.name,
        avatar_url: acc.avatarUrl
      };
      return supabase.from(table).upsert(payload);
    });
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length) {
      console.error('Error updating', table, errors);
      throw errors[0].error;
    }
  }

  async function restoreSeeds() {
    appState.events = JSON.parse(JSON.stringify(SEED_DATA.events));
    appState.expenses = JSON.parse(JSON.stringify(SEED_DATA.expenses));
    
    // Save seeds to Supabase
    try {
      const dbEvents = appState.events.map(evt => ({
        id: evt.id,
        name: evt.name,
        date: evt.date,
        status: evt.status,
        initial_balance: evt.initialBalance,
        students: evt.students,
        fee: evt.fee,
        membership: evt.membership,
        sanctions: evt.sanctions,
        photo_url: evt.photoUrl || null
      }));
      
      const { error: evtError } = await supabase.from('events').insert(dbEvents);
      if (evtError) throw evtError;

      const dbExpenses = [];
      Object.keys(appState.expenses).forEach(eventId => {
        appState.expenses[eventId].forEach(exp => {
          dbExpenses.push({
            id: exp.id,
            event_id: eventId,
            date: exp.date,
            description: exp.description,
            unit: exp.unit,
            quantity: exp.quantity,
            unit_cost: exp.unitCost,
            amount: exp.amount,
            receipt_url: exp.receiptUrl
          });
        });
      });

      if (dbExpenses.length > 0) {
        const { error: expError } = await supabase.from('expenses').insert(dbExpenses);
        if (expError) throw expError;
      }
    } catch (err) {
      console.error('Error seeding database', err);
    }
  }

  // --- 4. Chronological Sorting ---
  function sortEventsChronologically() {
    appState.events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // --- 5. Cascading Balance Computation ---
  function computeAllBalances() {
    sortEventsChronologically();
    let carryOver = 0;

    appState.events.forEach((evt, index) => {
      const prevBalance = index === 0 ? evt.initialBalance : carryOver;
      const studentCollection = (evt.students || 0) * (evt.fee || 0);
      const membershipTotal = evt.membership || 0;
      const sanctionsTotal = evt.sanctions || 0;
      const totalPool = prevBalance + studentCollection + membershipTotal + sanctionsTotal;

      const expensesList = appState.expenses[evt.id] || [];
      const totalExpenses = expensesList.reduce((sum, item) => sum + item.amount, 0);
      const netRemaining = totalPool - totalExpenses;

      appState.computedBalances[evt.id] = {
        previousBalance: prevBalance,
        studentCollection,
        membershipTotal,
        sanctionsTotal,
        totalPool,
        totalExpenses,
        netRemaining,
        expenseCount: expensesList.length
      };

      // Carry over the net remaining to the next event
      carryOver = netRemaining;
    });
  }

  // --- 6. DOM Elements ---
  const el = {
    // Setup View
    setupView: document.getElementById('setup-view'),
    setupForm: document.getElementById('setup-form'),
    setupAuditorName: document.getElementById('setup-auditor-name'),
    setupAuditorEmail: document.getElementById('setup-auditor-email'),
    setupAuditorPassword: document.getElementById('setup-auditor-password'),
    setupSecretaryName: document.getElementById('setup-secretary-name'),
    setupSecretaryEmail: document.getElementById('setup-secretary-email'),
    setupSecretaryPassword: document.getElementById('setup-secretary-password'),

    // Auth View
    authView: document.getElementById('auth-view'),
    loginForm: document.getElementById('login-form'),
    usernameInput: document.getElementById('username'),
    passwordInput: document.getElementById('password'),
    btnLogin: document.getElementById('btn-login'),
    btnStudentBypass: document.getElementById('btn-student-bypass'),
    
    // Main View
    dashboardView: document.getElementById('dashboard-view'),
    userProfileBadge: document.querySelector('.user-profile-badge'),
    userDisplayName: document.getElementById('user-display-name'),
    userDisplayRole: document.getElementById('user-display-role'),
    userAvatar: document.getElementById('user-avatar'),
    btnLogout: document.getElementById('btn-logout'),
    
    // Profile Modal Elements
    profileModal: document.getElementById('profile-modal'),
    btnCloseProfileModal: document.getElementById('btn-close-profile-modal'),
    btnCancelProfile: document.getElementById('btn-cancel-profile'),
    btnCloseStudentProfile: document.getElementById('btn-close-student-profile'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileAvatarContainer: document.getElementById('profile-avatar-container'),
    profileAvatarInput: document.getElementById('profile-avatar-input'),
    profileNameLabel: document.getElementById('profile-name-label'),
    profileRoleBadge: document.getElementById('profile-role-badge'),
    profileEmailLabel: document.getElementById('profile-email-label'),
    adminProfileSettings: document.getElementById('admin-profile-settings'),
    studentProfileInfo: document.getElementById('student-profile-info'),
    profileUpdateForm: document.getElementById('profile-update-form'),
    profileNewName: document.getElementById('profile-new-name'),
    profileNewEmail: document.getElementById('profile-new-email'),
    profileNewPassword: document.getElementById('profile-new-password'),
    profileCurrentPassword: document.getElementById('profile-current-password'),
    studentNameForm: document.getElementById('student-name-form'),
    studentNameInput: document.getElementById('student-name-input'),
    
    // Sidebar
    eventCount: document.getElementById('event-count'),
    eventSearch: document.getElementById('event-search'),
    eventList: document.getElementById('event-list'),
    btnOverallDashboard: document.getElementById('btn-overall-dashboard'),
    navOverallBalance: document.getElementById('nav-overall-balance'),
    
    // Filters
    filterSemester: document.getElementById('filter-semester'),
    filterSchoolYear: document.getElementById('filter-school-year'),
    
    // Main Panel (Details)
    btnBackToProjects: document.getElementById('btn-back-to-projects'),
    detailEmptyState: document.getElementById('detail-empty-state'),
    detailContent: document.getElementById('detail-content'),
    overallDashboardView: document.getElementById('overall-dashboard-view'),
    overallNetBalance: document.getElementById('overall-net-balance'),
    
    // Project Summary Card
    projectName: document.getElementById('detail-project-name'),
    projectDate: document.getElementById('detail-project-date'),
    projectStatus: document.getElementById('detail-project-status'),
    
    // Double-Column Finance Elements
    valPreviousBalance: document.getElementById('val-previous-balance'),
    inputStudents: document.getElementById('input-students'),
    inputFee: document.getElementById('input-fee'),
    valStudentSubtotal: document.getElementById('val-student-subtotal'),
    inputMembership: document.getElementById('input-membership'),
    inputSanctions: document.getElementById('input-sanctions'),
    valTotalPool: document.getElementById('val-total-pool'),
    valStartingPool: document.getElementById('val-starting-pool'),
    valTotalExpenses: document.getElementById('val-total-expenses'),
    valExpenseCount: document.getElementById('val-expense-count'),
    valNetRemaining: document.getElementById('val-net-remaining'),
    statProgress: document.getElementById('stat-budget-progress'),
    statPercentage: document.getElementById('stat-budget-percentage'),
    
    // Expense List & Filters
    expenseCount: document.getElementById('expense-count'),
    sortSelect: document.getElementById('expense-sort'),
    expenseRows: document.getElementById('expense-rows'),
    expenseEmpty: document.getElementById('expense-empty-state'),
    btnAddExpenseFab: document.getElementById('btn-add-expense-fab'),
    btnExportPdf: document.getElementById('btn-export-pdf'),
    
    // Upload Modal
    uploadModal: document.getElementById('upload-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    addExpenseForm: document.getElementById('add-expense-form'),
    expDate: document.getElementById('exp-date'),
    expUnit: document.getElementById('exp-unit'),
    expDescription: document.getElementById('exp-description'),
    expQuantity: document.getElementById('exp-quantity'),
    expUnitCost: document.getElementById('exp-unit-cost'),
    expAmountDisplay: document.getElementById('exp-amount-display'),
    receiptFileInput: document.getElementById('receipt-file-input'),
    mediaDropzone: document.getElementById('media-dropzone'),
    btnSimulateCamera: document.getElementById('btn-simulate-camera'),
    mediaPreviewContainer: document.getElementById('media-preview-container'),
    mediaPreviewImage: document.getElementById('media-preview-image'),
    previewFilename: document.getElementById('preview-filename'),
    previewFilesize: document.getElementById('preview-filesize'),
    btnRemoveMedia: document.getElementById('btn-remove-media'),
    uploadProgressWrapper: document.getElementById('upload-progress-wrapper'),
    uploadProgressBar: document.getElementById('upload-progress-bar'),
    uploadProgressPercent: document.getElementById('upload-progress-percent'),
    btnSubmitExpense: document.getElementById('btn-submit-expense'),
    
    // Lightbox
    lightboxModal: document.getElementById('lightbox-modal'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxImgWrapper: document.getElementById('lightbox-img-wrapper'),
    lightboxViewport: document.getElementById('lightbox-viewport'),
    lightboxTitle: document.getElementById('lightbox-receipt-title'),
    btnZoomIn: document.getElementById('btn-zoom-in'),
    btnZoomOut: document.getElementById('btn-zoom-out'),
    btnZoomReset: document.getElementById('btn-zoom-reset'),
    btnCloseLightbox: document.getElementById('btn-close-lightbox'),
    btnEditReceipt: document.getElementById('btn-edit-receipt'),
    receiptEditInput: document.getElementById('receipt-edit-input'),

    // Project Management Modal
    btnAddProject: document.getElementById('btn-add-project'),
    projectModal: document.getElementById('project-modal'),
    btnCloseProjectModal: document.getElementById('btn-close-project-modal'),
    btnCancelProject: document.getElementById('btn-cancel-project'),
    projectForm: document.getElementById('project-form'),
    projectModalTitle: document.getElementById('project-modal-title'),
    projectIdHidden: document.getElementById('project-id-hidden'),
    projectNameInput: document.getElementById('project-name-input'),
    projectDateInput: document.getElementById('project-date-input'),
    projectStatusInput: document.getElementById('project-status-input'),
    projectInitialBalance: document.getElementById('project-initial-balance'),
    projectStudents: document.getElementById('project-students'),
    projectFee: document.getElementById('project-fee'),
    projectMembership: document.getElementById('project-membership'),
    projectSanctions: document.getElementById('project-sanctions'),
    eventSemesterInput: document.getElementById('event-semester'),
    eventSchoolYearInput: document.getElementById('event-school-year'),
    
    // Event Photo Elements
    eventPhotoPanel: document.getElementById('event-photo-panel'),
    eventPhotoImg: document.getElementById('event-photo-img'),
    btnViewEventPhoto: document.getElementById('btn-view-event-photo'),
    eventPhotoCaptionText: document.getElementById('event-photo-caption-text'),
    financialColumns: document.querySelector('.financial-columns'),
    
    // Project Modal Photo Upload
    projectPhotoInput: document.getElementById('project-photo-input'),
    projectPhotoPlaceholder: document.getElementById('project-photo-placeholder'),
    projectPhotoPreview: document.getElementById('project-photo-preview'),
    projectPhotoPreviewImg: document.getElementById('project-photo-preview-img'),
    projectPhotoChange: document.getElementById('project-photo-change'),
    projectPhotoClear: document.getElementById('project-photo-clear')
  };

  // --- 7. Authentication & Session Manager ---
  function login(email, role, name) {
    let avatarBase64 = null;
    let displayName = name;
    
    if (appAccounts && (role === 'auditor' || role === 'secretary')) {
      const acc = appAccounts[role];
      if (acc) {
        avatarBase64 = acc.avatarUrl || null;
        displayName = acc.name || name;
      }
    }
    
    appState.currentUser = { email, role, name: displayName, avatarUrl: avatarBase64 };
    
    el.userDisplayName.textContent = displayName;
    el.userDisplayRole.textContent = role;
    
    if (avatarBase64) {
      el.userAvatar.innerHTML = `<img src="${avatarBase64}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      el.userAvatar.innerHTML = `<span style="font-family: var(--font-display);">${displayName.charAt(0)}</span>`;
    }
    
    if (role === 'auditor') {
      el.userDisplayRole.className = 'user-role-badge badge-auditor';
    } else if (role === 'secretary') {
      el.userDisplayRole.className = 'user-role-badge badge-secretary';
    } else {
      el.userDisplayRole.className = 'user-role-badge badge-student';
    }
    
    updateUIPermissions();
    
    el.authView.classList.remove('active-view');
    el.dashboardView.classList.add('active-view');
    
    if (!appState.activeEventId && appState.events.length > 0) {
      selectEvent('overall');
    } else {
      renderEventList();
    }
    
    sessionStorage.setItem('aegis_session', JSON.stringify(appState.currentUser));
  }

  function checkSetupStatus() {
    if (!appAccounts) {
      el.authView.classList.remove('active-view');
      el.dashboardView.classList.remove('active-view');
      el.setupView.classList.add('active-view');
      return false;
    }
    el.setupView.classList.remove('active-view');
    return true;
  }

  function logout() {
    appState.currentUser = null;
    appState.activeEventId = null;
    sessionStorage.removeItem('aegis_session');
    
    el.dashboardView.classList.remove('active-view');
    if (checkSetupStatus()) {
      el.authView.classList.add('active-view');
    }
    el.loginForm.reset();
  }

  function checkExistingSession() {
    if (!checkSetupStatus()) return;
    const cachedSession = sessionStorage.getItem('aegis_session');
    if (cachedSession) {
      try {
        const u = JSON.parse(cachedSession);
        login(u.email, u.role, u.name);
      } catch (e) {
        logout();
      }
    }
  }

  function updateUIPermissions() {
    const hasWriteAccess = appState.currentUser && (appState.currentUser.role === 'auditor' || appState.currentUser.role === 'secretary');
    
    if (hasWriteAccess) {
      el.btnAddExpenseFab.classList.remove('hide');
      el.btnAddProject.classList.remove('hide');
    } else {
      el.btnAddExpenseFab.classList.add('hide');
      el.btnAddProject.classList.add('hide');
    }
    
    // Toggle inline input editability
    setInlineInputsEditable(hasWriteAccess);
    
    if (appState.activeEventId) {
      renderExpenseList();
    }
  }

  function setInlineInputsEditable(editable) {
    const inputs = [el.inputStudents, el.inputFee, el.inputMembership, el.inputSanctions];
    inputs.forEach(input => {
      if (editable) {
        input.removeAttribute('readonly');
      } else {
        input.setAttribute('readonly', 'readonly');
      }
    });
  }

  // --- 8. Event List Rendering (Sidebar) ---
  function renderEventList() {
    const searchQuery = appState.filters.search.toLowerCase();
    const filteredEvents = appState.events.filter(evt => {
      const matchesSearch = evt.name.toLowerCase().includes(searchQuery);
      const matchesSemester = appState.filters.semester === 'all' || (evt.semester && evt.semester === appState.filters.semester);
      const matchesYear = appState.filters.schoolYear === 'all' || (evt.schoolYear && evt.schoolYear === appState.filters.schoolYear);
      return matchesSearch && matchesSemester && matchesYear;
    });
    
    // Update live overall balance badge at the top of the sidebar
    const lastEvent = appState.events[appState.events.length - 1];
    if (lastEvent) {
      const bal = appState.computedBalances[lastEvent.id] || {};
      el.navOverallBalance.textContent = `₱${formatMoney(bal.netRemaining || 0)}`;
    }
    
    // Toggle active styling on overall nav button
    if (appState.activeEventId === 'overall') {
      el.btnOverallDashboard.classList.add('active-overall');
    } else {
      el.btnOverallDashboard.classList.remove('active-overall');
    }
    
    el.eventCount.textContent = filteredEvents.length;
    el.eventList.innerHTML = '';
    
    if (filteredEvents.length === 0) {
      el.eventList.innerHTML = `
        <div class="expense-empty-state" style="padding: 30px 10px;">
          <i class="fa-solid fa-folder-closed"></i>
          <p>No active events found.</p>
        </div>
      `;
      return;
    }
    
    const hasWriteAccess = appState.currentUser && (appState.currentUser.role === 'auditor' || appState.currentUser.role === 'secretary');

    filteredEvents.forEach(evt => {
      const bal = appState.computedBalances[evt.id] || {};
      const isActive = evt.id === appState.activeEventId;
      const statusClass = evt.status === 'Active' ? 'status-active' : 'status-closed';
      
      const card = document.createElement('div');
      card.className = `event-card ${isActive ? 'active-card' : ''}`;
      card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title">${escapeHTML(evt.name)}</div>
          <span class="badge-status ${statusClass}">${evt.status}</span>
        </div>
        <div class="card-meta">
          <i class="fa-regular fa-calendar"></i>
          <span>${formatDateString(evt.date)}</span>
        </div>
        <div class="card-amount-row">
          <div>
            <div class="amount-label">Pool / Remaining</div>
          </div>
          <div class="amount-value">
            <span class="text-budget">₱${formatMoney(bal.totalPool || 0)}</span>
            <span style="color: var(--text-muted); font-size: 0.75rem;"> / ₱${formatMoney(bal.netRemaining || 0)}</span>
          </div>
        </div>
        ${hasWriteAccess ? `
        <div class="card-actions-row" style="display: flex; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-glass);">
          <button class="btn-card-edit" data-id="${evt.id}" title="Edit Project" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 8px; border-radius: var(--radius-sm); border: 1px solid rgba(249,115,22,0.3); background: rgba(249,115,22,0.08); color: var(--primary); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: background 0.2s;">
            <i class="fa-regular fa-pen-to-square"></i> Edit
          </button>
          <button class="btn-card-delete" data-id="${evt.id}" title="Delete Project" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 7px 8px; border-radius: var(--radius-sm); border: 1px solid var(--danger-border); background: var(--danger-bg); color: var(--danger); font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: background 0.2s;">
            <i class="fa-regular fa-trash-can"></i> Delete
          </button>
        </div>
        ` : ''}
      `;
      
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-card-edit') || e.target.closest('.btn-card-delete')) return;
        selectEvent(evt.id);
      });

      if (hasWriteAccess) {
        card.querySelector('.btn-card-edit').addEventListener('click', (e) => {
          e.stopPropagation();
          openProjectModal('edit', evt.id);
        });
        card.querySelector('.btn-card-delete').addEventListener('click', (e) => {
          e.stopPropagation();
          deleteEvent(evt.id);
        });
      }

      el.eventList.appendChild(card);
    });
  }

  // --- 9. Event Selection & Detail Panel ---
  function selectEvent(eventId) {
    appState.activeEventId = eventId;
    
    renderEventList();
    
    const dbGrid = document.querySelector('.dashboard-grid');
    if (dbGrid) {
      dbGrid.classList.add('show-detail');
    }
    
    if (eventId === 'overall') {
      el.detailEmptyState.classList.add('hide');
      el.detailContent.classList.add('hide');
      el.overallDashboardView.classList.remove('hide');
      
      const lastEvent = appState.events[appState.events.length - 1];
      if (lastEvent) {
        const bal = appState.computedBalances[lastEvent.id] || {};
        el.overallNetBalance.textContent = `₱${formatMoney(bal.netRemaining || 0)}`;
        
        // Dynamic color for overall remaining balance
        if (bal.netRemaining < 0) {
          el.overallNetBalance.classList.add('negative');
        } else {
          el.overallNetBalance.classList.remove('negative');
        }
      }
      return;
    }
    
    el.overallDashboardView.classList.add('hide');
    el.detailEmptyState.classList.add('hide');
    el.detailContent.classList.remove('hide');
    
    const event = appState.events.find(evt => evt.id === eventId);
    if (!event) return;
    
    // Update Header Card
    el.projectName.textContent = event.name;
    el.projectDate.textContent = formatDateString(event.date);
    el.projectStatus.textContent = event.status;
    el.projectStatus.className = `badge-status-pill ${event.status === 'Active' ? 'status-active' : 'status-closed'}`;
    
    // Populate inline inputs from event data
    el.inputStudents.value = event.students || 0;
    el.inputFee.value = event.fee || 0;
    el.inputMembership.value = event.membership || 0;
    el.inputSanctions.value = event.sanctions || 0;
    
    // Set inline input editability
    const hasWriteAccess = appState.currentUser && (appState.currentUser.role === 'auditor' || appState.currentUser.role === 'secretary');
    setInlineInputsEditable(hasWriteAccess);
    
    // Display computed values
    populateFinanceColumns(event.id);
    
    // Show/hide event photo panel
    if (event.photoUrl) {
      el.eventPhotoImg.src = event.photoUrl;
      el.eventPhotoPanel.classList.remove('hide');
      el.financialColumns.classList.add('has-photo');
      el.eventPhotoCaptionText.textContent = event.name + ' — Event Document';
    } else {
      el.eventPhotoPanel.classList.add('hide');
      el.financialColumns.classList.remove('has-photo');
    }
    
    // Render the expense records
    renderExpenseList();
  }

  function populateFinanceColumns(eventId) {
    const bal = appState.computedBalances[eventId];
    if (!bal) return;

    // Column A: Income Pool
    el.valPreviousBalance.textContent = `₱${formatMoney(bal.previousBalance)}`;
    el.valStudentSubtotal.textContent = `₱${formatMoney(bal.studentCollection)}`;
    el.valTotalPool.textContent = `₱${formatMoney(bal.totalPool)}`;

    // Column B: Deductions
    el.valStartingPool.textContent = `₱${formatMoney(bal.totalPool)}`;
    el.valTotalExpenses.textContent = `₱${formatMoney(bal.totalExpenses)}`;
    el.valExpenseCount.textContent = bal.expenseCount;
    el.valNetRemaining.textContent = `₱${formatMoney(Math.abs(bal.netRemaining))}`;

    // Color the net remaining value
    const netEl = el.valNetRemaining;
    if (bal.netRemaining < 0) {
      netEl.textContent = `-₱${formatMoney(Math.abs(bal.netRemaining))}`;
      netEl.classList.add('negative');
    } else {
      netEl.textContent = `₱${formatMoney(bal.netRemaining)}`;
      netEl.classList.remove('negative');
    }

    // Budget progress bar
    const progressPercent = bal.totalPool > 0 ? Math.min((bal.totalExpenses / bal.totalPool) * 100, 100) : 0;
    el.statProgress.style.width = '0%';
    setTimeout(() => {
      el.statProgress.style.width = `${progressPercent}%`;
      if (progressPercent >= 100) {
        el.statProgress.style.background = 'linear-gradient(90deg, var(--danger), var(--danger-border))';
      } else {
        el.statProgress.style.background = 'linear-gradient(90deg, var(--primary), var(--accent))';
      }
    }, 100);
    el.statPercentage.textContent = `${Math.round(progressPercent)}%`;
  }

  // Populate School Year filter options based on loaded events
  function populateSchoolYearFilter() {
    const select = el.filterSchoolYear;
    if (!select) return;
    // Clear existing options
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = 'all';
    defaultOption.textContent = 'All Years';
    select.appendChild(defaultOption);

    // Generate dynamic range based on current calendar year
    const currentCalendarYear = new Date().getFullYear();
    const pastSchoolYear = `${currentCalendarYear - 1}-${currentCalendarYear}`; // e.g. 2025-2026 if 2026
    const currentSchoolYear = `${currentCalendarYear}-${currentCalendarYear + 1}`; // e.g. 2026-2027
    const futureSchoolYear = `${currentCalendarYear + 1}-${currentCalendarYear + 2}`; // e.g. 2027-2028
    
    const yearsSet = new Set([pastSchoolYear, currentSchoolYear, futureSchoolYear]);
    
    // Also include any years existing in loaded events
    appState.events.forEach(evt => {
      if (evt.schoolYear) yearsSet.add(evt.schoolYear);
    });
    
    // Sort and append options
    const sortedYears = Array.from(yearsSet).sort();
    sortedYears.forEach(year => {
      const opt = document.createElement('option');
      opt.value = year;
      opt.textContent = year;
      select.appendChild(opt);
    });

    // Set default selected year
    select.value = pastSchoolYear;
  }

function populateYearDropdown(selectElement, selectedYear = null) {
  if (!selectElement) return;
  // Clear existing options
  while (selectElement.firstChild) {
    selectElement.removeChild(selectElement.firstChild);
  }
  // Add placeholder
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.textContent = 'Select Year';
  selectElement.appendChild(placeholder);

  const currentYear = new Date().getFullYear();
  const years = [
    `${currentYear - 1}-${currentYear}`,
    `${currentYear}-${currentYear + 1}`,
    `${currentYear + 1}-${currentYear + 2}`,
  ];
  years.forEach(year => {
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    if (year === selectedYear) opt.selected = true;
    selectElement.appendChild(opt);
  });
  // If no selection provided, keep placeholder selected
  if (!selectedYear) selectElement.value = '';
}

function populateProjectSchoolYearSelect() {
  const select = el.eventSchoolYearInput;
  // Determine selected year if editing a project
  let selected = null;
  if (select && select.dataset && select.dataset.selected) {
    selected = select.dataset.selected;
  }
  populateYearDropdown(select, selected);
}

  // --- 10. Inline Input Change Handlers (Auditor Trigger) ---
  async function handleInlineInputChange() {
    const eventId = appState.activeEventId === 'overall'
      ? appState.events[appState.events.length - 1].id
      : appState.activeEventId;
    if (!eventId) return;

    const event = appState.events.find(evt => evt.id === eventId);
    if (!event) return;

    // Read values from inputs
    event.students = parseInt(el.inputStudents.value) || 0;
    event.fee = parseFloat(el.inputFee.value) || 0;
    event.membership = parseFloat(el.inputMembership.value) || 0;
    event.sanctions = parseFloat(el.inputSanctions.value) || 0;

    // Recompute all balances (cascade)
    computeAllBalances();
    
    // Save inline changes to Supabase
    try {
      await supabase
        .from('events')
        .update({
          students: event.students,
          fee: event.fee,
          membership: event.membership,
          sanctions: event.sanctions
        })
        .eq('id', eventId);
    } catch (e) {
      console.error('Error updating event details in Supabase', e);
    }

    // Refresh UI
    populateFinanceColumns(eventId);
    renderEventList();
  }

  // Wire inline input events
  [el.inputStudents, el.inputFee, el.inputMembership, el.inputSanctions].forEach(input => {
    input.addEventListener('input', handleInlineInputChange);
  });

  // --- 11. Expense List Rendering ---
  function renderExpenseList() {
    const eventId = appState.activeEventId === 'overall'
      ? appState.events[appState.events.length - 1].id
      : appState.activeEventId;
    if (!eventId) return;
    
    const expensesList = appState.expenses[eventId] || [];
    
    // Sort only (no category filter)
    const activeSort = el.sortSelect.value;
    let filtered = [...expensesList];
    filtered.sort((a, b) => {
      if (activeSort === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (activeSort === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (activeSort === 'amount-desc') return b.amount - a.amount;
      if (activeSort === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
    
    el.expenseCount.textContent = filtered.length;
    el.expenseRows.innerHTML = '';
    
    if (filtered.length === 0) {
      el.expenseEmpty.classList.remove('hide');
      el.expenseRows.parentElement.classList.add('hide');
      return;
    }
    
    el.expenseEmpty.classList.add('hide');
    el.expenseRows.parentElement.classList.remove('hide');
    
    const hasWriteAccess = appState.currentUser && (appState.currentUser.role === 'auditor' || appState.currentUser.role === 'secretary');
    
    const actionsHeader = document.querySelector('.actions-header');
    if (hasWriteAccess) {
      actionsHeader.classList.remove('hide');
    } else {
      actionsHeader.classList.add('hide');
    }
    
    filtered.forEach(exp => {
      const tr = document.createElement('tr');
      tr.className = 'animate-fade-in';
      tr.dataset.expId = exp.id;
      
      if (hasWriteAccess) {
        tr.innerHTML = `
          <td data-label="Date"><input type="date" class="table-input table-input-date" data-field="date" data-exp-id="${exp.id}" value="${exp.date}"></td>
          <td data-label="Description"><input type="text" class="table-input" data-field="description" data-exp-id="${exp.id}" value="${escapeAttr(exp.description)}"></td>
          <td data-label="Unit" class="text-center"><input type="text" class="table-input table-input-unit" data-field="unit" data-exp-id="${exp.id}" value="${escapeAttr(exp.unit || '')}"></td>
          <td data-label="Qty" class="text-right"><input type="number" class="table-input table-input-num" data-field="quantity" data-exp-id="${exp.id}" value="${exp.quantity || 1}" min="0" step="any"></td>
          <td data-label="Unit Cost" class="text-right"><input type="number" class="table-input table-input-num" data-field="unitCost" data-exp-id="${exp.id}" value="${exp.unitCost || 0}" min="0" step="0.01"></td>
          <td data-label="Amount" class="text-right font-display amount-cell" id="amount-${exp.id}" style="font-weight: 700; color: var(--text-primary);">₱${formatMoney(exp.amount)}</td>
          <td data-label="Receipt" class="text-center">
            <div style="position: relative; display: inline-block;">
              <button class="receipt-thumbnail-btn" title="Inspect Receipt">
                <div class="thumbnail-wrapper">
                  <img src="${exp.receiptUrl}" alt="Receipt">
                  <div class="thumbnail-hover-overlay"><i class="fa-solid fa-magnifying-glass"></i></div>
                </div>
              </button>
              <button class="btn-edit-row-receipt" data-exp-id="${exp.id}" title="Change Receipt">
                <i class="fa-solid fa-pen"></i>
              </button>
            </div>
          </td>
          <td data-label="Actions" class="text-center actions-cell">
            <button class="btn btn-icon btn-row-action btn-delete-expense" title="Remove Record">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </td>
        `;
        
        // Inline edit: fire on change (blur + value changed)
        tr.querySelectorAll('.table-input').forEach(input => {
          input.addEventListener('change', () => {
            handleInlineExpenseEdit(exp.id, input.dataset.field, input.value);
          });
        });
        
        tr.querySelector('.btn-delete-expense').addEventListener('click', () => {
          deleteExpenseRecord(exp.id);
        });
        
        tr.querySelector('.btn-edit-row-receipt')?.addEventListener('click', (e) => {
          e.stopPropagation();
          appState.lightbox.currentExpenseId = exp.id;
          appState.lightbox.currentEventId = eventId;
          if (el.receiptEditInput) {
            el.receiptEditInput.value = '';
            el.receiptEditInput.click();
          }
        });
        
      } else {
        tr.innerHTML = `
          <td data-label="Date" style="font-weight: 500;">${exp.date}</td>
          <td data-label="Description" style="color: var(--text-primary); font-weight: 600;">${escapeHTML(exp.description)}</td>
          <td data-label="Unit" class="text-center">
            <span class="unit-badge">${escapeHTML(exp.unit || '')}</span>
          </td>
          <td data-label="Qty" class="text-right">${exp.quantity || 1}</td>
          <td data-label="Unit Cost" class="text-right">₱${formatMoney(exp.unitCost || 0)}</td>
          <td data-label="Amount" class="text-right font-display" style="font-weight: 700; color: var(--text-primary);">₱${formatMoney(exp.amount)}</td>
          <td data-label="Receipt" class="text-center">
            <button class="receipt-thumbnail-btn" title="Inspect Receipt">
              <div class="thumbnail-wrapper">
                <img src="${exp.receiptUrl}" alt="Receipt">
                <div class="thumbnail-hover-overlay"><i class="fa-solid fa-magnifying-glass"></i></div>
              </div>
            </button>
          </td>
          <td data-label="Actions" class="text-center actions-cell hide"></td>
        `;
      }
      
      tr.querySelector('.receipt-thumbnail-btn').addEventListener('click', () => {
        openLightbox(exp.description, exp.receiptUrl, exp.id, eventId);
      });
      
      el.expenseRows.appendChild(tr);
    });
  }

  // --- 11b. Inline Expense Row Edit Handler ---
  async function handleInlineExpenseEdit(expenseId, field, value) {
    const eventId = appState.activeEventId === 'overall'
      ? appState.events[appState.events.length - 1].id
      : appState.activeEventId;
    if (!eventId) return;
    
    const expenseList = appState.expenses[eventId] || [];
    const expense = expenseList.find(e => e.id === expenseId);
    if (!expense) return;
    
    if (field === 'quantity') {
      expense.quantity = parseFloat(value) || 0;
      expense.amount = expense.quantity * (expense.unitCost || 0);
    } else if (field === 'unitCost') {
      expense.unitCost = parseFloat(value) || 0;
      expense.amount = (expense.quantity || 0) * expense.unitCost;
    } else if (field === 'date') {
      expense.date = value;
    } else if (field === 'description') {
      expense.description = value;
    } else if (field === 'unit') {
      expense.unit = value;
    }
    
    // Update only the amount cell — no full re-render (preserves focus)
    const amountCell = document.getElementById(`amount-${expenseId}`);
    if (amountCell) amountCell.textContent = `₱${formatMoney(expense.amount)}`;
    
    // Cascade recalculation
    computeAllBalances();
    
    // Save to Supabase
    try {
      await supabase
        .from('expenses')
        .update({
          date: expense.date,
          description: expense.description,
          unit: expense.unit,
          quantity: expense.quantity,
          unit_cost: expense.unitCost,
          amount: expense.amount
        })
        .eq('id', expenseId);
    } catch (e) {
      console.error('Error updating expense in Supabase', e);
    }

    populateFinanceColumns(eventId);
    renderEventList();
  }

  // --- 12. Lightbox Preview Engine ---
  function openLightbox(title, imgUrl, expenseId, eventId) {
    appState.lightbox.zoomScale = 1.0;
    appState.lightbox.panX = 0;
    appState.lightbox.panY = 0;
    appState.lightbox.currentExpenseId = expenseId || null;
    appState.lightbox.currentEventId = eventId || null;
    
    el.lightboxTitle.textContent = title;
    el.lightboxImg.src = imgUrl;
    
    // Show/hide edit button based on whether this is an expense receipt and user has write access
    const hasWriteAccess = appState.currentUser && (appState.currentUser.role === 'auditor' || appState.currentUser.role === 'secretary');
    if (el.btnEditReceipt) {
      el.btnEditReceipt.style.display = (expenseId && hasWriteAccess) ? 'inline-flex' : 'none';
    }
    
    updateLightboxTransform();
    
    document.body.style.overflow = 'hidden';
    el.lightboxModal.classList.add('active-lightbox');
    
    const instr = document.querySelector('.lightbox-instruction');
    instr.style.animation = 'none';
    void instr.offsetWidth;
    instr.style.animation = 'fadeOutInstruction 4s forwards';
  }

  function closeLightbox() {
    el.lightboxModal.classList.remove('active-lightbox');
    document.body.style.overflow = '';
  }

  function updateLightboxTransform() {
    const scale = appState.lightbox.zoomScale;
    const x = appState.lightbox.panX;
    const y = appState.lightbox.panY;
    el.lightboxImgWrapper.style.transform = `scale(${scale}) translate(${x}px, ${y}px)`;
  }

  el.btnZoomIn.addEventListener('click', () => {
    appState.lightbox.zoomScale = Math.min(appState.lightbox.zoomScale + 0.25, 3.0);
    updateLightboxTransform();
  });

  el.btnZoomOut.addEventListener('click', () => {
    appState.lightbox.zoomScale = Math.max(appState.lightbox.zoomScale - 0.25, 0.5);
    updateLightboxTransform();
  });

  el.btnZoomReset.addEventListener('click', () => {
    appState.lightbox.zoomScale = 1.0;
    appState.lightbox.panX = 0;
    appState.lightbox.panY = 0;
    updateLightboxTransform();
  });

  el.lightboxViewport.addEventListener('mousedown', (e) => {
    appState.lightbox.isDragging = true;
    appState.lightbox.startX = e.clientX - appState.lightbox.panX * appState.lightbox.zoomScale;
    appState.lightbox.startY = e.clientY - appState.lightbox.panY * appState.lightbox.zoomScale;
  });

  window.addEventListener('mousemove', (e) => {
    if (!appState.lightbox.isDragging) return;
    e.preventDefault();
    const scale = appState.lightbox.zoomScale;
    appState.lightbox.panX = (e.clientX - appState.lightbox.startX) / scale;
    appState.lightbox.panY = (e.clientY - appState.lightbox.startY) / scale;
    updateLightboxTransform();
  });

  window.addEventListener('mouseup', () => {
    appState.lightbox.isDragging = false;
  });

  window.addEventListener('keydown', (e) => {
    if (el.lightboxModal.classList.contains('active-lightbox')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === '=' || e.key === '+') el.btnZoomIn.click();
      if (e.key === '-') el.btnZoomOut.click();
      if (e.key === '0') el.btnZoomReset.click();
    }
  });

  // --- 12b. Edit Receipt in Lightbox ---
  if (el.btnEditReceipt) {
    el.btnEditReceipt.addEventListener('click', () => {
      if (el.receiptEditInput) {
        el.receiptEditInput.value = ''; // reset so same file can be re-selected
        el.receiptEditInput.click();
      }
    });
  }

  if (el.receiptEditInput) {
    el.receiptEditInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const newBase64 = reader.result;

        // 1. Update the lightbox image immediately
        el.lightboxImg.src = newBase64;

        // 2. Update the expense record in appState
        const expId = appState.lightbox.currentExpenseId;
        const evtId = appState.lightbox.currentEventId;
        if (expId && evtId) {
          const expenseList = appState.expenses[evtId] || [];
          const expense = expenseList.find(exp => exp.id === expId);
          if (expense) {
            expense.receiptUrl = newBase64;

            // 3. Persist to Supabase
            try {
              await supabase
                .from('expenses')
                .update({ receipt_url: newBase64 })
                .eq('id', expId);
            } catch (err) {
              console.error('Error updating receipt in Supabase:', err);
            }

            // 4. Re-render expense list so the thumbnail updates
            renderExpenseList();
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // --- 13a. Project CRUD (Add / Edit / Delete Audit Projects) ---
  function openProjectModal(mode = 'add', eventId = null) {
    el.projectForm.reset();
    el.projectIdHidden.value = '';
    appState.pendingProjectPhotoBase64 = null;
    
    // Reset photo uploader UI
    el.projectPhotoPlaceholder.classList.remove('hide');
    el.projectPhotoPreview.classList.add('hide');

    // Populate project school year dropdown
    populateProjectSchoolYearSelect();

    if (mode === 'edit' && eventId) {
      const event = appState.events.find(e => e.id === eventId);
      if (!event) return;
      el.projectModalTitle.textContent = 'Edit Audit Project';
      el.projectIdHidden.value = event.id;
      el.projectNameInput.value = event.name;
      el.projectDateInput.value = event.date;
      el.projectStatusInput.value = event.status;
      el.projectInitialBalance.value = event.initialBalance || 0;
      el.projectStudents.value = event.students || 0;
      el.projectFee.value = event.fee || 0;
      el.projectMembership.value = event.membership || 0;
      el.projectSanctions.value = event.sanctions || 0;
      if (el.eventSemesterInput) el.eventSemesterInput.value = event.semester || '1';
      if (el.eventSchoolYearInput) el.eventSchoolYearInput.value = event.schoolYear || '2025-2026';
      
      // Show existing photo if present
      if (event.photoUrl) {
        appState.pendingProjectPhotoBase64 = event.photoUrl;
        el.projectPhotoPreviewImg.src = event.photoUrl;
        el.projectPhotoPlaceholder.classList.add('hide');
        el.projectPhotoPreview.classList.remove('hide');
      }
    } else {
      el.projectModalTitle.textContent = 'New Audit Project';
      el.projectDateInput.value = new Date().toISOString().split('T')[0];
      el.projectInitialBalance.value = 0;
      el.projectStudents.value = 0;
      el.projectFee.value = 0;
      el.projectMembership.value = 0;
      el.projectSanctions.value = 0;
      if (el.eventSemesterInput) el.eventSemesterInput.value = '1';
      if (el.eventSchoolYearInput) el.eventSchoolYearInput.value = '2025-2026';
    }

    el.projectModal.classList.add('active-modal');
  }

  function closeProjectModal() {
    el.projectModal.classList.remove('active-modal');
  }

  async function handleProjectFormSubmit(e) {
    e.preventDefault();

    const id = el.projectIdHidden.value;
    const name = el.projectNameInput.value.trim();
    const date = el.projectDateInput.value;
    const status = el.projectStatusInput.value;
    const initialBalance = parseFloat(el.projectInitialBalance.value) || 0;
    const students = parseInt(el.projectStudents.value) || 0;
    const fee = parseFloat(el.projectFee.value) || 0;
    const membership = parseFloat(el.projectMembership.value) || 0;
    const sanctions = parseFloat(el.projectSanctions.value) || 0;
    const semester = el.eventSemesterInput ? el.eventSemesterInput.value : '1';
    const schoolYear = el.eventSchoolYearInput ? el.eventSchoolYearInput.value : '2025-2026';

    let targetEvent = null;

    if (id) {
      // Edit existing project
      const event = appState.events.find(e => e.id === id);
      if (!event) return;
      event.name = name;
      event.date = date;
      event.status = status;
      event.initialBalance = initialBalance;
      event.students = students;
      event.fee = fee;
      event.membership = membership;
      event.sanctions = sanctions;
      event.semester = semester;
      event.schoolYear = schoolYear;
      
      // Save photo (base64 or null)
      if (appState.pendingProjectPhotoBase64) {
        event.photoUrl = appState.pendingProjectPhotoBase64;
      } else if (appState.pendingProjectPhotoBase64 === null && !el.projectPhotoPreview.classList.contains('hide')) {
        // Keep existing photo
      } else {
        event.photoUrl = null;
      }
      targetEvent = event;
    } else {
      // Create new project
      const newEvent = {
        id: 'evt-' + Date.now(),
        name,
        date,
        status,
        initialBalance,
        students,
        fee,
        membership,
        sanctions,
        semester,
        schoolYear,
        photoUrl: appState.pendingProjectPhotoBase64 || null
      };
      appState.events.push(newEvent);
      appState.expenses[newEvent.id] = [];
      targetEvent = newEvent;
    }

    sortEventsChronologically();
    computeAllBalances();
    
    // Save project changes to Supabase
    try {
      const dbEvent = {
        id: targetEvent.id,
        name: targetEvent.name,
        date: targetEvent.date,
        status: targetEvent.status,
        initial_balance: targetEvent.initialBalance,
        students: targetEvent.students,
        fee: targetEvent.fee,
        membership: targetEvent.membership,
        sanctions: targetEvent.sanctions,
        photo_url: targetEvent.photoUrl,
        semester: targetEvent.semester,
        school_year: targetEvent.schoolYear
      };
      await supabase.from('events').upsert(dbEvent);
    } catch (err) {
      console.error('Error saving event to Supabase', err);
    }
    
    renderEventList();

    // If editing the currently viewed project, refresh the detail panel
    if (id && appState.activeEventId === id) {
      selectEvent(id);
    }

    closeProjectModal();
  }

  async function deleteEvent(eventId) {
    const event = appState.events.find(e => e.id === eventId);
    if (!event) return;

    const expCount = (appState.expenses[eventId] || []).length;
    const confirmMsg = expCount > 0
      ? `Permanently delete "${event.name}"?\n\n⚠ This will also delete ${expCount} expense record(s). This cannot be undone.`
      : `Permanently delete "${event.name}"? This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    appState.events = appState.events.filter(e => e.id !== eventId);
    delete appState.expenses[eventId];

    // Navigate away if the deleted project was active
    if (appState.activeEventId === eventId) {
      if (appState.events.length > 0) {
        selectEvent('overall');
      } else {
        appState.activeEventId = null;
        el.detailContent.classList.add('hide');
        el.overallDashboardView.classList.add('hide');
        el.detailEmptyState.classList.remove('hide');
      }
    }

    computeAllBalances();
    
    // Delete event in Supabase (cascades to expenses)
    try {
      await supabase.from('events').delete().eq('id', eventId);
    } catch (err) {
      console.error('Error deleting event from Supabase', err);
    }

    renderEventList();
  }

  // --- 13. Auditor Upload Flow & Asset Commit ---
  function openUploadModal() {
    appState.attachedReceiptBase64 = null;
    el.addExpenseForm.reset();
    
    const today = new Date().toISOString().split('T')[0];
    el.expDate.value = today;
    
    resetMediaUploader();
    el.uploadModal.classList.add('active-modal');
  }

  function closeUploadModal() {
    el.uploadModal.classList.remove('active-modal');
  }

  // --- 13b. Profile Settings Modal Flow ---
  function openProfileModal() {
    if (!appState.currentUser) return;
    
    const role = appState.currentUser.role;
    const email = appState.currentUser.email;
    const name = appState.currentUser.name;
    const avatar = appState.currentUser.avatarUrl;
    
    appState.profileAvatarPendingBase64 = null;
    
    // Set Header/Avatar details
    el.profileNameLabel.textContent = name;
    el.profileEmailLabel.textContent = email;
    
    if (avatar) {
      el.profileAvatar.innerHTML = `<img src="${avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    } else {
      el.profileAvatar.innerHTML = `<span style="font-family: var(--font-display);">${name.charAt(0)}</span>`;
    }
    
    // Set role badge styling
    el.profileRoleBadge.textContent = role;
    if (role === 'auditor') {
      el.profileRoleBadge.className = 'user-role-badge badge-auditor';
    } else if (role === 'secretary') {
      el.profileRoleBadge.className = 'user-role-badge badge-secretary';
    } else {
      el.profileRoleBadge.className = 'user-role-badge badge-student';
    }
    
    // Toggle contents
    // If student, pre-fill their current name in the name input
    if (role === 'student') {
      el.adminProfileSettings.classList.add('hide');
      el.studentProfileInfo.classList.remove('hide');
      el.studentNameInput.value = name;
    } else {
      el.studentProfileInfo.classList.add('hide');
      el.adminProfileSettings.classList.remove('hide');
      el.profileUpdateForm.reset();
    }
    
    el.profileModal.classList.add('active-modal');
  }

  function closeProfileModal() {
    el.profileModal.classList.remove('active-modal');
  }

  function handleProfileUpdate(e) {
    e.preventDefault();
    const currentPassword = el.profileCurrentPassword.value;
    const newName = el.profileNewName.value.trim();
    const newEmail = el.profileNewEmail.value.trim();
    const newPassword = el.profileNewPassword.value;
    const newAvatar = appState.profileAvatarPendingBase64;
    
    if (!appAccounts) return;
    
    const role = appState.currentUser.role;
    const currentAccount = appAccounts[role];
    
    // Verify password
    if (currentPassword !== currentAccount.password) {
      alert('Security validation failed: The current password you entered is incorrect.');
      return;
    }
    
    // Apply updates
    let updated = false;
    if (newName) {
      currentAccount.name = newName;
      appState.currentUser.name = newName;
      updated = true;
    }

    if (newEmail) {
      // Validate that it doesn't conflict with the other account's email
      const otherRole = role === 'auditor' ? 'secretary' : 'auditor';
      if (newEmail === appAccounts[otherRole].email) {
        alert('Validation failed: That email address is already registered to the other administrative account.');
        return;
      }
      currentAccount.email = newEmail;
      appState.currentUser.email = newEmail;
      updated = true;
    }
    
    if (newPassword) {
      currentAccount.password = newPassword;
      updated = true;
    }

    if (newAvatar) {
      currentAccount.avatarUrl = newAvatar;
      appState.currentUser.avatarUrl = newAvatar;
      updated = true;
    }
    
    if (updated) {
      console.log('Updating accounts in Supabase', appAccounts);
      setDBValue('accounts', appAccounts)
        .then(() => {
          sessionStorage.setItem('aegis_session', JSON.stringify(appState.currentUser));
          // Update all UI displays
          el.userDisplayName.textContent = appState.currentUser.name;
          el.profileNameLabel.textContent = appState.currentUser.name;
          el.profileEmailLabel.textContent = appState.currentUser.email;

          if (appState.currentUser.avatarUrl) {
            el.userAvatar.innerHTML = `<img src="${appState.currentUser.avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            el.profileAvatar.innerHTML = `<img src="${appState.currentUser.avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          } else {
            el.userAvatar.innerHTML = `<span style="font-family: var(--font-display);">${appState.currentUser.name.charAt(0)}</span>`;
            el.profileAvatar.innerHTML = `<span style="font-family: var(--font-display);">${appState.currentUser.name.charAt(0)}</span>`;
          }
          alert('Profile successfully updated!');
          closeProfileModal();
        })
        .catch(err => {
          console.error('Error updating accounts with setDBValue', err);
          alert('Failed to save profile changes. Please try again.');
        });
    } else {
      alert('No updates specified. Please fill in at least one field to update.');
    }
  }

  function resetMediaUploader() {
    el.mediaDropzone.classList.remove('hide');
    el.mediaPreviewContainer.classList.add('hide');
    el.uploadProgressWrapper.classList.add('hide');
    el.btnSubmitExpense.disabled = false;
    el.btnCancelModal.disabled = false;
    el.btnCloseModal.style.pointerEvents = 'auto';
  }

  function handleFileSelection(file) {
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Security violation: Audit documentation assets must be valid image files (JPG, PNG).');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('File size limit exceeded: Receipts must be smaller than 5MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      appState.attachedReceiptBase64 = e.target.result;
      el.mediaPreviewImage.src = e.target.result;
      el.previewFilename.textContent = file.name;
      el.previewFilesize.textContent = formatBytes(file.size);
      el.mediaDropzone.classList.add('hide');
      el.mediaPreviewContainer.classList.remove('hide');
    };
    reader.readAsDataURL(file);
  }

  function simulateCameraCapture() {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 550;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 400, 550);
    
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 380, 530);
    
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px Outfit';
    ctx.fillText('CAMERA SNAPSHOT', 200, 50);
    
    ctx.font = '14px Inter';
    ctx.fillStyle = '#64748b';
    ctx.fillText('AUDIT VAULT LOG', 200, 75);
    ctx.fillText('--------------------------------------', 200, 95);
    
    ctx.fillStyle = '#0f172a';
    ctx.font = '15px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('DATE: ' + new Date().toLocaleDateString(), 40, 130);
    ctx.fillText('ID: ' + Math.random().toString(36).substr(2, 9).toUpperCase(), 40, 155);
    ctx.fillText('STATUS: VERIFIED BY AUDITOR', 40, 180);
    ctx.fillText('====================================', 40, 210);
    
    const desc = el.expDescription.value || 'Audit Item Expense';
    const amountVal = parseFloat(el.expAmount.value) || 0.0;
    
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(desc.substring(0, 20).toUpperCase(), 40, 240);
    ctx.textAlign = 'right';
    ctx.fillText('₱' + formatMoney(amountVal), 360, 240);
    
    ctx.textAlign = 'left';
    ctx.fillText('SUBTOTAL:', 40, 350);
    ctx.font = 'bold 18px Courier New';
    ctx.fillText('TOTAL DUE:', 40, 415);
    
    ctx.textAlign = 'right';
    ctx.font = '16px Courier New';
    ctx.fillText('₱' + formatMoney(amountVal), 360, 350);
    ctx.font = 'bold 18px Courier New';
    ctx.fillText('₱' + formatMoney(amountVal), 360, 415);
    
    ctx.textAlign = 'center';
    ctx.font = '12px Inter';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Secured upload verified: Alex Carter', 200, 490);
    ctx.fillText('Powered by Audit System', 200, 510);
    
    const imgData = canvas.toDataURL('image/png');
    appState.attachedReceiptBase64 = imgData;
    
    el.mediaPreviewImage.src = imgData;
    el.previewFilename.textContent = 'camera_capture_signed.png';
    el.previewFilesize.textContent = '125 KB';
    
    el.mediaDropzone.classList.add('hide');
    el.mediaPreviewContainer.classList.remove('hide');
  }

  function commitExpenseRecord(e) {
    e.preventDefault();
    
    const eventId = appState.activeEventId === 'overall'
      ? appState.events[appState.events.length - 1].id
      : appState.activeEventId;
    if (!eventId) return;
    
    const dateVal = el.expDate.value;
    const unitVal = el.expUnit.value.trim();
    const descVal = el.expDescription.value.trim();
    const quantityVal = parseQuantity(el.expQuantity.value);
    const unitCostVal = parseFloat(el.expUnitCost.value) || 0;
    const amountVal = quantityVal * unitCostVal;
    
    if (quantityVal <= 0 || isNaN(quantityVal)) {
      alert('Validation Error: Quantity must be a valid positive number or fraction (e.g., 1, 1/2, 1/4, 1.5, 1 1/2).');
      return;
    }
    
    if (!appState.attachedReceiptBase64) {
      alert('Security violation: A receipt image is required to pass audit compliance.');
      return;
    }
    
    el.btnSubmitExpense.disabled = true;
    el.btnCancelModal.disabled = true;
    el.btnCloseModal.style.pointerEvents = 'none';
    el.uploadProgressWrapper.classList.remove('hide');
    
    let progress = 0;
    el.uploadProgressBar.style.width = '0%';
    el.uploadProgressPercent.textContent = '0%';
    
    const interval = setInterval(async () => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        const newExpense = {
          id: 'exp-' + Date.now(),
          date: dateVal,
          description: descVal,
          unit: unitVal,
          quantity: quantityVal,
          unitCost: unitCostVal,
          amount: amountVal,
          receiptUrl: appState.attachedReceiptBase64
        };
        
        if (!appState.expenses[eventId]) {
          appState.expenses[eventId] = [];
        }
        appState.expenses[eventId].push(newExpense);
        
        // Recompute cascading balances
        computeAllBalances();
        
        // Save new expense to Supabase
        try {
          const dbExpense = {
            id: newExpense.id,
            event_id: eventId,
            date: newExpense.date,
            description: newExpense.description,
            unit: newExpense.unit,
            quantity: newExpense.quantity,
            unit_cost: newExpense.unitCost,
            amount: newExpense.amount,
            receipt_url: newExpense.receiptUrl
          };
          await supabase.from('expenses').insert(dbExpense);
        } catch (err) {
          console.error('Error inserting expense into Supabase', err);
        }
        
        setTimeout(() => {
          closeUploadModal();
          populateFinanceColumns(eventId);
          renderExpenseList();
          renderEventList();
          alert('Asset Registered: Record has been committed to the secure ledger.');
        }, 300);
      }
      
      el.uploadProgressBar.style.width = progress + '%';
      el.uploadProgressPercent.textContent = progress + '%';
    }, 100);
  }

  async function deleteExpenseRecord(expenseId) {
    const eventId = appState.activeEventId === 'overall'
      ? appState.events[appState.events.length - 1].id
      : appState.activeEventId;
    if (!eventId) return;
    
    const confirmDelete = confirm('Verify signature: Are you sure you want to permanently purge this auditing record?');
    if (!confirmDelete) return;
    
    const list = appState.expenses[eventId] || [];
    appState.expenses[eventId] = list.filter(item => item.id !== expenseId);
    
    computeAllBalances();
    
    // Delete in Supabase
    try {
      await supabase.from('expenses').delete().eq('id', expenseId);
    } catch (err) {
      console.error('Error deleting expense in Supabase', err);
    }
    
    populateFinanceColumns(eventId);
    renderExpenseList();
    renderEventList();
  }

  // --- 14. PDF Document Compiler & Exporter ---
  function exportAuditReportToPDF() {
    const eventId = appState.activeEventId === 'overall'
      ? appState.events[appState.events.length - 1].id
      : appState.activeEventId;
    if (!eventId) return;
    
    const event = appState.events.find(e => e.id === eventId);
    if (!event) return;
    
    const bal = appState.computedBalances[eventId];
    const expensesList = appState.expenses[eventId] || [];
    
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.top = '-9999px';
    printContainer.style.left = '-9999px';
    printContainer.style.width = '800px';
    printContainer.style.padding = '40px';
    printContainer.style.backgroundColor = '#ffffff';
    printContainer.style.color = '#000000';
    printContainer.style.fontFamily = "'Inter', sans-serif";
    
    let rowsHtml = '';
    expensesList.forEach(exp => {
      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-size: 12px;">${exp.date}</td>
          <td style="padding: 10px 12px; font-weight: 600; font-size: 12px;">${escapeHTML(exp.description)}</td>
          <td style="padding: 10px 12px; font-size: 12px; text-align: center;">${escapeHTML(exp.unit || '')}</td>
          <td style="padding: 10px 12px; font-size: 12px; text-align: right;">${exp.quantity || 1}</td>
          <td style="padding: 10px 12px; font-size: 12px; text-align: right;">&#8369;${formatMoney(exp.unitCost || 0)}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: bold; font-size: 12px;">&#8369;${formatMoney(exp.amount)}</td>
        </tr>
      `;
    });
    
    printContainer.innerHTML = `
      <!-- Report Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h1 style="font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; margin: 0; color: #0f172a; letter-spacing: -0.5px;">AUDIT REPORT</h1>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Secure Ledger Verification & Compliance Report</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: bold; color: #0f172a;">REPORT ID: AR-${Math.floor(100000 + Math.random() * 900000)}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Generated: ${new Date().toLocaleString()}</div>
        </div>
      </div>
      
      <!-- Project Metadata -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">EVENT</div>
          <div style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px;">${escapeHTML(event.name)}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${formatDateString(event.date)}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">VERIFIED AUDITOR</div>
          <div style="font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 4px;">${appState.currentUser.name}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Email: ${appState.currentUser.email}</div>
        </div>
      </div>
      
      <!-- Double Column Financial Summary -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px;">
        <!-- Income Pool -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; border-top: 3px solid #f97316;">
          <div style="font-size: 12px; font-weight: bold; color: #f97316; text-transform: uppercase; margin-bottom: 12px;">Income Pool</div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;"><span style="color: #64748b;">Previous Balance</span><span style="font-weight: bold;">₱${formatMoney(bal.previousBalance)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;"><span style="color: #64748b;">Student Collection (${event.students} × ₱${formatMoney(event.fee)})</span><span style="font-weight: bold;">₱${formatMoney(bal.studentCollection)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;"><span style="color: #64748b;">Membership Fees</span><span style="font-weight: bold;">₱${formatMoney(bal.membershipTotal)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;"><span style="color: #64748b;">Sanctions</span><span style="font-weight: bold;">₱${formatMoney(bal.sanctionsTotal)}</span></div>
          <div style="border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between;"><span style="font-weight: bold; font-size: 13px;">Total Pool</span><span style="font-weight: bold; font-size: 16px; color: #f97316;">₱${formatMoney(bal.totalPool)}</span></div>
        </div>
        <!-- Deductions -->
        <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; border-top: 3px solid #475569;">
          <div style="font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase; margin-bottom: 12px;">Deductions</div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;"><span style="color: #64748b;">Starting Pool</span><span style="font-weight: bold;">₱${formatMoney(bal.totalPool)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;"><span style="color: #64748b;">Total Expenses (${bal.expenseCount} records)</span><span style="font-weight: bold; color: #ef4444;">₱${formatMoney(bal.totalExpenses)}</span></div>
          <div style="border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between;"><span style="font-weight: bold; font-size: 13px;">Net Remaining</span><span style="font-weight: bold; font-size: 16px; color: ${bal.netRemaining >= 0 ? '#059669' : '#ef4444'};">₱${formatMoney(bal.netRemaining)}</span></div>
        </div>
      </div>
      
      <!-- Expense Ledger -->
      <h3 style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">COMPLIANCE TRANSACTION LEDGER</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; width: 105px;">Date</th>
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">Description</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; width: 60px;">Unit</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; width: 50px;">Qty</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; width: 100px;">Unit Cost</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      
      <!-- Report Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px;">
        <div>
          <div style="border-top: 1px solid #94a3b8; width: 220px; padding-top: 6px; font-size: 12px; font-weight: bold; color: #334155;">Auditor Signature</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${appState.currentUser.name} (Certified)</div>
        </div>
        <div style="text-align: right;">
          <div style="border-top: 1px solid #94a3b8; width: 220px; padding-top: 6px; font-size: 12px; font-weight: bold; color: #334155; display: inline-block;">Compliance Committee Approval</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Verification Status: SIGNED Ledger</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(printContainer);
    
    const opt = {
      margin: 15,
      filename: `Audit_Report_${event.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(printContainer).save().then(() => {
      printContainer.remove();
    }).catch(err => {
      console.error('PDF export failed', err);
      printContainer.remove();
      alert('Document generation failed. Please try again.');
    });
  }

  // --- 15. UI Interaction Listeners ---
  el.setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const auditorName = el.setupAuditorName.value.trim();
    const auditorEmail = el.setupAuditorEmail.value.trim();
    const auditorPassword = el.setupAuditorPassword.value;
    const secretaryName = el.setupSecretaryName.value.trim();
    const secretaryEmail = el.setupSecretaryEmail.value.trim();
    const secretaryPassword = el.setupSecretaryPassword.value;

    if (!auditorName || !secretaryName) {
      alert('Validation error: Please enter a full name for both accounts.');
      return;
    }

    if (auditorEmail === secretaryEmail) {
      alert('Security violation: Auditor and Secretary accounts must use different email addresses.');
      return;
    }

    const accounts = {
      auditor: { email: auditorEmail, password: auditorPassword, name: auditorName },
      secretary: { email: secretaryEmail, password: secretaryPassword, name: secretaryName }
    };

    appAccounts = accounts;
    const dbAccounts = [
      { role: 'auditor', email: accounts.auditor.email, password: accounts.auditor.password, name: accounts.auditor.name },
      { role: 'secretary', email: accounts.secretary.email, password: accounts.secretary.password, name: accounts.secretary.name }
    ];
    supabase.from('accounts').insert(dbAccounts).then(({ error }) => {
      if (error) throw error;
      alert('Security Ledger successfully initialized! You can now log in.');
      location.reload();
      
      // Switch to Login View
      el.setupView.classList.remove('active-view');
      el.authView.classList.add('active-view');
      el.setupForm.reset();
    }).catch(e => {
      console.error('Error saving accounts to database', e);
      alert(`Database error: Unable to complete setup.\n\nDetails: ${e.message || JSON.stringify(e)}`);
    });
  });

  el.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const email = el.usernameInput.value.trim();
      const password = el.passwordInput.value;
      
      if (!appAccounts) {
        alert('Error: System is not initialized. Please reload.');
        checkSetupStatus();
        return;
      }
      
      if (email === appAccounts.auditor.email && password === appAccounts.auditor.password) {
        login(appAccounts.auditor.email, 'auditor', appAccounts.auditor.name);
      } else if (email === appAccounts.secretary.email && password === appAccounts.secretary.password) {
        login(appAccounts.secretary.email, 'secretary', appAccounts.secretary.name);
      } else {
        alert('Access Denied: Invalid email address or password.');
      }
    } catch (err) {
      console.error('Error during login:', err);
      alert('Application Login Error: ' + err.message);
    }
  });

  el.btnStudentBypass.addEventListener('click', () => {
    login('student@school.edu', 'student', 'Student Guest');
  });

  // Password Visibility Toggle
  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetInput = document.getElementById(targetId);
      if (targetInput) {
        const isPassword = targetInput.type === 'password';
        targetInput.type = isPassword ? 'text' : 'password';
        
        // Update eye icon
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        }
      }
    });
  });

  el.btnLogout.addEventListener('click', logout);

  // Project modal listeners
  el.btnAddProject.addEventListener('click', () => openProjectModal('add'));
  el.btnCloseProjectModal.addEventListener('click', closeProjectModal);
  el.btnCancelProject.addEventListener('click', closeProjectModal);
  el.projectForm.addEventListener('submit', handleProjectFormSubmit);
  
  // Project photo upload listeners
  el.projectPhotoPlaceholder.addEventListener('click', () => el.projectPhotoInput.click());
  el.projectPhotoChange.addEventListener('click', (e) => {
    e.preventDefault();
    el.projectPhotoInput.click();
  });
  el.projectPhotoClear.addEventListener('click', (e) => {
    e.preventDefault();
    appState.pendingProjectPhotoBase64 = null;
    el.projectPhotoPreview.classList.add('hide');
    el.projectPhotoPlaceholder.classList.remove('hide');
    el.projectPhotoInput.value = '';
  });
  el.projectPhotoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Asset type mismatch: Event documents must be valid images (JPG, PNG).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size limit exceeded: Event photos must be smaller than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        appState.pendingProjectPhotoBase64 = evt.target.result;
        el.projectPhotoPreviewImg.src = evt.target.result;
        el.projectPhotoPlaceholder.classList.add('hide');
        el.projectPhotoPreview.classList.remove('hide');
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Event photo panel — View Full Size opens lightbox
  el.btnViewEventPhoto.addEventListener('click', () => {
    const event = appState.events.find(e => e.id === appState.activeEventId);
    if (event && event.photoUrl) {
      openLightbox(event.name + ' — Event Document', event.photoUrl);
    }
  });
  el.eventPhotoImg.addEventListener('click', () => {
    const event = appState.events.find(e => e.id === appState.activeEventId);
    if (event && event.photoUrl) {
      openLightbox(event.name + ' — Event Document', event.photoUrl);
    }
  });

  // Student name change
  el.studentNameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = el.studentNameInput.value.trim();
    if (!newName) {
      alert('Please enter a display name.');
      return;
    }
    appState.currentUser.name = newName;
    if (updated) {
      console.log('Updating accounts in Supabase', appAccounts);
      setDBValue('accounts', appAccounts)
        .then(() => {
          sessionStorage.setItem('aegis_session', JSON.stringify(appState.currentUser));
          // Update all UI displays
          el.userDisplayName.textContent = appState.currentUser.name;
          el.profileNameLabel.textContent = appState.currentUser.name;
          el.profileEmailLabel.textContent = appState.currentUser.email;

          if (appState.currentUser.avatarUrl) {
            el.userAvatar.innerHTML = `<img src="${appState.currentUser.avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            el.profileAvatar.innerHTML = `<img src="${appState.currentUser.avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          } else {
            el.userAvatar.innerHTML = `<span style="font-family: var(--font-display);">${appState.currentUser.name.charAt(0)}</span>`;
            el.profileAvatar.innerHTML = `<span style="font-family: var(--font-display);">${appState.currentUser.name.charAt(0)}</span>`;
          }
          alert('Profile successfully updated!');
          closeProfileModal();
        })
        .catch(err => {
          console.error('Error updating accounts with setDBValue', err);
          alert('Failed to save profile changes. Please try again.');
        });
    } else {
      sessionStorage.setItem('aegis_session', JSON.stringify(appState.currentUser));

      // Update all visible name displays
      el.userDisplayName.textContent = newName;
      el.profileNameLabel.textContent = newName;
      el.userAvatar.innerHTML = `<span style="font-family: var(--font-display);">${newName.charAt(0).toUpperCase()}</span>`;
      el.profileAvatar.innerHTML = `<span style="font-family: var(--font-display);">${newName.charAt(0).toUpperCase()}</span>`;

      closeProfileModal();
    }
  });

  el.btnOverallDashboard.addEventListener('click', () => {
    selectEvent('overall');
  });

  if (el.btnBackToProjects) {
    el.btnBackToProjects.addEventListener('click', () => {
      const dbGrid = document.querySelector('.dashboard-grid');
      if (dbGrid) {
        dbGrid.classList.remove('show-detail');
      }
    });
  }

  el.eventSearch.addEventListener('input', (e) => {
    appState.filters.search = e.target.value;
    renderEventList();
  });

  // Semester filter listener
  el.filterSemester.addEventListener('change', (e) => {
    appState.filters.semester = e.target.value;
    renderEventList();
  });

  // School year filter listener
  el.filterSchoolYear.addEventListener('change', (e) => {
    appState.filters.schoolYear = e.target.value;
    renderEventList();
  });

  el.sortSelect.addEventListener('change', renderExpenseList);

  // Auto-calculate total amount in modal from qty × unit cost
  function updateModalAmountDisplay() {
    const qty = parseQuantity(el.expQuantity.value);
    const cost = parseFloat(el.expUnitCost.value) || 0;
    el.expAmountDisplay.textContent = `₱${formatMoney(qty * cost)}`;
  }
  el.expQuantity.addEventListener('input', updateModalAmountDisplay);
  el.expUnitCost.addEventListener('input', updateModalAmountDisplay);

  el.btnAddExpenseFab.addEventListener('click', openUploadModal);
  
  el.btnCloseModal.addEventListener('click', closeUploadModal);
  el.btnCancelModal.addEventListener('click', closeUploadModal);
  el.btnCloseLightbox.addEventListener('click', closeLightbox);

  // Profile Modal listeners
  el.userProfileBadge.addEventListener('click', openProfileModal);
  el.btnCloseProfileModal.addEventListener('click', closeProfileModal);
  el.btnCancelProfile.addEventListener('click', closeProfileModal);
  el.btnCloseStudentProfile.addEventListener('click', closeProfileModal);
  el.profileUpdateForm.addEventListener('submit', handleProfileUpdate);

  if (el.profileAvatarContainer) {
    el.profileAvatarContainer.addEventListener('click', () => {
      if (appState.currentUser && appState.currentUser.role !== 'student') {
        el.profileAvatarInput.click();
      }
    });
  }

  if (el.profileAvatarInput) {
    el.profileAvatarInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
          alert('Asset type mismatch: Profile avatars must be valid images.');
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          alert('Asset size limit exceeded: Avatars must be smaller than 2MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          appState.profileAvatarPendingBase64 = event.target.result;
          el.profileAvatar.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  el.mediaDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.mediaDropzone.classList.add('dragover');
  });

  el.mediaDropzone.addEventListener('dragleave', () => {
    el.mediaDropzone.classList.remove('dragover');
  });

  el.mediaDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    el.mediaDropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  el.mediaDropzone.addEventListener('click', () => {
    el.receiptFileInput.click();
  });

  el.receiptFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  });

  el.btnRemoveMedia.addEventListener('click', () => {
    appState.attachedReceiptBase64 = null;
    resetMediaUploader();
  });

  el.btnSimulateCamera.addEventListener('click', simulateCameraCapture);
  el.addExpenseForm.addEventListener('submit', commitExpenseRecord);
  el.btnExportPdf.addEventListener('click', exportAuditReportToPDF);

  window.addEventListener('click', (e) => {
    if (e.target === el.uploadModal) {
      if (!el.btnSubmitExpense.disabled) closeUploadModal();
    }
    if (e.target === el.lightboxModal) {
      closeLightbox();
    }
    if (e.target === el.profileModal) {
      closeProfileModal();
    }
    if (e.target === el.projectModal) {
      closeProjectModal();
    }
  });

  // --- 16. Helper Formatting Utilities ---
  function formatMoney(amount) {
    return Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Parse quantity values supporting integers, floats, fractions (1/2), and mixed numbers (1 1/2)
  function parseQuantity(value) {
    if (!value) return 0;
    const str = String(value).trim();
    if (!str) return 0;

    // Handle mixed numbers like "1 1/2" or "1-1/2"
    const mixedParts = str.split(/[\s-]+/);
    if (mixedParts.length > 1) {
      let sum = 0;
      let hasVal = false;
      for (const part of mixedParts) {
        const val = parseQuantity(part);
        if (val > 0) {
          sum += val;
          hasVal = true;
        }
      }
      return hasVal ? sum : 0;
    }

    // Handle simple fractions like "1/2"
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 2) {
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) {
          return num / den;
        }
      }
    }

    // Fallback to standard float
    const val = parseFloat(str);
    return isNaN(val) ? 0 : val;
  }

  function escapeHTML(str) {
    return String(str || '').replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }

  function escapeAttr(str) {
    return String(str || '').replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
  }

  function formatDateString(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // --- 17. Application Initialization Bootloader ---
  initDatabase().then(() => {
    checkExistingSession();
    
    // Clear forms and prevent browser autofill/credentials prefill
    const clearAuthFields = () => {
      if (el.usernameInput) el.usernameInput.value = '';
      if (el.passwordInput) el.passwordInput.value = '';
      if (el.setupAuditorEmail) el.setupAuditorEmail.value = '';
      if (el.setupAuditorPassword) el.setupAuditorPassword.value = '';
      if (el.setupSecretaryEmail) el.setupSecretaryEmail.value = '';
      if (el.setupSecretaryPassword) el.setupSecretaryPassword.value = '';
    };
    
    clearAuthFields();
    setTimeout(clearAuthFields, 100);
    setTimeout(clearAuthFields, 300);

    // Pre-select the overall fund on boot
    if (appState.events.length > 0) {
      selectEvent('overall');
    }
    if (el.sortSelect) {
      el.sortSelect.value = appState.filters.sort;
    }
    // Populate the school year filter based on loaded events
    populateSchoolYearFilter();
  });
});
