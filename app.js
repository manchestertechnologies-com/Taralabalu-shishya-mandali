/* =====================================================
   CENSUS APP - Core Application Logic
   ===================================================== */

// ── CONSTANTS ──────────────────────────────────────────
const USER_OTP   = '123456';
const ADMIN_OTP  = '654321';
const STORAGE_KEY_HH  = 'census_households';
const STORAGE_KEY_ENUM = 'census_enumerators';

// ── STATE ──────────────────────────────────────────────
let currentRole  = 'user';   // 'user' | 'admin'
let currentPhone = '';
let memberCount  = 0;
let currentStep  = 1;
let householdsDB = [];       // all households (localStorage)
let enumeratorsDB = [];      // login history

// ── INIT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadDB();
  updateDate();
  runSplash();
});

function runSplash() {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    splash.style.transition = 'opacity 0.6s ease';
    splash.style.opacity    = '0';
    setTimeout(() => {
      splash.classList.add('hidden');
      document.getElementById('login-page').classList.remove('hidden');
    }, 600);
  }, 2600);
}

// ── LOCAL DB ───────────────────────────────────────────
function loadDB() {
  try {
    householdsDB  = JSON.parse(localStorage.getItem(STORAGE_KEY_HH))  || [];
    enumeratorsDB = JSON.parse(localStorage.getItem(STORAGE_KEY_ENUM)) || [];
  } catch(e) {
    householdsDB  = [];
    enumeratorsDB = [];
  }
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY_HH,   JSON.stringify(householdsDB));
  localStorage.setItem(STORAGE_KEY_ENUM,  JSON.stringify(enumeratorsDB));
}

