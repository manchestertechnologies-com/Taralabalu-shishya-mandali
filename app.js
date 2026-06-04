/* =====================================================
   CENSUS APP — Supabase-Integrated Application Logic
   Replace SUPABASE_URL and SUPABASE_ANON_KEY below
   with your actual values from Supabase dashboard.
   ===================================================== */

// ── SUPABASE CONFIG (FILL IN YOUR KEYS) ───────────────
const SUPABASE_URL      = 'https://pkvlongnjdfojkrttcjl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmxvbmduamRmb2prcnR0Y2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njc5NTgsImV4cCI6MjA5NjE0Mzk1OH0.kjLoJ9hBR8XbxLpuiPCZ0viDhPywPR_AGLJ7zxhXi-0';

// ── CONSTANTS ──────────────────────────────────────────
const USER_OTP  = '123456';
const ADMIN_OTP = '654321';

// ── Supabase Client (loaded via CDN in index.html) ────
let supabase = null;

function initSupabase() {
  if (SUPABASE_URL === 'YOUR_PROJECT_URL_HERE') {
    console.warn('⚠️ Supabase not configured. Running offline (localStorage).');
    return false;
  }
  try {
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
      console.warn('Supabase CDN not loaded yet — retrying in 800ms...');
      setTimeout(() => {
        try {
          supabase  = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          isOnline  = true;
          console.log('✅ Supabase connected (late init)');
        } catch(e) { console.error('Late Supabase init failed:', e); }
      }, 800);
      return false;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase connected');
    return true;
  } catch(e) {
    console.error('Supabase init failed:', e);
    return false;
  }
}

// ── STATE ──────────────────────────────────────────────
let currentRole   = 'user';
let currentPhone  = '';
let memberCount   = 0;
let currentStep   = 1;
let householdsDB  = [];
let enumeratorsDB = [];
let isOnline      = false;

// ── INIT ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  try { isOnline = initSupabase(); } catch(e) { console.error(e); }
  try { loadDB(); }    catch(e) { console.error(e); }
  try { updateDate(); } catch(e) { console.error(e); }
  runSplash(); // always runs — no matter what
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

// ── DB LAYER (Supabase or localStorage fallback) ───────
function loadDB() {
  try {
    householdsDB  = JSON.parse(localStorage.getItem('census_households'))  || [];
    enumeratorsDB = JSON.parse(localStorage.getItem('census_enumerators')) || [];
  } catch(e) {
    householdsDB = []; enumeratorsDB = [];
  }
}

function saveLocalDB() {
  localStorage.setItem('census_households',  JSON.stringify(householdsDB));
  localStorage.setItem('census_enumerators', JSON.stringify(enumeratorsDB));
}

// ─── SUPABASE: Register/fetch enumerator ──────────────
async function sbRegisterEnumerator(phone) {
  if (!isOnline) return;
  const { error } = await supabase.from('enumerators').upsert(
    { phone, name: 'Enumerator' },
    { onConflict: 'phone', ignoreDuplicates: true }
  );
  if (error) console.error('Register enumerator error:', error);
}

// ─── SUPABASE: Fetch enumerator's households ──────────
async function sbFetchMyHouseholds(phone) {
  if (!isOnline) return getMyHouseholdsLocal();
  const { data: hh, error: hhErr } = await supabase
    .from('households')
    .select('*')
    .eq('enumerator_phone', phone)
    .order('created_at', { ascending: false });

  if (hhErr) { console.error(hhErr); return getMyHouseholdsLocal(); }

  const result = [];
  for (const h of hh) {
    const { data: members } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', h.id)
      .order('is_head', { ascending: false });

    const head    = members?.find(m => m.is_head) || {};
    const others  = members?.filter(m => !m.is_head) || [];
    result.push(normalizeHousehold(h, head, others));
  }
  return result;
}

// ─── SUPABASE: Fetch ALL households (admin) ───────────
async function sbFetchAllHouseholds() {
  if (!isOnline) return householdsDB;
  const { data: hh, error } = await supabase
    .from('households')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return householdsDB; }

  const result = [];
  for (const h of hh) {
    const { data: members } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', h.id)
      .order('is_head', { ascending: false });

    const head   = members?.find(m => m.is_head) || {};
    const others = members?.filter(m => !m.is_head) || [];
    result.push(normalizeHousehold(h, head, others));
  }
  return result;
}

// ─── SUPABASE: Fetch all enumerators (admin) ──────────
async function sbFetchAllEnumerators() {
  if (!isOnline) return enumeratorsDB;
  const { data, error } = await supabase
    .from('enumerators')
    .select('*')
    .order('joined_at', { ascending: false });
  if (error) { console.error(error); return enumeratorsDB; }
  return data || [];
}

// ─── SUPABASE: Submit new household ───────────────────
async function sbSubmitHousehold(payload) {
  if (!isOnline) {
    // Offline fallback
    householdsDB.push(payload);
    saveLocalDB();
    return { success: true };
  }

  // 1. Insert household row
  const { data: hhRow, error: hhErr } = await supabase
    .from('households')
    .insert({ enumerator_phone: payload.enumeratorPhone })
    .select()
    .single();

  if (hhErr) return { success: false, error: hhErr.message };

  // 2. Build members array (head first)
  const membersToInsert = [
    { household_id: hhRow.id, ...flattenMember(payload.head, true) },
    ...(payload.members || []).map(m => ({ household_id: hhRow.id, ...flattenMember(m, false) }))
  ].filter(m => m.name);

  const { error: mErr } = await supabase.from('household_members').insert(membersToInsert);
  if (mErr) return { success: false, error: mErr.message };

  // Also cache locally
  payload.id = hhRow.id;
  householdsDB.push(payload);
  saveLocalDB();

  return { success: true, id: hhRow.id };
}

// ─── Normalize DB row → app object ────────────────────
function normalizeHousehold(h, head, members) {
  return {
    id: h.id,
    enumeratorPhone: h.enumerator_phone,
    createdAt: h.created_at,
    head: {
      name:                   head.name || '',
      is_head:                true,
      dob:                    head.date_of_birth || '',
      age:                    head.age || '',
      gender:                 head.gender || '',
      aadhaar_number:         head.aadhaar_number || '',
      mobile_number:          head.mobile_number || '',
      marital_status:         head.marital_status || '',
      education:              head.education || '',
      employment_sector:      head.employment_sector || '',
      occupation:             head.occupation || '',
      traditional_occupation: head.traditional_occupation || '',
      country:                head.country || 'India',
      state:                  head.state || '',
      district:               head.district || '',
      taluk:                  head.taluk || '',
      nagara:                 head.nagara || '',
      ward:                   head.ward || '',
      pincode:                head.pincode || '',
    },
    members: members.map(m => ({
      name:                   m.name,
      relationship:           m.relationship || '',
      dob:                    m.date_of_birth || '',
      age:                    m.age || '',
      gender:                 m.gender || '',
      aadhaar_number:         m.aadhaar_number || '',
      mobile_number:          m.mobile_number || '',
      marital_status:         m.marital_status || '',
      education:              m.education || '',
      employment_sector:      m.employment_sector || '',
      occupation:             m.occupation || '',
      traditional_occupation: m.traditional_occupation || '',
    }))
  };
}

function flattenMember(m, isHead) {
  return {
    name:                   m.name || '',
    is_head:                isHead,
    relationship:           isHead ? 'Head' : (m.relationship || ''),
    date_of_birth:          m.dob || null,
    age:                    m.age ? parseInt(m.age) : null,
    gender:                 m.gender || null,
    aadhaar_number:         m.aadhaar_number || null,
    mobile_number:          m.mobile_number || null,
    marital_status:         m.marital_status || null,
    education:              m.education || null,
    employment_sector:      m.employment_sector || null,
    occupation:             m.occupation || null,
    traditional_occupation: m.traditional_occupation || null,
    country:                m.country || 'India',
    state:                  m.state || null,
    district:               m.district || null,
    taluk:                  m.taluk || null,
    nagara:                 m.nagara || null,
    ward:                   m.ward || null,
    pincode:                m.pincode || null,
  };
}