// ── DATE HELPERS ───────────────────────────────────────
function updateDate() {
  const now   = new Date();
  const opts  = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str   = now.toLocaleDateString('en-IN', opts);
  const elems = ['current-date', 'admin-current-date'];
  elems.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `📅 ${str}`;
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatPhone(p) {
  return `+91 ${p.slice(0,5)} ${p.slice(5)}`;
}

// ── LOGIN FLOW ─────────────────────────────────────────
function selectRole(role) {
  currentRole = role;
  document.getElementById('btn-user-role').classList.toggle('active', role === 'user');
  document.getElementById('btn-admin-role').classList.toggle('active', role === 'admin');
}

function validatePhone() {
  const inp  = document.getElementById('phone-input');
  const btn  = document.getElementById('send-otp-btn');
  const err  = document.getElementById('phone-error');
  const val  = inp.value.replace(/\D/g, '');
  inp.value  = val;

  const valid = /^[6-9]\d{9}$/.test(val);
  btn.disabled = !valid;
  err.classList.toggle('hidden', valid || val.length < 10);
  if (valid || val.length === 0) err.classList.add('hidden');
}

function sendOTP() {
  const val = document.getElementById('phone-input').value;
  if (!/^[6-9]\d{9}$/.test(val)) return;

  currentPhone = val;
  document.getElementById('display-phone').textContent = formatPhone(val);

  const step1 = document.getElementById('phone-step');
  const step2 = document.getElementById('otp-step');
  step1.classList.remove('active');
  setTimeout(() => {
    step1.style.display = 'none';
    step2.style.display = 'block';
    setTimeout(() => step2.classList.add('active'), 10);
    document.getElementById('otp-0').focus();
  }, 200);

  showToast('OTP sent! Use: ' + (currentRole === 'admin' ? ADMIN_OTP : USER_OTP), 'info');
}

function goBackToPhone() {
  const step1 = document.getElementById('phone-step');
  const step2 = document.getElementById('otp-step');
  step2.classList.remove('active');
  setTimeout(() => {
    step2.style.display = 'none';
    step1.style.display = 'block';
    setTimeout(() => step1.classList.add('active'), 10);
    clearOTP();
  }, 200);
}

function otpInput(idx) {
  const inp = document.getElementById('otp-' + idx);
  inp.value = inp.value.replace(/\D/g,'').slice(-1);
  if (inp.value && idx < 5) {
    document.getElementById('otp-' + (idx+1)).focus();
  }
  if (inp.value) inp.classList.add('filled');
  else inp.classList.remove('filled');
}

function otpKeydown(e, idx) {
  if (e.key === 'Backspace' && !e.target.value && idx > 0) {
    const prev = document.getElementById('otp-' + (idx-1));
    prev.value = '';
    prev.classList.remove('filled');
    prev.focus();
  }
  if (e.key === 'Enter') verifyOTP();
}

function getEnteredOTP() {
  return [0,1,2,3,4,5].map(i => document.getElementById('otp-' + i).value).join('');
}

function clearOTP() {
  [0,1,2,3,4,5].forEach(i => {
    const el = document.getElementById('otp-' + i);
    el.value = '';
    el.classList.remove('filled');
  });
}

function verifyOTP() {
  const entered = getEnteredOTP();
  const correct = currentRole === 'admin' ? ADMIN_OTP : USER_OTP;

  if (entered.length < 6) {
    showToast('Please enter all 6 digits', 'error'); return;
  }

  const errEl = document.getElementById('otp-error');
  if (entered !== correct) {
    errEl.classList.remove('hidden');
    [0,1,2,3,4,5].forEach(i => {
      const el = document.getElementById('otp-' + i);
      el.style.borderColor = 'var(--danger)';
      el.style.background  = 'rgba(239,68,68,0.1)';
    });
    setTimeout(() => {
      [0,1,2,3,4,5].forEach(i => {
        const el = document.getElementById('otp-' + i);
        el.style.borderColor = '';
        el.style.background  = '';
      });
    }, 800);
    return;
  }

  errEl.classList.add('hidden');

  // Register enumerator
  if (currentRole === 'user') {
    const exists = enumeratorsDB.find(e => e.phone === currentPhone);
    if (!exists) {
      enumeratorsDB.push({
        phone: currentPhone,
        name : 'Enumerator',
        joinedAt: new Date().toISOString(),
        households: 0
      });
      saveDB();
    }
  }

  document.getElementById('login-page').classList.add('hidden');

  if (currentRole === 'admin') {
    initAdminDashboard();
    document.getElementById('admin-dashboard').classList.remove('hidden');
    showToast('Welcome, Administrator!', 'success');
  } else {
    initUserDashboard();
    document.getElementById('user-dashboard').classList.remove('hidden');
    showToast('Welcome back, Enumerator!', 'success');
  }
}

function resendOTP() {
  clearOTP();
  showToast('OTP resent! Use: ' + (currentRole === 'admin' ? ADMIN_OTP : USER_OTP), 'info');
  document.getElementById('otp-0').focus();
}

// ── USER DASHBOARD INIT ────────────────────────────────
function initUserDashboard() {
  const phone = formatPhone(currentPhone);
  const letter = currentPhone.slice(0, 1);

  setTextIfExists('sidebar-user-phone', phone);
  setTextIfExists('user-phone-display', 'Mobile: ' + phone);
  setTextIfExists('welcome-msg', getGreeting() + ', Enumerator!');
  setTextIfExists('profile-phone', phone);

  ['user-avatar-text','header-avatar-text','profile-avatar-letter'].forEach(id => {
    setTextIfExists(id, letter);
  });

  const myHH = getMyHouseholds();
  const myMembers = myHH.reduce((s, h) => s + 1 + (h.members ? h.members.length : 0), 0);
  const today = new Date().toDateString();
  const todayEntries = myHH.filter(h => new Date(h.createdAt).toDateString() === today).length;

  setTextIfExists('total-households', myHH.length);
  setTextIfExists('total-members', myMembers);
  setTextIfExists('today-entries', todayEntries);
  setTextIfExists('profile-households', myHH.length);
  setTextIfExists('profile-members', myMembers);

  renderRecentHouseholds();
  renderHouseholdsGrid();
  updateDate();
}

function getMyHouseholds() {
  return householdsDB.filter(h => h.enumeratorPhone === currentPhone);
}

// ── ADMIN DASHBOARD INIT ───────────────────────────────
function initAdminDashboard() {
  const phone = formatPhone(currentPhone);
  setTextIfExists('admin-phone-display', phone);

  const total = householdsDB.length;
  const totalMembers = householdsDB.reduce((s, h) => s + 1 + (h.members ? h.members.length : 0), 0);
  const today = new Date().toDateString();
  const todayEntries = householdsDB.filter(h => new Date(h.createdAt).toDateString() === today).length;
  const enumCount = enumeratorsDB.length;

  setTextIfExists('admin-total-households', total);
  setTextIfExists('admin-total-members', totalMembers);
  setTextIfExists('admin-total-enumerators', enumCount);
  setTextIfExists('admin-today-entries', todayEntries);
  setTextIfExists('rpt-households', total);
  setTextIfExists('rpt-population', totalMembers);
  setTextIfExists('rpt-avg-size', total ? (totalMembers / total).toFixed(1) : '0');

  const states = new Set(householdsDB.map(h => h.head.state).filter(Boolean));
  setTextIfExists('rpt-states', states.size);

  renderAdminRecentList();
  renderAdminHouseholdsGrid();
  renderEnumeratorsList();
  updateDate();
}

// ── NAVIGATION ─────────────────────────────────────────
function showSection(id, clickedEl) {
  document.querySelectorAll('#user-dashboard .content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#user-dashboard .nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + id).classList.add('active');
  if (clickedEl) clickedEl.classList.add('active');

  const titles = {
    'dashboard-home': 'Dashboard',
    'my-households':  'My Households',
    'add-household':  'Add Household',
    'my-profile':     'My Profile'
  };
  setTextIfExists('page-title', titles[id] || id);

  if (id === 'add-household') resetWizard();
  if (id === 'my-households') renderHouseholdsGrid();
  if (window.innerWidth <= 900) closeSidebar();
}

function showAdminSection(id, clickedEl) {
  document.querySelectorAll('#admin-dashboard .content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#admin-sidebar .nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + id).classList.add('active');
  if (clickedEl) clickedEl.classList.add('active');

  const titles = {
    'admin-overview':     'Admin Overview',
    'admin-households':   'All Households',
    'admin-enumerators':  'Enumerators',
    'admin-reports':      'Reports'
  };
  setTextIfExists('admin-page-title', titles[id] || id);
  if (window.innerWidth <= 900) closeAdminSidebar();
}

// ── SIDEBAR ────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}
function toggleAdminSidebar() {
  document.getElementById('admin-sidebar').classList.toggle('open');
  document.getElementById('admin-sidebar-overlay').classList.toggle('show');
}
function closeAdminSidebar() {
  document.getElementById('admin-sidebar').classList.remove('open');
  document.getElementById('admin-sidebar-overlay').classList.remove('show');
}

// ── WIZARD ─────────────────────────────────────────────
function resetWizard() {
  currentStep = 1;
  memberCount = 0;
  [1,2,3,4].forEach(i => {
    document.getElementById('wcontent-' + i).classList.toggle('hidden', i !== 1);
    const ws = document.getElementById('wstep-' + i);
    ws.classList.remove('active','completed');
    if (i === 1) ws.classList.add('active');
  });
  document.getElementById('members-list').innerHTML = '';
  // Clear inputs
  ['head-name','head-dob','head-age','head-aadhaar','head-mobile',
   'head-occupation','head-trad-occupation','head-district','head-taluk',
   'head-nagara','head-ward','head-pincode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['head-gender','head-marital','head-education','head-employment','head-state'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.selectedIndex = 0;
  });
}

function nextStep(from) {
  if (from === 1 && !document.getElementById('head-name').value.trim()) {
    showToast('Please enter the head of household name', 'error'); return;
  }
  const cur = document.getElementById('wcontent-' + from);
  const nxt = document.getElementById('wcontent-' + (from+1));
  cur.classList.add('hidden');
  nxt.classList.remove('hidden');

  document.getElementById('wstep-' + from).classList.remove('active');
  document.getElementById('wstep-' + from).classList.add('completed');
  document.getElementById('wstep-' + (from+1)).classList.add('active');
  currentStep = from + 1;
}

function prevStep(from) {
  const cur = document.getElementById('wcontent-' + from);
  const prv = document.getElementById('wcontent-' + (from-1));
  cur.classList.add('hidden');
  prv.classList.remove('hidden');

  document.getElementById('wstep-' + from).classList.remove('active');
  document.getElementById('wstep-' + (from-1)).classList.remove('completed');
  document.getElementById('wstep-' + (from-1)).classList.add('active');
  currentStep = from - 1;
}

// ── MEMBER FORMS ───────────────────────────────────────
function addMemberForm() {
  memberCount++;
  const container = document.getElementById('members-list');
  const block = document.createElement('div');
  block.className = 'member-form-block';
  block.id = 'member-block-' + memberCount;
  block.innerHTML = `
    <div class="member-form-header">
      <h4>Member ${memberCount}</h4>
      <button class="member-remove-btn" onclick="removeMember(${memberCount})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Full Name *</label>
        <input type="text" class="form-input" id="m${memberCount}-name" placeholder="Enter full name">
      </div>
      <div class="form-group">
        <label class="form-label">Relationship to Head</label>
        <select class="form-select" id="m${memberCount}-relationship">
          <option value="">Select Relationship</option>
          <option>Spouse</option><option>Son</option><option>Daughter</option>
          <option>Father</option><option>Mother</option><option>Brother</option>
          <option>Sister</option><option>Grandfather</option><option>Grandmother</option>
          <option>Grandson</option><option>Granddaughter</option><option>Uncle</option>
          <option>Aunt</option><option>Other Relative</option><option>Non-Relative</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Date of Birth</label>
        <input type="date" class="form-input" id="m${memberCount}-dob">
      </div>
      <div class="form-group">
        <label class="form-label">Age</label>
        <input type="number" class="form-input" id="m${memberCount}-age" placeholder="Age in years" min="0" max="150">
      </div>
      <div class="form-group">
        <label class="form-label">Gender</label>
        <select class="form-select" id="m${memberCount}-gender">
          <option value="">Select Gender</option>
          <option>Male</option><option>Female</option><option>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Aadhaar Number</label>
        <input type="text" class="form-input" id="m${memberCount}-aadhaar" placeholder="12-digit Aadhaar" maxlength="12">
      </div>
      <div class="form-group">
        <label class="form-label">Mobile Number</label>
        <input type="tel" class="form-input" id="m${memberCount}-mobile" placeholder="10-digit mobile" maxlength="10">
      </div>
      <div class="form-group">
        <label class="form-label">Marital Status</label>
        <select class="form-select" id="m${memberCount}-marital">
          <option value="">Select Status</option>
          <option>Single</option><option>Married</option><option>Widowed</option>
          <option>Divorced</option><option>Separated</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Education Level</label>
        <select class="form-select" id="m${memberCount}-education">
          <option value="">Select Education Level</option>
          <option>Illiterate</option><option>Primary (1-5)</option><option>Middle (6-8)</option>
          <option>Secondary (9-10)</option><option>Higher Secondary (11-12)</option>
          <option>Diploma</option><option>Graduate</option><option>Post Graduate</option><option>Doctorate</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Employment Sector</label>
        <select class="form-select" id="m${memberCount}-employment">
          <option value="">Select Sector</option>
          <option>Agriculture</option><option>Government</option><option>Private</option>
          <option>Self-Employed</option><option>Business</option><option>Student</option>
          <option>Unemployed</option><option>Retired</option><option>Homemaker</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Occupation</label>
        <input type="text" class="form-input" id="m${memberCount}-occupation" placeholder="Enter occupation">
      </div>
      <div class="form-group">
        <label class="form-label">Traditional Occupation</label>
        <input type="text" class="form-input" id="m${memberCount}-trad" placeholder="Traditional occupation (if any)">
      </div>
    </div>
  `;
  container.appendChild(block);
  block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeMember(id) {
  const block = document.getElementById('member-block-' + id);
  if (block) {
    block.style.opacity = '0';
    block.style.transform = 'scale(0.95)';
    block.style.transition = 'all 0.2s ease';
    setTimeout(() => block.remove(), 200);
  }
}

function collectMembers() {
  const members = [];
  document.querySelectorAll('.member-form-block').forEach(block => {
    const id = block.id.replace('member-block-', '');
    const member = {
      name: getVal('m' + id + '-name'),
      relationship: getVal('m' + id + '-relationship'),
      dob: getVal('m' + id + '-dob'),
      age: getVal('m' + id + '-age'),
      gender: getVal('m' + id + '-gender'),
      aadhaar_number: getVal('m' + id + '-aadhaar'),
      mobile_number: getVal('m' + id + '-mobile'),
      marital_status: getVal('m' + id + '-marital'),
      education: getVal('m' + id + '-education'),
      employment_sector: getVal('m' + id + '-employment'),
      occupation: getVal('m' + id + '-occupation'),
      traditional_occupation: getVal('m' + id + '-trad'),
    };
    if (member.name) members.push(member);
  });
  return members;
}

// ── SUBMIT HOUSEHOLD ───────────────────────────────────
function submitHousehold() {
  const headName = document.getElementById('head-name').value.trim();
  if (!headName) { showToast('Head of household name is required', 'error'); return; }

  const btn = document.querySelector('#wcontent-4 .btn-success');
  btn.disabled = true;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Submitting...</span>';

  setTimeout(() => {
    const household = {
      id: 'HH' + Date.now(),
      enumeratorPhone: currentPhone,
      createdAt: new Date().toISOString(),
      head: {
        name: document.getElementById('head-name').value.trim(),
        is_head: true,
        dob: document.getElementById('head-dob').value,
        age: document.getElementById('head-age').value,
        gender: document.getElementById('head-gender').value,
        aadhaar_number: document.getElementById('head-aadhaar').value,
        mobile_number: document.getElementById('head-mobile').value,
        marital_status: document.getElementById('head-marital').value,
        education: document.getElementById('head-education').value,
        employment_sector: document.getElementById('head-employment').value,
        occupation: document.getElementById('head-occupation').value,
        traditional_occupation: document.getElementById('head-trad-occupation').value,
        country: document.getElementById('head-country').value,
        state: document.getElementById('head-state').value,
        district: document.getElementById('head-district').value,
        taluk: document.getElementById('head-taluk').value,
        nagara: document.getElementById('head-nagara').value,
        ward: document.getElementById('head-ward').value,
        pincode: document.getElementById('head-pincode').value,
      },
      members: collectMembers()
    };

    householdsDB.push(household);

    // Update enumerator count
    const en = enumeratorsDB.find(e => e.phone === currentPhone);
    if (en) en.households = getMyHouseholds().length;

    saveDB();
    showToast('✅ Data submitted successfully!', 'success');
    initUserDashboard();
    showSection('my-households', document.querySelector('#sidebar .nav-item:nth-child(2)'));

    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>Submit Household</span>';
  }, 1200);
}

// ── RENDER FUNCTIONS ───────────────────────────────────
function renderRecentHouseholds() {
  const container = document.getElementById('recent-households-list');
  const hh = getMyHouseholds().slice(-3).reverse();
  if (!hh.length) {
    container.innerHTML = `<div class="empty-state-small">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
      <p>No households yet. Add your first one!</p>
    </div>`;
    return;
  }
  container.innerHTML = hh.map(h => `
    <div class="preview-card" onclick="openHouseholdModal('${h.id}')">
      <div class="preview-avatar">${h.head.name[0].toUpperCase()}</div>
      <div class="preview-info">
        <div class="preview-name">${h.head.name}</div>
        <div class="preview-sub">${h.head.state || 'N/A'} · ${1 + (h.members?.length || 0)} member(s)</div>
      </div>
    </div>
  `).join('');
}

function renderHouseholdsGrid() {
  const container = document.getElementById('households-grid');
  const hh = getMyHouseholds().reverse();
  if (!hh.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏠</div>
      <h3>No Households Added Yet</h3>
      <p>Start by adding your first household. Click the button above to begin.</p>
      <button class="btn-primary" onclick="showSection('add-household', document.querySelector('#sidebar .nav-item:nth-child(3)'))">
        <span>Add First Household</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>`;
    return;
  }
  container.innerHTML = hh.map(h => householdCardHTML(h)).join('');
}

function householdCardHTML(h) {
  const memberCount = 1 + (h.members?.length || 0);
  const loc = [h.head.taluk, h.head.district].filter(Boolean).join(', ') || 'N/A';
  return `
    <div class="household-card" onclick="openHouseholdModal('${h.id}')">
      <div class="hh-card-head">
        <div class="hh-avatar">${h.head.name[0].toUpperCase()}</div>
        <div>
          <div class="hh-name">${h.head.name}</div>
          <div class="hh-id">#${h.id}</div>
        </div>
      </div>
      <div class="hh-details">
        <div class="hh-detail-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${h.head.district || h.head.state || 'N/A'}${h.head.state ? ', ' + h.head.state : ''}
        </div>
        <div class="hh-detail-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${new Date(h.createdAt).toLocaleDateString('en-IN')}
        </div>
      </div>
      <div class="hh-tags">
        <span class="hh-tag tag-members">👥 ${memberCount} Member${memberCount > 1 ? 's' : ''}</span>
        ${h.head.taluk ? `<span class="hh-tag tag-location">${h.head.taluk}</span>` : ''}
        ${h.head.state ? `<span class="hh-tag tag-state">${h.head.state}</span>` : ''}
      </div>
    </div>
  `;
}

function filterHouseholds() {
  const q = document.getElementById('household-search').value.toLowerCase();
  const hh = getMyHouseholds().reverse().filter(h => h.head.name.toLowerCase().includes(q));
  const container = document.getElementById('households-grid');
  if (!hh.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No Results Found</h3><p>No households match "${q}"</p></div>`;
    return;
  }
  container.innerHTML = hh.map(h => householdCardHTML(h)).join('');
}

function renderAdminRecentList() {
  const container = document.getElementById('admin-recent-list');
  const hh = [...householdsDB].reverse().slice(0, 4);
  if (!hh.length) {
    container.innerHTML = `<div class="empty-state-small"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><p>No data yet</p></div>`;
    return;
  }
  container.innerHTML = hh.map(h => `
    <div class="preview-card" onclick="openHouseholdModal('${h.id}')">
      <div class="preview-avatar">${h.head.name[0].toUpperCase()}</div>
      <div class="preview-info">
        <div class="preview-name">${h.head.name}</div>
        <div class="preview-sub">${formatPhone(h.enumeratorPhone)} · ${h.head.state || 'N/A'}</div>
      </div>
    </div>
  `).join('');
}

function renderAdminHouseholdsGrid() {
  const container = document.getElementById('admin-households-grid');
  if (!householdsDB.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>No Households Recorded Yet</h3><p>Household data will appear here once enumerators start submitting data.</p></div>`;
    return;
  }
  container.innerHTML = [...householdsDB].reverse().map(h => householdCardHTML(h)).join('');
}

function filterAdminHouseholds() {
  const q = document.getElementById('admin-search').value.toLowerCase();
  const hh = [...householdsDB].reverse().filter(h =>
    h.head.name.toLowerCase().includes(q) ||
    (h.head.state || '').toLowerCase().includes(q) ||
    h.enumeratorPhone.includes(q)
  );
  const container = document.getElementById('admin-households-grid');
  if (!hh.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No Results</h3><p>No households match your search</p></div>`;
    return;
  }
  container.innerHTML = hh.map(h => householdCardHTML(h)).join('');
}

function renderEnumeratorsList() {
  const container = document.getElementById('enumerators-list');
  if (!enumeratorsDB.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><h3>No Enumerators Yet</h3><p>Enumerators will appear here once they log in.</p></div>`;
    return;
  }
  container.innerHTML = enumeratorsDB.map(e => {
    const hhCount = householdsDB.filter(h => h.enumeratorPhone === e.phone).length;
    return `
      <div class="enumerator-card">
        <div class="enumerator-avatar">${e.phone.slice(0,1)}</div>
        <div class="enum-info">
          <div class="enum-name">Enumerator</div>
          <div class="enum-phone">${formatPhone(e.phone)}</div>
          <div class="enum-stat">📋 ${hhCount} household${hhCount !== 1 ? 's' : ''} registered</div>
        </div>
      </div>
    `;
  }).join('');
}

// ── HOUSEHOLD MODAL ────────────────────────────────────
function openHouseholdModal(id) {
  const h = householdsDB.find(hh => hh.id === id);
  if (!h) return;

  document.getElementById('modal-title').textContent = `${h.head.name}'s Household`;

  const body = document.getElementById('modal-content');
  body.innerHTML = `
    <div class="modal-section">
      <div class="modal-section-title">Head of Household</div>
      <div class="modal-detail-grid">
        ${detailItem('Full Name', h.head.name)}
        ${detailItem('Gender', h.head.gender || 'N/A')}
        ${detailItem('Date of Birth', h.head.dob || 'N/A')}
        ${detailItem('Age', h.head.age || 'N/A')}
        ${detailItem('Aadhaar', h.head.aadhaar_number || 'N/A')}
        ${detailItem('Mobile', h.head.mobile_number || 'N/A')}
        ${detailItem('Marital Status', h.head.marital_status || 'N/A')}
        ${detailItem('Education', h.head.education || 'N/A')}
        ${detailItem('Employment', h.head.employment_sector || 'N/A')}
        ${detailItem('Occupation', h.head.occupation || 'N/A')}
        ${detailItem('Traditional Occupation', h.head.traditional_occupation || 'N/A')}
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Location</div>
      <div class="modal-detail-grid">
        ${detailItem('Country', h.head.country || 'India')}
        ${detailItem('State', h.head.state || 'N/A')}
        ${detailItem('District', h.head.district || 'N/A')}
        ${detailItem('Taluk / Mandal', h.head.taluk || 'N/A')}
        ${detailItem('Nagara / Town', h.head.nagara || 'N/A')}
        ${detailItem('Ward / Village', h.head.ward || 'N/A')}
        ${detailItem('Pincode', h.head.pincode || 'N/A')}
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Household Members (${h.members?.length || 0})</div>
      ${!h.members?.length
        ? '<p style="color:var(--text-muted);font-size:0.85rem;">No additional members added.</p>'
        : h.members.map((m, i) => `
          <div class="member-block">
            <div class="member-block-header">
              <div class="member-mini-avatar">${(m.name || '?')[0].toUpperCase()}</div>
              <div>
                <div class="member-mini-name">${m.name || 'Unknown'}</div>
                <div class="member-mini-rel">${m.relationship || 'N/A'}</div>
              </div>
            </div>
            <div class="modal-detail-grid">
              ${detailItem('Age', m.age || 'N/A')}
              ${detailItem('Gender', m.gender || 'N/A')}
              ${detailItem('Marital Status', m.marital_status || 'N/A')}
              ${detailItem('Education', m.education || 'N/A')}
              ${detailItem('Employment', m.employment_sector || 'N/A')}
              ${detailItem('Aadhaar', m.aadhaar_number || 'N/A')}
            </div>
          </div>
        `).join('')}
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Submission Info</div>
      <div class="modal-detail-grid">
        ${detailItem('Household ID', h.id)}
        ${detailItem('Submitted By', formatPhone(h.enumeratorPhone))}
        ${detailItem('Submitted On', new Date(h.createdAt).toLocaleString('en-IN'))}
        ${detailItem('Total Members', 1 + (h.members?.length || 0))}
      </div>
    </div>
  `;

  document.getElementById('household-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function detailItem(label, value) {
  return `<div class="modal-detail"><div class="modal-detail-label">${label}</div><div class="modal-detail-value">${value}</div></div>`;
}

function closeHouseholdModal() {
  document.getElementById('household-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('household-modal').addEventListener('click', function(e) {
  if (e.target === this) closeHouseholdModal();
});

// ── EXPORT ─────────────────────────────────────────────
function exportCSV() {
  if (!householdsDB.length) { showToast('No data to export', 'error'); return; }
  const headers = ['ID','Head Name','State','District','Taluk','Pincode','Members','Enumerator','Date'];
  const rows = householdsDB.map(h => [
    h.id, h.head.name, h.head.state || '', h.head.district || '',
    h.head.taluk || '', h.head.pincode || '',
    1 + (h.members?.length || 0), formatPhone(h.enumeratorPhone),
    new Date(h.createdAt).toLocaleDateString('en-IN')
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadFile('census_data.csv', csv, 'text/csv');
  showToast('CSV exported successfully!', 'success');
}

function exportJSON() {
  if (!householdsDB.length) { showToast('No data to export', 'error'); return; }
  downloadFile('census_data.json', JSON.stringify(householdsDB, null, 2), 'application/json');
  showToast('JSON exported successfully!', 'success');
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ── LOGOUT ─────────────────────────────────────────────
function logout() {
  ['user-dashboard','admin-dashboard'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  currentPhone = '';
  currentRole  = 'user';
  memberCount  = 0;

  // Reset login form
  document.getElementById('phone-input').value = '';
  document.getElementById('send-otp-btn').disabled = true;
  const step1 = document.getElementById('phone-step');
  const step2 = document.getElementById('otp-step');
  step2.style.display = 'none';
  step2.classList.remove('active');
  step1.style.display = 'block';
  step1.classList.add('active');
  clearOTP();
  selectRole('user');

  document.getElementById('login-page').classList.remove('hidden');
  showToast('Logged out successfully', 'info');
}

// ── TOAST ──────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'info') {
  clearTimeout(toastTimer);
  const toast = document.getElementById('toast');
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  toast.querySelector('.toast-icon').textContent = icons[type] || 'ℹ️';
  toast.querySelector('.toast-message').textContent = msg;
  toast.className = 'toast toast-' + type;
  toast.classList.remove('hidden');

  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.style.opacity = '';
      toast.style.transform = '';
    }, 300);
  }, 3500);
}

// ── HELPERS ────────────────────────────────────────────
function setTextIfExists(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// Spin animation for submit button
const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!document.getElementById('household-modal').classList.contains('hidden')) {
      closeHouseholdModal();
    }
  }
});