// ── DATE HELPERS ───────────────────────────────────────
function updateDate() {
  const now  = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str  = now.toLocaleDateString('en-IN', opts);
  ['current-date','admin-current-date'].forEach(id => {
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
  if (!p || p.length < 5) return p;
  return `+91 ${p.slice(0,5)} ${p.slice(5)}`;
}

// ── LOGIN FLOW ─────────────────────────────────────────
function selectRole(role) {
  currentRole = role;
  document.getElementById('btn-user-role').classList.toggle('active', role === 'user');
  document.getElementById('btn-admin-role').classList.toggle('active', role === 'admin');
}

function validatePhone() {
  const inp   = document.getElementById('phone-input');
  const btn   = document.getElementById('send-otp-btn');
  const err   = document.getElementById('phone-error');
  const val   = inp.value.replace(/\D/g, '');
  inp.value   = val;
  const valid = /^[6-9]\d{9}$/.test(val);
  btn.disabled = !valid;
  if (valid || val.length === 0) err.classList.add('hidden');
  else if (val.length >= 10)    err.classList.remove('hidden');
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
  if (inp.value && idx < 5) document.getElementById('otp-' + (idx+1)).focus();
  inp.classList.toggle('filled', !!inp.value);
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

async function verifyOTP() {
  const entered = getEnteredOTP();
  const correct = currentRole === 'admin' ? ADMIN_OTP : USER_OTP;
  const errEl   = document.getElementById('otp-error');

  if (entered.length < 6) { showToast('Please enter all 6 digits', 'error'); return; }

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

  // Show loading state
  const btn = document.getElementById('verify-otp-btn');
  if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Signing in...'; }

  if (currentRole === 'user') await sbRegisterEnumerator(currentPhone);

  document.getElementById('login-page').classList.add('hidden');
  if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Verify & Continue'; }

  if (currentRole === 'admin') {
    await initAdminDashboard();
    document.getElementById('admin-dashboard').classList.remove('hidden');
    showToast('Welcome, Administrator!', 'success');
  } else {
    await initUserDashboard();
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
async function initUserDashboard() {
  const phone  = formatPhone(currentPhone);
  const letter = currentPhone.slice(0,1);

  setTextIfExists('sidebar-user-phone', phone);
  setTextIfExists('user-phone-display', 'Mobile: ' + phone);
  setTextIfExists('welcome-msg', getGreeting() + ', Enumerator!');
  setTextIfExists('profile-phone', phone);
  ['user-avatar-text','header-avatar-text','profile-avatar-letter'].forEach(id => setTextIfExists(id, letter));

  const myHH = await sbFetchMyHouseholds(currentPhone);
  householdsDB = isOnline ? await sbFetchAllHouseholds() : householdsDB;

  const myMembers    = myHH.reduce((s,h) => s + 1 + (h.members?.length || 0), 0);
  const today        = new Date().toDateString();
  const todayEntries = myHH.filter(h => new Date(h.createdAt).toDateString() === today).length;

  setTextIfExists('total-households', myHH.length);
  setTextIfExists('total-members',    myMembers);
  setTextIfExists('today-entries',    todayEntries);
  setTextIfExists('profile-households', myHH.length);
  setTextIfExists('profile-members',    myMembers);

  renderRecentHouseholds(myHH);
  renderHouseholdsGrid(myHH);
  updateDate();
}

function getMyHouseholdsLocal() {
  return householdsDB.filter(h => h.enumeratorPhone === currentPhone);
}

// ── ADMIN DASHBOARD INIT ───────────────────────────────
async function initAdminDashboard() {
  const phone = formatPhone(currentPhone);
  setTextIfExists('admin-phone-display', phone);

  const allHH   = await sbFetchAllHouseholds();
  const allEnum = await sbFetchAllEnumerators();
  householdsDB  = allHH;
  enumeratorsDB = allEnum;

  const total        = allHH.length;
  const totalMembers = allHH.reduce((s,h) => s + 1 + (h.members?.length || 0), 0);
  const today        = new Date().toDateString();
  const todayEntries = allHH.filter(h => new Date(h.createdAt).toDateString() === today).length;

  setTextIfExists('admin-total-households',  total);
  setTextIfExists('admin-total-members',     totalMembers);
  setTextIfExists('admin-total-enumerators', allEnum.length);
  setTextIfExists('admin-today-entries',     todayEntries);
  setTextIfExists('rpt-households',  total);
  setTextIfExists('rpt-population',  totalMembers);
  setTextIfExists('rpt-avg-size',    total ? (totalMembers / total).toFixed(1) : '0');

  const states = new Set(allHH.map(h => h.head.state).filter(Boolean));
  setTextIfExists('rpt-states', states.size);

  renderAdminRecentList(allHH);
  renderAdminHouseholdsGrid(allHH);
  renderEnumeratorsList(allEnum, allHH);
  updateDate();
}

// ── NAVIGATION ─────────────────────────────────────────
async function showSection(id, clickedEl) {
  document.querySelectorAll('#user-dashboard .content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#user-dashboard .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  if (clickedEl) clickedEl.classList.add('active');
  const titles = { 'dashboard-home':'Dashboard','my-households':'My Households','add-household':'Add Household','my-profile':'My Profile' };
  setTextIfExists('page-title', titles[id] || id);
  if (id === 'add-household') resetWizard();
  if (id === 'my-households') {
    const hh = await sbFetchMyHouseholds(currentPhone);
    renderHouseholdsGrid(hh);
  }
  if (window.innerWidth <= 900) closeSidebar();
}

async function showAdminSection(id, clickedEl) {
  document.querySelectorAll('#admin-dashboard .content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#admin-sidebar .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  if (clickedEl) clickedEl.classList.add('active');
  const titles = { 'admin-overview':'Admin Overview','admin-households':'All Households','admin-enumerators':'Enumerators','admin-reports':'Reports' };
  setTextIfExists('admin-page-title', titles[id] || id);

  if (id === 'admin-households') {
    const hh = await sbFetchAllHouseholds();
    householdsDB = hh;
    renderAdminHouseholdsGrid(hh);
  }
  if (id === 'admin-enumerators') {
    const en = await sbFetchAllEnumerators();
    const hh = await sbFetchAllHouseholds();
    renderEnumeratorsList(en, hh);
  }
  if (window.innerWidth <= 900) closeAdminSidebar();
}

// ── SIDEBAR ────────────────────────────────────────────
function toggleSidebar()      { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('show'); }
function closeSidebar()       { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('show'); }
function toggleAdminSidebar() { document.getElementById('admin-sidebar').classList.toggle('open'); document.getElementById('admin-sidebar-overlay').classList.toggle('show'); }
function closeAdminSidebar()  { document.getElementById('admin-sidebar').classList.remove('open'); document.getElementById('admin-sidebar-overlay').classList.remove('show'); }

// ── WIZARD ─────────────────────────────────────────────
function resetWizard() {
  currentStep = 1; memberCount = 0;
  [1,2,3,4].forEach(i => {
    document.getElementById('wcontent-' + i).classList.toggle('hidden', i !== 1);
    const ws = document.getElementById('wstep-' + i);
    ws.classList.remove('active','completed');
    if (i === 1) ws.classList.add('active');
  });
  document.getElementById('members-list').innerHTML = '';
  ['head-name','head-dob','head-age','head-aadhaar','head-mobile','head-occupation','head-trad-occupation','head-district','head-taluk','head-nagara','head-ward','head-pincode']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['head-gender','head-marital','head-education','head-employment','head-state']
    .forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
}

function nextStep(from) {
  if (from === 1 && !document.getElementById('head-name').value.trim()) {
    showToast('Please enter the head of household name', 'error'); return;
  }
  document.getElementById('wcontent-' + from).classList.add('hidden');
  document.getElementById('wcontent-' + (from+1)).classList.remove('hidden');
  document.getElementById('wstep-' + from).classList.remove('active');
  document.getElementById('wstep-' + from).classList.add('completed');
  document.getElementById('wstep-' + (from+1)).classList.add('active');
  currentStep = from + 1;
}

function prevStep(from) {
  document.getElementById('wcontent-' + from).classList.add('hidden');
  document.getElementById('wcontent-' + (from-1)).classList.remove('hidden');
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
      <div class="form-group"><label class="form-label">Full Name *</label><input type="text" class="form-input" id="m${memberCount}-name" placeholder="Enter full name"></div>
      <div class="form-group"><label class="form-label">Relationship to Head</label><select class="form-select" id="m${memberCount}-relationship"><option value="">Select Relationship</option><option>Spouse</option><option>Son</option><option>Daughter</option><option>Father</option><option>Mother</option><option>Brother</option><option>Sister</option><option>Grandfather</option><option>Grandmother</option><option>Grandson</option><option>Granddaughter</option><option>Uncle</option><option>Aunt</option><option>Other Relative</option><option>Non-Relative</option></select></div>
      <div class="form-group"><label class="form-label">Date of Birth</label><input type="date" class="form-input" id="m${memberCount}-dob"></div>
      <div class="form-group"><label class="form-label">Age</label><input type="number" class="form-input" id="m${memberCount}-age" placeholder="Age in years" min="0" max="150"></div>
      <div class="form-group"><label class="form-label">Gender</label><select class="form-select" id="m${memberCount}-gender"><option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option></select></div>
      <div class="form-group"><label class="form-label">Aadhaar Number</label><input type="text" class="form-input" id="m${memberCount}-aadhaar" placeholder="12-digit Aadhaar" maxlength="12"></div>
      <div class="form-group"><label class="form-label">Mobile Number</label><input type="tel" class="form-input" id="m${memberCount}-mobile" placeholder="10-digit mobile" maxlength="10"></div>
      <div class="form-group"><label class="form-label">Marital Status</label><select class="form-select" id="m${memberCount}-marital"><option value="">Select Status</option><option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option><option>Separated</option></select></div>
      <div class="form-group"><label class="form-label">Education Level</label><select class="form-select" id="m${memberCount}-education"><option value="">Select Education Level</option><option>Illiterate</option><option>Primary (1-5)</option><option>Middle (6-8)</option><option>Secondary (9-10)</option><option>Higher Secondary (11-12)</option><option>Diploma</option><option>Graduate</option><option>Post Graduate</option><option>Doctorate</option></select></div>
      <div class="form-group"><label class="form-label">Employment Sector</label><select class="form-select" id="m${memberCount}-employment"><option value="">Select Sector</option><option>Agriculture</option><option>Government</option><option>Private</option><option>Self-Employed</option><option>Business</option><option>Student</option><option>Unemployed</option><option>Retired</option><option>Homemaker</option></select></div>
      <div class="form-group"><label class="form-label">Occupation</label><input type="text" class="form-input" id="m${memberCount}-occupation" placeholder="Enter occupation"></div>
      <div class="form-group"><label class="form-label">Traditional Occupation</label><input type="text" class="form-input" id="m${memberCount}-trad" placeholder="Traditional occupation (if any)"></div>
    </div>`;
  container.appendChild(block);
  block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeMember(id) {
  const block = document.getElementById('member-block-' + id);
  if (block) {
    block.style.opacity = '0'; block.style.transform = 'scale(0.95)';
    block.style.transition = 'all 0.2s ease';
    setTimeout(() => block.remove(), 200);
  }
}

function collectMembers() {
  const members = [];
  document.querySelectorAll('.member-form-block').forEach(block => {
    const id = block.id.replace('member-block-','');
    const m  = {
      name: getVal('m'+id+'-name'), relationship: getVal('m'+id+'-relationship'),
      dob: getVal('m'+id+'-dob'), age: getVal('m'+id+'-age'),
      gender: getVal('m'+id+'-gender'), aadhaar_number: getVal('m'+id+'-aadhaar'),
      mobile_number: getVal('m'+id+'-mobile'), marital_status: getVal('m'+id+'-marital'),
      education: getVal('m'+id+'-education'), employment_sector: getVal('m'+id+'-employment'),
      occupation: getVal('m'+id+'-occupation'), traditional_occupation: getVal('m'+id+'-trad'),
    };
    if (m.name) members.push(m);
  });
  return members;
}

// ── SUBMIT HOUSEHOLD ───────────────────────────────────
async function submitHousehold() {
  const headName = document.getElementById('head-name').value.trim();
  if (!headName) { showToast('Head of household name is required', 'error'); return; }

  const btn = document.querySelector('#wcontent-4 .btn-success');
  btn.disabled = true;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>Submitting...</span>';

  const payload = {
    id: 'HH' + Date.now(),
    enumeratorPhone: currentPhone,
    createdAt: new Date().toISOString(),
    head: {
      name: headName, is_head: true,
      dob:  document.getElementById('head-dob').value,
      age:  document.getElementById('head-age').value,
      gender: document.getElementById('head-gender').value,
      aadhaar_number: document.getElementById('head-aadhaar').value,
      mobile_number:  document.getElementById('head-mobile').value,
      marital_status: document.getElementById('head-marital').value,
      education:      document.getElementById('head-education').value,
      employment_sector:      document.getElementById('head-employment').value,
      occupation:             document.getElementById('head-occupation').value,
      traditional_occupation: document.getElementById('head-trad-occupation').value,
      country:  document.getElementById('head-country').value,
      state:    document.getElementById('head-state').value,
      district: document.getElementById('head-district').value,
      taluk:    document.getElementById('head-taluk').value,
      nagara:   document.getElementById('head-nagara').value,
      ward:     document.getElementById('head-ward').value,
      pincode:  document.getElementById('head-pincode').value,
    },
    members: collectMembers()
  };

  const result = await sbSubmitHousehold(payload);

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>Submit Household</span>';

  if (result.success) {
    showToast('✅ Data submitted successfully!', 'success');
    await initUserDashboard();
    showSection('my-households', document.querySelector('#sidebar .nav-item:nth-child(2)'));
  } else {
    showToast('❌ Failed: ' + (result.error || 'Unknown error'), 'error');
  }
}

// ── RENDER FUNCTIONS ───────────────────────────────────
function renderRecentHouseholds(hh) {
  const container = document.getElementById('recent-households-list');
  const list = (hh || []).slice(0, 3);
  if (!list.length) {
    container.innerHTML = `<div class="empty-state-small"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><p>No households yet. Add your first one!</p></div>`;
    return;
  }
  container.innerHTML = list.map(h => `
    <div class="preview-card" onclick="openHouseholdModal('${h.id}')">
      <div class="preview-avatar">${(h.head.name||'?')[0].toUpperCase()}</div>
      <div class="preview-info">
        <div class="preview-name">${h.head.name}</div>
        <div class="preview-sub">${h.head.state || 'N/A'} · ${1+(h.members?.length||0)} member(s)</div>
      </div>
    </div>`).join('');
}

function renderHouseholdsGrid(hh) {
  const container = document.getElementById('households-grid');
  const list = hh || [];
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏠</div><h3>No Households Added Yet</h3><p>Start by adding your first household.</p><button class="btn-primary" onclick="showSection('add-household', document.querySelector('#sidebar .nav-item:nth-child(3)'))"><span>Add First Household</span></button></div>`;
    return;
  }
  container.innerHTML = list.map(h => householdCardHTML(h)).join('');
}

function householdCardHTML(h) {
  const mc  = 1 + (h.members?.length || 0);
  const hid = String(h.id).slice(0, 18);
  return `
    <div class="household-card" onclick="openHouseholdModal('${h.id}')">
      <div class="hh-card-head">
        <div class="hh-avatar">${(h.head.name||'?')[0].toUpperCase()}</div>
        <div><div class="hh-name">${h.head.name}</div><div class="hh-id">#${hid}</div></div>
      </div>
      <div class="hh-details">
        <div class="hh-detail-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${h.head.district||h.head.state||'N/A'}${h.head.state?', '+h.head.state:''}</div>
        <div class="hh-detail-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${new Date(h.createdAt).toLocaleDateString('en-IN')}</div>
      </div>
      <div class="hh-tags">
        <span class="hh-tag tag-members">👥 ${mc} Member${mc>1?'s':''}</span>
        ${h.head.taluk?`<span class="hh-tag tag-location">${h.head.taluk}</span>`:''}
        ${h.head.state?`<span class="hh-tag tag-state">${h.head.state}</span>`:''}
      </div>
    </div>`;
}

async function filterHouseholds() {
  const q  = document.getElementById('household-search').value.toLowerCase();
  const hh = await sbFetchMyHouseholds(currentPhone);
  const filtered = hh.filter(h => (h.head.name||'').toLowerCase().includes(q));
  const container = document.getElementById('households-grid');
  if (!filtered.length) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No Results Found</h3><p>No households match "${q}"</p></div>`; return; }
  container.innerHTML = filtered.map(h => householdCardHTML(h)).join('');
}

function renderAdminRecentList(hh) {
  const container = document.getElementById('admin-recent-list');
  const list = (hh||[]).slice(0,4);
  if (!list.length) { container.innerHTML = `<div class="empty-state-small"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><p>No data yet</p></div>`; return; }
  container.innerHTML = list.map(h => `
    <div class="preview-card" onclick="openHouseholdModal('${h.id}')">
      <div class="preview-avatar">${(h.head.name||'?')[0].toUpperCase()}</div>
      <div class="preview-info">
        <div class="preview-name">${h.head.name}</div>
        <div class="preview-sub">${formatPhone(h.enumeratorPhone)} · ${h.head.state||'N/A'}</div>
      </div>
    </div>`).join('');
}

function renderAdminHouseholdsGrid(hh) {
  const container = document.getElementById('admin-households-grid');
  if (!(hh||[]).length) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>No Households Recorded Yet</h3><p>Household data will appear here once enumerators start submitting data.</p></div>`; return; }
  container.innerHTML = hh.map(h => householdCardHTML(h)).join('');
}

async function filterAdminHouseholds() {
  const q  = document.getElementById('admin-search').value.toLowerCase();
  const hh = await sbFetchAllHouseholds();
  const filtered = hh.filter(h => (h.head.name||'').toLowerCase().includes(q) || (h.head.state||'').toLowerCase().includes(q) || (h.enumeratorPhone||'').includes(q));
  const container = document.getElementById('admin-households-grid');
  if (!filtered.length) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>No Results</h3><p>No households match your search</p></div>`; return; }
  container.innerHTML = filtered.map(h => householdCardHTML(h)).join('');
}

function renderEnumeratorsList(en, allHH) {
  const container = document.getElementById('enumerators-list');
  if (!(en||[]).length) { container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><h3>No Enumerators Yet</h3><p>Enumerators appear here once they log in.</p></div>`; return; }
  container.innerHTML = (en||[]).map(e => {
    const hhCount = (allHH||[]).filter(h => h.enumeratorPhone === e.phone).length;
    return `<div class="enumerator-card"><div class="enumerator-avatar">${(e.phone||'?').slice(0,1)}</div><div class="enum-info"><div class="enum-name">Enumerator</div><div class="enum-phone">${formatPhone(e.phone)}</div><div class="enum-stat">📋 ${hhCount} household${hhCount!==1?'s':''} registered</div></div></div>`;
  }).join('');
}

// ── HOUSEHOLD MODAL ────────────────────────────────────
function openHouseholdModal(id) {
  const h = householdsDB.find(hh => String(hh.id) === String(id));
  if (!h) return;
  document.getElementById('modal-title').textContent = `${h.head.name}'s Household`;
  const body = document.getElementById('modal-content');
  body.innerHTML = `
    <div class="modal-section"><div class="modal-section-title">Head of Household</div><div class="modal-detail-grid">
      ${detailItem('Full Name',h.head.name)}${detailItem('Gender',h.head.gender||'N/A')}${detailItem('Date of Birth',h.head.dob||'N/A')}${detailItem('Age',h.head.age||'N/A')}${detailItem('Aadhaar',h.head.aadhaar_number||'N/A')}${detailItem('Mobile',h.head.mobile_number||'N/A')}${detailItem('Marital Status',h.head.marital_status||'N/A')}${detailItem('Education',h.head.education||'N/A')}${detailItem('Employment',h.head.employment_sector||'N/A')}${detailItem('Occupation',h.head.occupation||'N/A')}${detailItem('Traditional Occupation',h.head.traditional_occupation||'N/A')}
    </div></div>
    <div class="modal-section"><div class="modal-section-title">Location</div><div class="modal-detail-grid">
      ${detailItem('Country',h.head.country||'India')}${detailItem('State',h.head.state||'N/A')}${detailItem('District',h.head.district||'N/A')}${detailItem('Taluk / Mandal',h.head.taluk||'N/A')}${detailItem('Nagara / Town',h.head.nagara||'N/A')}${detailItem('Ward / Village',h.head.ward||'N/A')}${detailItem('Pincode',h.head.pincode||'N/A')}
    </div></div>
    <div class="modal-section"><div class="modal-section-title">Household Members (${h.members?.length||0})</div>
      ${!(h.members?.length)?'<p style="color:var(--text-muted);font-size:0.85rem;">No additional members added.</p>':h.members.map(m=>`
        <div class="member-block"><div class="member-block-header"><div class="member-mini-avatar">${(m.name||'?')[0].toUpperCase()}</div><div><div class="member-mini-name">${m.name||'Unknown'}</div><div class="member-mini-rel">${m.relationship||'N/A'}</div></div></div>
        <div class="modal-detail-grid">${detailItem('Age',m.age||'N/A')}${detailItem('Gender',m.gender||'N/A')}${detailItem('Marital Status',m.marital_status||'N/A')}${detailItem('Education',m.education||'N/A')}${detailItem('Employment',m.employment_sector||'N/A')}${detailItem('Aadhaar',m.aadhaar_number||'N/A')}</div></div>`).join('')}
    </div>
    <div class="modal-section"><div class="modal-section-title">Submission Info</div><div class="modal-detail-grid">
      ${detailItem('Household ID',String(h.id).slice(0,18))}${detailItem('Submitted By',formatPhone(h.enumeratorPhone))}${detailItem('Submitted On',new Date(h.createdAt).toLocaleString('en-IN'))}${detailItem('Total Members',1+(h.members?.length||0))}
    </div></div>`;
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

document.getElementById('household-modal').addEventListener('click', function(e) {
  if (e.target === this) closeHouseholdModal();
});

// ── EXPORT ─────────────────────────────────────────────
async function exportCSV() {
  const hh = await sbFetchAllHouseholds();
  if (!hh.length) { showToast('No data to export', 'error'); return; }
  const headers = ['ID','Head Name','State','District','Taluk','Pincode','Members','Enumerator','Date'];
  const rows = hh.map(h => [h.id, h.head.name, h.head.state||'', h.head.district||'', h.head.taluk||'', h.head.pincode||'', 1+(h.members?.length||0), formatPhone(h.enumeratorPhone), new Date(h.createdAt).toLocaleDateString('en-IN')]);
  const csv = [headers,...rows].map(r => r.join(',')).join('\n');
  downloadFile('census_data.csv', csv, 'text/csv');
  showToast('CSV exported successfully!', 'success');
}

async function exportJSON() {
  const hh = await sbFetchAllHouseholds();
  if (!hh.length) { showToast('No data to export', 'error'); return; }
  downloadFile('census_data.json', JSON.stringify(hh, null, 2), 'application/json');
  showToast('JSON exported successfully!', 'success');
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], {type});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// ── LOGOUT ─────────────────────────────────────────────
function logout() {
  ['user-dashboard','admin-dashboard'].forEach(id => document.getElementById(id).classList.add('hidden'));
  currentPhone = ''; currentRole = 'user'; memberCount = 0;
  document.getElementById('phone-input').value = '';
  document.getElementById('send-otp-btn').disabled = true;
  const step1 = document.getElementById('phone-step');
  const step2 = document.getElementById('otp-step');
  step2.style.display = 'none'; step2.classList.remove('active');
  step1.style.display = 'block'; step1.classList.add('active');
  clearOTP(); selectRole('user');
  document.getElementById('login-page').classList.remove('hidden');
  showToast('Logged out successfully', 'info');
}

// ── TOAST ──────────────────────────────────────────────
let toastTimer;
function showToast(msg, type='info') {
  clearTimeout(toastTimer);
  const toast = document.getElementById('toast');
  const icons = {success:'✅', error:'❌', info:'ℹ️', warning:'⚠️'};
  toast.querySelector('.toast-icon').textContent = icons[type]||'ℹ️';
  toast.querySelector('.toast-message').textContent = msg;
  toast.className = 'toast toast-' + type;
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => { toast.classList.add('hidden'); toast.style.opacity=''; toast.style.transform=''; }, 300);
  }, 3500);
}

// ── HELPERS ────────────────────────────────────────────
function setTextIfExists(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function getVal(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

const style = document.createElement('style');
style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
document.head.appendChild(style);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('household-modal').classList.contains('hidden')) closeHouseholdModal();
});
