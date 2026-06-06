/* =====================================================
   TARALABALU SHISHYA MANDALI APP — Supabase-Integrated Logic
   ===================================================== */

// ── SUPABASE CONFIG ───────────────────────────────────
const SUPABASE_URL      = 'https://ysgzawhxxovcatlhcbrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZ3phd2h4eG92Y2F0bGhjYnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTQyOTAsImV4cCI6MjA5NjI3MDI5MH0.BOpQt3pA5P4Oj2YE2sKTHY2Gy0_UDHqTOqJzz00tp0Y';

// ── CONSTANTS ──────────────────────────────────────────
const USER_OTP  = '123456';
const ADMIN_OTP = '654321';

// Pincode Lookup Dictionary for Karnataka location autocomplete
const PINCODE_MAP = {
  '577001': { state: 'Karnataka', district: 'Davanagere', taluk: 'Davanagere' },
  '577002': { state: 'Karnataka', district: 'Davanagere', taluk: 'Davanagere' },
  '577003': { state: 'Karnataka', district: 'Davanagere', taluk: 'Davanagere' },
  '577004': { state: 'Karnataka', district: 'Davanagere', taluk: 'Davanagere' },
  '577005': { state: 'Karnataka', district: 'Davanagere', taluk: 'Davanagere' },
  '577006': { state: 'Karnataka', district: 'Davanagere', taluk: 'Davanagere' },
  '577501': { state: 'Karnataka', district: 'Chitradurga', taluk: 'Chitradurga' },
  '577502': { state: 'Karnataka', district: 'Chitradurga', taluk: 'Chitradurga' },
  '577519': { state: 'Karnataka', district: 'Chitradurga', taluk: 'Holalkere' },
  '577526': { state: 'Karnataka', district: 'Chitradurga', taluk: 'Hosadurga' },
  '577541': { state: 'Karnataka', district: 'Chitradurga', taluk: 'Hiriyur' },
  '577601': { state: 'Karnataka', district: 'Davanagere', taluk: 'Harihar' },
  '577527': { state: 'Karnataka', district: 'Chitradurga', taluk: 'Sirigere' }
};

// Cascading District and Taluk Lookup Data
const LOCATION_DATA = {
  'Karnataka': {
    'Davanagere': ['Davanagere', 'Harihar', 'Honnali', 'Channagiri', 'Jagalur'],
    'Chitradurga': ['Chitradurga', 'Sirigere', 'Holalkere', 'Hosadurga', 'Hiriyur', 'Challakere', 'Molakalmuru'],
    'Bangalore': ['Bangalore North', 'Bangalore South', 'Bangalore East', 'Bangalore West', 'Anekal'],
    'Mysore': ['Mysore', 'Nanjangud', 'T. Narasipura', 'H.D. Kote', 'Hunsur', 'K.R. Nagar', 'Periyapatna'],
    'Hubli': ['Hubli City', 'Hubli Rural', 'Dharwad', 'Kalghatgi', 'Kundgol', 'Navalgund']
  },
  'Maharashtra': {
    'Mumbai': ['Mumbai City', 'Mumbai Suburban'],
    'Pune': ['Pune City', 'Haveli', 'Khed', 'Baramati', 'Shirur', 'Maval'],
    'Nagpur': ['Nagpur City', 'Nagpur Rural', 'Kamptee', 'Ramtek', 'Hingna', 'Umred']
  }
};

// ── Supabase Client (loaded via CDN dynamically) ──────
let supabase = null;

function loadSupabaseSDK() {
  if (SUPABASE_URL === 'YOUR_PROJECT_URL_HERE') {
    console.warn('⚠️ Supabase not configured. Running offline.');
    return;
  }
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.async = true;
  script.onload = () => {
    try {
      if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isOnline = true;
        console.log('✅ Supabase connected dynamically');
        // If a session was auto-restored, refresh data
        const sessionStr = localStorage.getItem('tsm_session');
        if (sessionStr) {
          if (currentRole === 'admin') {
            initAdminDashboard();
          } else {
            initUserDashboard();
          }
        }
      } else {
        console.warn('Supabase global not found.');
      }
    } catch(e) {
      console.error('Supabase init failed:', e);
    }
  };
  script.onerror = () => {
    console.warn('⚠️ Supabase CDN failed to load. Running offline (localStorage).');
  };
  document.head.appendChild(script);
}

// ── STATE ──────────────────────────────────────────────
let currentRole   = 'user';
let currentPhone  = '';
let enumeratorUuid = null;
let memberCount   = 0;
let currentStep   = 1;
let householdsDB  = [];
let enumeratorsDB = [];
let isOnline      = false;
let selectedHouseholdForCards = null;

// ── INIT ───────────────────────────────────────────────
function initApp() {
  try { loadDB(); }    catch(e) { console.error('Load DB error:', e); }
  try { updateDate(); } catch(e) { console.error('Update date error:', e); }
  
  // Theme load
  const savedTheme = localStorage.getItem('tsm_theme') || 'light';
  const body = document.body;
  if (savedTheme === 'dark') {
    body.classList.add('dark-theme');
    body.classList.remove('light-theme');
    document.querySelectorAll('.theme-toggle .theme-icon').forEach(el => el.textContent = '☀️');
  } else {
    body.classList.add('light-theme');
    body.classList.remove('dark-theme');
    document.querySelectorAll('.theme-toggle .theme-icon').forEach(el => el.textContent = '🌙');
  }

  // Session Restore check
  const sessionStr = localStorage.getItem('tsm_session');
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      currentPhone = session.phone;
      currentRole = session.role;

      // Skip login / splash directly to dashboard
      const splash = document.getElementById('splash-screen');
      if (splash) splash.classList.add('hidden');
      document.getElementById('login-page').classList.add('hidden');

      if (currentRole === 'admin') {
        initAdminDashboard();
        document.getElementById('admin-dashboard').classList.remove('hidden');
      } else {
        initUserDashboard();
        document.getElementById('user-dashboard').classList.remove('hidden');
      }
      loadSupabaseSDK();
      return; // Skip normal splash sequence
    } catch(e) {
      console.error('Session parsing failed:', e);
      localStorage.removeItem('tsm_session');
    }
  }

  runSplash(); // Run normal splash screen flow
  loadSupabaseSDK();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function runSplash() {
  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    const loginPage = document.getElementById('login-page');
    if (splash) {
      splash.style.transition = 'opacity 0.6s ease';
      splash.style.opacity    = '0';
    }
    setTimeout(() => {
      if (splash) splash.classList.add('hidden');
      if (loginPage) loginPage.classList.remove('hidden');
    }, 600);
  }, 2600);
}

// ── DB LAYER (Supabase or localStorage fallback) ───────
function loadDB() {
  try {
    householdsDB  = JSON.parse(localStorage.getItem('tsm_households'))  || [];
    enumeratorsDB = JSON.parse(localStorage.getItem('tsm_enumerators')) || [];
  } catch(e) {
    householdsDB = []; enumeratorsDB = [];
  }
}

function saveLocalDB() {
  localStorage.setItem('tsm_households',  JSON.stringify(householdsDB));
  localStorage.setItem('tsm_enumerators', JSON.stringify(enumeratorsDB));
}

// ─── SUPABASE: Register/fetch enumerator ──────────────
async function sbRegisterEnumerator(phone) {
  if (!isOnline) return;
  const { error } = await supabase.from('enumerators').upsert(
    { phone, name: 'Volunteer' },
    { onConflict: 'phone' }
  );
  if (error) console.error('Register enumerator error:', error);
}

// Helper: Get Enumerator UUID
async function getEnumeratorUuid(phone) {
  if (!isOnline) return null;
  try {
    const { data, error } = await supabase
      .from('enumerators')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching enumerator UUID:', error);
      return null;
    }
    
    if (data) {
      return data.id;
    }
    
    // Auto register if not exists
    const { data: newData, error: insertError } = await supabase
      .from('enumerators')
      .insert({ phone, name: 'Volunteer' })
      .select('id')
      .single();
      
    if (insertError) {
      console.error('Error auto-registering enumerator:', insertError);
      return null;
    }
    return newData.id;
  } catch (e) {
    console.error('Exception in getEnumeratorUuid:', e);
    return null;
  }
}

// Helper: Upload Base64 Image to Storage Bucket
async function uploadBase64Image(base64Data, filename) {
  if (!isOnline || !base64Data || !base64Data.startsWith('data:')) return base64Data;
  
  try {
    const parts = base64Data.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    const blob = new Blob([uInt8Array], { type: contentType });
    
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filename, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });
      
    if (error) {
      console.error('Storage upload error:', error);
      return base64Data; // Fallback to base64
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filename);
      
    return publicUrlData.publicUrl;
  } catch(e) {
    console.error('Upload exception:', e);
    return base64Data;
  }
}

// Helper: Group members view list into structured household objects
function groupMembersIntoHouseholds(membersList) {
  const hhMap = new Map();
  
  // Sort head first, then by sequential_id
  const sortedMembers = [...membersList].sort((a, b) => {
    if (a.is_head && !b.is_head) return -1;
    if (!a.is_head && b.is_head) return 1;
    return (a.sequential_id || 99) - (b.sequential_id || 99);
  });
  
  sortedMembers.forEach(m => {
    const hhId = m.household_id;
    if (!hhMap.has(hhId)) {
      hhMap.set(hhId, {
        id: hhId,
        enumeratorPhone: currentPhone,
        createdAt: m.household_created_at || m.created_at,
        head: null,
        members: []
      });
    }
    
    const hh = hhMap.get(hhId);
    const normalizedPerson = {
      id: m.id,
      name: m.name || '',
      relationship: m.relationship || '',
      dob: m.date_of_birth || '',
      age: m.age || '',
      gender: m.gender || '',
      aadhaar_number: m.aadhar_number || '', // Note: DB column is aadhar_number (without second 'a')
      mobile_number: m.mobile_number || '',
      marital_status: m.marital_status || '',
      education: m.education || '',
      employment_sector: m.employment_sector || '',
      occupation: m.occupation || '',
      traditional_occupation: m.traditional_occupation || '',
      country: m.country || 'India',
      state: m.state || '',
      district: m.district || '',
      taluk: m.taluk || '',
      nagara: m.nagara || '',
      ward: m.ward || '',
      pincode: m.pincode || '',
      profile_image_url: m.profile_image_url || '',
      sequential_id: m.sequential_id
    };
    
    if (m.is_head) {
      hh.head = normalizedPerson;
    } else {
      hh.members.push(normalizedPerson);
    }
  });
  
  return Array.from(hhMap.values()).filter(h => h.head !== null);
}

// ─── SUPABASE: Fetch enumerator's households ──────────
async function sbFetchMyHouseholds(phone) {
  if (!isOnline) return getMyHouseholdsLocal();
  try {
    if (!enumeratorUuid) {
      enumeratorUuid = await getEnumeratorUuid(phone);
    }
    if (!enumeratorUuid) return getMyHouseholdsLocal();
    
    const { data: members, error } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_user_id', enumeratorUuid)
      .order('household_created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching my households from view:', error);
      return getMyHouseholdsLocal();
    }
    
    return groupMembersIntoHouseholds(members || []);
  } catch(e) {
    console.error('Fetch my households error:', e);
    return getMyHouseholdsLocal();
  }
}

// ─── SUPABASE: Fetch ALL households (admin) ───────────
async function sbFetchAllHouseholds() {
  if (!isOnline) return householdsDB;
  try {
    const { data: members, error } = await supabase
      .from('household_members')
      .select('*')
      .order('household_created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching all households from view:', error);
      return householdsDB;
    }
    
    return groupMembersIntoHouseholds(members || []);
  } catch(e) {
    console.error('Fetch all households error:', e);
    return householdsDB;
  }
}

// ─── SUPABASE: Fetch all enumerators (admin) ──────────
async function sbFetchAllEnumerators() {
  if (!isOnline) return enumeratorsDB;
  try {
    const { data, error } = await supabase
      .from('enumerators')
      .select('*')
      .order('joined_at', { ascending: false });
    if (error) {
      console.error(error);
      return enumeratorsDB;
    }
    return data || [];
  } catch(e) {
    console.error('Fetch all enumerators error:', e);
    return enumeratorsDB;
  }
}

// ─── SUPABASE: Submit new household ───────────────────
async function sbSubmitHousehold(payload) {
  if (!isOnline) {
    householdsDB.push(payload);
    saveLocalDB();
    return { success: true, id: payload.id };
  }

  try {
    if (!enumeratorUuid) {
      enumeratorUuid = await getEnumeratorUuid(payload.enumeratorPhone);
    }
    if (!enumeratorUuid) return { success: false, error: 'Could not resolve volunteer ID' };

    // 1. Insert household row
    const { data: hhRow, error: hhErr } = await supabase
      .from('households')
      .insert({ user_id: enumeratorUuid })
      .select()
      .single();

    if (hhErr) return { success: false, error: hhErr.message };

    const hhId = hhRow.id;

    // 2. Upload head photo if base64
    if (payload.head.profile_image_url && payload.head.profile_image_url.startsWith('data:')) {
      const filename = `head_${hhId}_${Date.now()}.jpg`;
      payload.head.profile_image_url = await uploadBase64Image(payload.head.profile_image_url, filename);
    }

    // 3. Upload members photos if base64
    if (payload.members && payload.members.length > 0) {
      for (let i = 0; i < payload.members.length; i++) {
        const m = payload.members[i];
        if (m.profile_image_url && m.profile_image_url.startsWith('data:')) {
          const filename = `member_${hhId}_${i}_${Date.now()}.jpg`;
          m.profile_image_url = await uploadBase64Image(m.profile_image_url, filename);
        }
      }
    }

    // 4. Build members array (head first) with sequential_id
    const membersToInsert = [];
    
    // Head has sequential_id = 1
    membersToInsert.push({
      household_id: hhId,
      sequential_id: 1,
      ...flattenMember(payload.head, true)
    });

    // Members have sequential_id = 2, 3, etc. and inherit location from Head
    (payload.members || []).forEach((m, idx) => {
      if (m.name) {
        const memberData = {
          ...m,
          country: payload.head.country,
          state: payload.head.state,
          district: payload.head.district,
          taluk: payload.head.taluk,
          nagara: payload.head.nagara,
          ward: payload.head.ward,
          pincode: payload.head.pincode
        };
        membersToInsert.push({
          household_id: hhId,
          sequential_id: idx + 2,
          ...flattenMember(memberData, false)
        });
      }
    });

    const { error: mErr } = await supabase
      .from('persons')
      .insert(membersToInsert);
      
    if (mErr) return { success: false, error: mErr.message };

    // Update payload with new DB ID
    payload.id = hhId;
    
    // Cache locally
    householdsDB.push(payload);
    saveLocalDB();

    return { success: true, id: hhId };
  } catch(e) {
    return { success: false, error: e.message };
  }
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
      aadhaar_number:         head.aadhar_number || '',
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
      profile_image_url:      head.profile_image_url || '',
    },
    members: members.map(m => ({
      name:                   m.name,
      relationship:           m.relationship || '',
      dob:                    m.date_of_birth || '',
      age:                    m.age || '',
      gender:                 m.gender || '',
      aadhaar_number:         m.aadhar_number || '',
      mobile_number:          m.mobile_number || '',
      marital_status:         m.marital_status || '',
      education:              m.education || '',
      employment_sector:      m.employment_sector || '',
      occupation:             m.occupation || '',
      traditional_occupation: m.traditional_occupation || '',
      profile_image_url:      m.profile_image_url || '',
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
    aadhar_number:          m.aadhaar_number || null, // Map to DB column aadhar_number
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
    profile_image_url:      m.profile_image_url || null,
  };
}

// ── DATE HELPERS ───────────────────// ── LOGIN FLOW ─────────────────────────────────────────
function validatePhone() {
  const inp   = document.getElementById('phone-input');
  const btn   = document.getElementById('send-otp-btn');
  const err   = document.getElementById('phone-error');
  const val   = inp.value.replace(/\D/g, '');
  inp.value   = val;
  const valid = /^\d{10}$/.test(val);
  btn.disabled = !valid;
  if (valid || val.length === 0) err.classList.add('hidden');
  else if (val.length >= 10)    err.classList.remove('hidden');
}

function sendOTP() {
  const val = document.getElementById('phone-input').value;
  if (!/^\d{10}$/.test(val)) return;
  currentPhone = val;
  document.getElementById('display-phone').textContent = formatPhone(val);

  const step1 = document.getElementById('phone-step');
  const step2 = document.getElementById('otp-step');
  step1.classList.remove('active');
  setTimeout(() => {
    step1.style.display = 'none';
    step2.style.display = 'block';
    setTimeout(() => step2.classList.add('active'), 10);
    const otpInp = document.getElementById('otp-input-single');
    if (otpInp) {
      otpInp.value = '';
      otpInp.focus();
    }
    const verifyBtn = document.getElementById('verify-otp-btn');
    if (verifyBtn) verifyBtn.disabled = true;
  }, 200);
  showToast('OTP sent! Use: 123456 (Volunteer) or 654321 (Admin)', 'info');
}

function goBackToPhone() {
  const step1 = document.getElementById('phone-step');
  const step2 = document.getElementById('otp-step');
  step2.classList.remove('active');
  setTimeout(() => {
    step2.style.display = 'none';
    step1.style.display = 'block';
    setTimeout(() => step1.classList.add('active'), 10);
    const otpInp = document.getElementById('otp-input-single');
    if (otpInp) otpInp.value = '';
  }, 200);
}

function validateSingleOTP() {
  const inp = document.getElementById('otp-input-single');
  const btn = document.getElementById('verify-otp-btn');
  const err = document.getElementById('otp-error');
  if (!inp || !btn) return;
  
  const val = inp.value.replace(/\D/g, '');
  inp.value = val;
  
  const valid = val.length === 6;
  btn.disabled = !valid;
  if (valid || val.length === 0) {
    if (err) err.classList.add('hidden');
  }
}

async function verifyOTP() {
  const inp = document.getElementById('otp-input-single');
  if (!inp) return;
  
  const entered = inp.value.trim();
  const errEl   = document.getElementById('otp-error');

  if (entered.length < 6) {
    showToast('Please enter a 6-digit OTP', 'error');
    return;
  }

  if (entered === USER_OTP) {
    currentRole = 'user';
  } else if (entered === ADMIN_OTP) {
    currentRole = 'admin';
  } else {
    if (errEl) errEl.classList.remove('hidden');
    inp.style.borderColor = 'var(--danger)';
    inp.style.background  = 'rgba(239,68,68,0.1)';
    setTimeout(() => {
      inp.style.borderColor = '';
      inp.style.background  = '';
    }, 800);
    return;
  }

  if (errEl) errEl.classList.add('hidden');

  const btn = document.getElementById('verify-otp-btn');
  if (btn) { btn.disabled = true; btn.querySelector('span').textContent = 'Signing in...'; }

  if (currentRole === 'user') {
    await sbRegisterEnumerator(currentPhone);
    enumeratorUuid = await getEnumeratorUuid(currentPhone);
  }

  // Save Session in localStorage
  localStorage.setItem('tsm_session', JSON.stringify({ phone: currentPhone, role: currentRole }));

  document.getElementById('login-page').classList.add('hidden');
  if (btn) { btn.disabled = false; btn.querySelector('span').textContent = 'Verify & Continue'; }

  if (currentRole === 'admin') {
    await initAdminDashboard();
    document.getElementById('admin-dashboard').classList.remove('hidden');
    showToast('Welcome, Administrator!', 'success');
  } else {
    await initUserDashboard();
    document.getElementById('user-dashboard').classList.remove('hidden');
    showToast('Welcome back, Volunteer!', 'success');
  }
}

function resendOTP() {
  const inp = document.getElementById('otp-input-single');
  if (inp) {
    inp.value = '';
    inp.focus();
  }
  const verifyBtn = document.getElementById('verify-otp-btn');
  if (verifyBtn) verifyBtn.disabled = true;
  showToast('OTP resent! Use: 123456 (Volunteer) or 654321 (Admin)', 'info');
}

// ── LOCATION SELECT HANDLERS ─────────────────────────
function onStateChanged(prefix) {
  const stateEl = document.getElementById(prefix + '-state');
  const distEl  = document.getElementById(prefix + '-district');
  const talukEl = document.getElementById(prefix + '-taluk');
  
  if (!stateEl || !distEl || !talukEl) return;
  
  const stateVal = stateEl.value;
  
  // Clear district and taluk
  distEl.innerHTML = '<option value="">ಜಿಲ್ಲೆ ಆಯ್ಕೆಮಾಡಿ / Select District</option>';
  talukEl.innerHTML = '<option value="">ತಾಲ್ಲೂಕು ಆಯ್ಕೆಮಾಡಿ / Select Taluk</option>';
  
  if (stateVal && LOCATION_DATA[stateVal]) {
    Object.keys(LOCATION_DATA[stateVal]).forEach(dist => {
      const opt = document.createElement('option');
      opt.value = dist;
      opt.textContent = dist;
      distEl.appendChild(opt);
    });
  }
}

function onDistrictChanged(prefix) {
  const stateEl = document.getElementById(prefix + '-state');
  const distEl  = document.getElementById(prefix + '-district');
  const talukEl = document.getElementById(prefix + '-taluk');
  
  if (!stateEl || !distEl || !talukEl) return;
  
  const stateVal = stateEl.value;
  const distVal = distEl.value;
  
  // Clear taluk
  talukEl.innerHTML = '<option value="">ತಾಲ್ಲೂಕು ಆಯ್ಕೆಮಾಡಿ / Select Taluk</option>';
  
  if (stateVal && distVal && LOCATION_DATA[stateVal] && LOCATION_DATA[stateVal][distVal]) {
    LOCATION_DATA[stateVal][distVal].forEach(taluk => {
      const opt = document.createElement('option');
      opt.value = taluk;
      opt.textContent = taluk;
      talukEl.appendChild(opt);
    });
  }
}

// ── USER DASHBOARD INIT ────────────────────────────────
async function initUserDashboard() {
  const phone  = formatPhone(currentPhone);
  const letter = currentPhone.slice(0,1);

  setTextIfExists('sidebar-user-phone', phone);
  setTextIfExists('user-phone-display', 'Mobile: ' + phone);
  setTextIfExists('welcome-msg', getGreeting() + ', Volunteer!');
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
  loadLatestBroadcast(); // Fetch & display admin message board
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
  document.querySelectorAll('#user-dashboard .bottom-nav-item').forEach(n => n.classList.remove('active'));
  
  const target = document.getElementById('section-' + id);
  if (target) target.classList.add('active');
  
  if (clickedEl) clickedEl.classList.add('active');
  
  const titles = { 
    'dashboard-home': 'Dashboard', 
    'my-households': 'My Households', 
    'add-household': 'Add Household', 
    'view-cards': 'ID Cards / ಗುರುತಿನ ಚೀಟಿಗಳು',
    'my-profile': 'My Profile' 
  };
  setTextIfExists('page-title', titles[id] || id);
  
  if (id === 'add-household') resetWizard();
  if (id === 'my-households') {
    const hh = await sbFetchMyHouseholds(currentPhone);
    renderHouseholdsGrid(hh);
  }
  if (id === 'view-cards') {
    renderIDCardsSection();
  }
  if (window.innerWidth <= 900) closeSidebar();
}

async function showAdminSection(id, clickedEl) {
  document.querySelectorAll('#admin-dashboard .content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#admin-dashboard .bottom-nav-item').forEach(n => n.classList.remove('active'));
  
  const target = document.getElementById('section-' + id);
  if (target) target.classList.add('active');
  
  if (clickedEl) clickedEl.classList.add('active');
  
  const titles = { 
    'admin-overview': 'Admin Overview', 
    'admin-households': 'All Households', 
    'admin-enumerators': 'Registered Volunteers', 
    'admin-messages': 'Broadcast Message Board',
    'admin-reports': 'Reports' 
  };
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
  if (id === 'admin-messages') {
    renderAdminMessagesList();
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
  currentStep = 1; 
  memberCount = 0;
  
  [1,2,3,4].forEach(i => {
    document.getElementById('wcontent-' + i).classList.toggle('hidden', i !== 1);
    const ws = document.getElementById('wstep-' + i);
    ws.classList.remove('active','completed');
    if (i === 1) ws.classList.add('active');
  });
  
  document.getElementById('members-list').innerHTML = '';
  const emptyState = document.getElementById('no-members-empty-state');
  if (emptyState) emptyState.classList.remove('hidden');
  
  const selector = document.getElementById('member-count-selector');
  if (selector) selector.value = '0';
  
  // Reset preview avatar image to default placeholder
  const defaultSvg = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/></svg>";
  const headPreview = document.getElementById('head-avatar-preview');
  if (headPreview) headPreview.src = defaultSvg;
  
  const fileInp = document.getElementById('head-photo-input');
  if (fileInp) fileInp.value = '';

  ['head-name','head-dob','head-age','head-aadhaar','head-mobile','head-occupation','head-trad-occupation','head-district','head-taluk','head-nagara','head-ward','head-pincode']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['head-gender','head-marital','head-education','head-employment','head-state']
    .forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
}

function nextStep(from) {
  if (from === 1 && !document.getElementById('head-name').value.trim()) {
    showToast('ದಯವಿಟ್ಟು ಮುಖ್ಯಸ್ಥರ ಹೆಸರನ್ನು ನಮೂದಿಸಿ / Please enter head of household name', 'error'); return;
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

// ── MEMBER FORMS & SELECTOR ────────────────────────────
function adjustMemberForms(count) {
  const cnt = parseInt(count) || 0;
  const list = document.getElementById('members-list');
  const emptyState = document.getElementById('no-members-empty-state');
  
  if (emptyState) {
    emptyState.classList.toggle('hidden', cnt > 0);
  }
  
  const currentCount = list.querySelectorAll('.member-form-block').length;
  if (cnt > currentCount) {
    for (let i = currentCount; i < cnt; i++) {
      addMemberForm();
    }
  } else if (cnt < currentCount) {
    for (let i = currentCount; i > cnt; i--) {
      const block = list.querySelector(`.member-form-block:last-child`);
      if (block) block.remove();
    }
  }
  memberCount = cnt;
}

function addMemberForm() {
  const list = document.getElementById('members-list');
  const idx = list.querySelectorAll('.member-form-block').length + 1;
  const block = document.createElement('div');
  block.className = 'member-form-block';
  block.id = 'member-block-' + idx;
  block.innerHTML = `
    <div class="member-form-header">
      <h4>ಸದಸ್ಯ / Member ${idx}</h4>
      <button class="member-remove-btn" onclick="removeMember(${idx})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
    
    <!-- Photo Upload Frame for Member -->
    <div class="avatar-upload-container">
      <div class="avatar-preview-wrap">
        <img id="m${idx}-avatar-preview" src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/></svg>" alt="Preview" class="avatar-preview">
      </div>
      <div class="avatar-upload-btn-wrap">
        <label for="m${idx}-photo-input" class="avatar-upload-label">
          📸 ಫೋಟೋ ಸೇರಿಸಿ / Add Photo
        </label>
        <input type="file" id="m${idx}-photo-input" accept="image/*" onchange="previewAvatar(event, 'm${idx}-avatar-preview')" style="display: none;">
      </div>
    </div>
    
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">ಪೂರ್ಣ ಹೆಸರು / Full Name *</label>
        <input type="text" class="form-input" id="m${idx}-name" placeholder="Enter full name">
      </div>
      <div class="form-group">
        <label class="form-label">ಮುಖ್ಯಸ್ಥರೊಂದಿಗೆ ಸಂಬಂಧ / Relationship to Head</label>
        <select class="form-select" id="m${idx}-relationship">
          <option value="">ಸಂಬಂಧ ಆಯ್ಕೆಮಾಡಿ / Select Relationship</option>
          <option value="Spouse">ಪತಿ/ಪತ್ನಿ / Spouse</option>
          <option value="Son">ಮಗ / Son</option>
          <option value="Daughter">ಮಗಳು / Daughter</option>
          <option value="Father">ತಂದೆ / Father</option>
          <option value="Mother">ತಾಯಿ / Mother</option>
          <option value="Brother">ಸಹೋದರ / Brother</option>
          <option value="Sister">ಸಹೋದರಿ / Sister</option>
          <option value="Grandfather">ತಾತ / Grandfather</option>
          <option value="Grandmother">ಅಜ್ಜಿ / Grandmother</option>
          <option value="Grandson">ಮೊಮ್ಮಗ / Grandson</option>
          <option value="Granddaughter">ಮೊಮ್ಮಗಳು / Granddaughter</option>
          <option value="Uncle">ಚಿಕ್ಕಪ್ಪ/ದೊಡ್ಡಪ್ಪ / Uncle</option>
          <option value="Aunt">ಚಿಕ್ಕಮ್ಮ/ದೊಡ್ಡಮ್ಮ / Aunt</option>
          <option value="Other Relative">ಇತರ ಸಂಬಂಧಿ / Other Relative</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ಜನ್ಮ ದಿನಾಂಕ / Date of Birth</label>
        <input type="date" class="form-input" id="m${idx}-dob" onchange="calculateAge(this.value, 'm${idx}-age')">
      </div>
      <div class="form-group">
        <label class="form-label">ವಯಸ್ಸು / Age</label>
        <input type="number" class="form-input" id="m${idx}-age" placeholder="Age in years" min="0" max="150">
      </div>
      <div class="form-group">
        <label class="form-label">ಲಿಂಗ / Gender</label>
        <select class="form-select" id="m${idx}-gender">
          <option value="">ಲಿಂಗ ಆಯ್ಕೆಮಾಡಿ / Select Gender</option>
          <option value="Male">ಪುರುಷ / Male</option>
          <option value="Female">ಮಹಿಳೆ / Female</option>
          <option value="Other">ಇತರ / Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ವೈವಾಹಿಕ ಸ್ಥಿತಿ / Marital Status</label>
        <select class="form-select" id="m${idx}-marital">
          <option value="">ಸ್ಥಿತಿ ಆಯ್ಕೆಮಾಡಿ / Select Status</option>
          <option value="Single">ಅವಿವಾಹಿತ / Single</option>
          <option value="Married">ವಿವಾಹಿತ / Married</option>
          <option value="Widowed">ವಿಧವೆ/ವಿಧುರ / Widowed</option>
          <option value="Divorced">ವಿಚ್ಛೇದಿತ / Divorced</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ವಿದ್ಯಾಭ್ಯಾಸ / Education Level</label>
        <select class="form-select" id="m${idx}-education">
          <option value="">ವಿದ್ಯಾಭ್ಯಾಸ ಆಯ್ಕೆಮಾಡಿ / Select Education</option>
          <option value="Illiterate">ಅನಕ್ಷರಸ್ಥ / Illiterate</option>
          <option value="Primary">ಪ್ರಾಥಮಿಕ ಶಾಲೆ / Primary (1-5)</option>
          <option value="Middle">ಪ್ರೌಢಶಾಲೆ / Middle (6-8)</option>
          <option value="Secondary">ಮೆಟ್ರಿಕ್ / Secondary (9-10)</option>
          <option value="Higher Secondary">ಪಿಯುಸಿ / Higher Secondary (11-12)</option>
          <option value="Diploma">ಡಿಪ್ಲೋಮಾ / Diploma</option>
          <option value="Graduate">ಪದವಿ / Graduate</option>
          <option value="Post Graduate">ಸ್ನಾತಕೋತ್ತರ / Post Graduate</option>
          <option value="Doctorate">ಪಿಎಚ್‌ಡಿ / Doctorate</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ಉದ್ಯೋಗದ ವಲಯ / Employment Sector</label>
        <select class="form-select" id="m${idx}-employment">
          <option value="">ವಲಯ ಆಯ್ಕೆಮಾಡಿ / Select Sector</option>
          <option value="Agriculture">ಕೃಷಿ / Agriculture</option>
          <option value="Government">ಸರ್ಕಾರಿ / Government</option>
          <option value="Private">ಖಾಸಗಿ / Private</option>
          <option value="Self-Employed">ಸ್ವಯಂ ಉದ್ಯೋಗ / Self-Employed</option>
          <option value="Business">ವ್ಯಾಪಾರ / Business</option>
          <option value="Student">ವิด್ಯಾರ್ಥಿ / Student</option>
          <option value="Unemployed">ನಿರುದ್ಯೋಗಿ / Unemployed</option>
          <option value="Retired">ನಿವೃತ್ತ / Retired</option>
          <option value="Homemaker">ಮನೆಗೆಲಸ / Homemaker</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ಉದ್ಯೋಗ / Occupation</label>
        <input type="text" class="form-input" id="m${idx}-occupation" placeholder="Enter occupation">
      </div>
      <div class="form-group">
        <label class="form-label">ಕುಲ ಕಸುಬು / Traditional Occupation</label>
        <input type="text" class="form-input" id="m${idx}-trad" placeholder="Enter traditional occupation">
      </div>
    </div>`;
  list.appendChild(block);
  block.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeMember(idx) {
  const block = document.getElementById('member-block-' + idx);
  if (block) {
    block.style.opacity = '0'; block.style.transform = 'scale(0.95)';
    block.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      block.remove();
      const list = document.getElementById('members-list');
      const currentCount = list.querySelectorAll('.member-form-block').length;
      memberCount = currentCount;
      
      const selector = document.getElementById('member-count-selector');
      if (selector) selector.value = currentCount;

      const emptyState = document.getElementById('no-members-empty-state');
      if (emptyState) emptyState.classList.toggle('hidden', currentCount > 0);

      // Re-index remaining members list
      list.querySelectorAll('.member-form-block').forEach((blk, index) => {
        const newIdx = index + 1;
        blk.id = 'member-block-' + newIdx;
        const header = blk.querySelector('.member-form-header h4');
        if (header) header.textContent = `ಸದಸ್ಯ / Member ${newIdx}`;
        
        const removeBtn = blk.querySelector('.member-remove-btn');
        if (removeBtn) removeBtn.setAttribute('onclick', `removeMember(${newIdx})`);
        
        // Re-id preview/inputs
        const img = blk.querySelector('.avatar-preview');
        if (img) img.id = `m${newIdx}-avatar-preview`;
        
        const file = blk.querySelector('input[type="file"]');
        if (file) {
          file.id = `m${newIdx}-photo-input`;
          file.setAttribute('onchange', `previewAvatar(event, 'm${newIdx}-avatar-preview')`);
        }
        const label = blk.querySelector('.avatar-upload-label');
        if (label) label.setAttribute('for', `m${newIdx}-photo-input`);
        
        const nameField = blk.querySelector(`input[placeholder="Enter full name"]`);
        if (nameField) nameField.id = `m${newIdx}-name`;
        
        const relField = blk.querySelector(`.form-select[id$="-relationship"]`);
        if (relField) relField.id = `m${newIdx}-relationship`;
        
        const dobField = blk.querySelector(`input[type="date"]`);
        if (dobField) {
          dobField.id = `m${newIdx}-dob`;
          dobField.setAttribute('onchange', `calculateAge(this.value, 'm${newIdx}-age')`);
        }
        const ageField = blk.querySelector(`input[placeholder="Age in years"]`);
        if (ageField) ageField.id = `m${newIdx}-age`;
        
        const genField = blk.querySelector(`.form-select[id$="-gender"]`);
        if (genField) genField.id = `m${newIdx}-gender`;
        
        const marField = blk.querySelector(`.form-select[id$="-marital"]`);
        if (marField) marField.id = `m${newIdx}-marital`;
        
        const eduField = blk.querySelector(`.form-select[id$="-education"]`);
        if (eduField) eduField.id = `m${newIdx}-education`;
        
        const empField = blk.querySelector(`.form-select[id$="-employment"]`);
        if (empField) empField.id = `m${newIdx}-employment`;
        
        const occField = blk.querySelector(`input[placeholder="Enter occupation"]`);
        if (occField) occField.id = `m${newIdx}-occupation`;
        
        const traField = blk.querySelector(`input[placeholder="Enter traditional occupation"]`);
        if (traField) traField.id = `m${newIdx}-trad`;
      });
    }, 200);
  }
}

function collectMembers() {
  const members = [];
  document.querySelectorAll('.member-form-block').forEach(block => {
    const id = block.id.replace('member-block-','');
    
    // Get member avatar base64 if set
    const defaultSvgPrefix = 'data:image/svg+xml';
    const avatarImg = document.getElementById(`m${id}-avatar-preview`);
    const mPhoto = (avatarImg && avatarImg.src && !avatarImg.src.startsWith(defaultSvgPrefix)) ? avatarImg.src : '';

    const m  = {
      name: getVal('m'+id+'-name'), relationship: getVal('m'+id+'-relationship'),
      dob: getVal('m'+id+'-dob'), age: getVal('m'+id+'-age'),
      gender: getVal('m'+id+'-gender'), aadhaar_number: '', // No Aadhaar collected / kept empty
      mobile_number: '', // Can map custom field or leave blank, or let's check
      marital_status: getVal('m'+id+'-marital'),
      education: getVal('m'+id+'-education'), employment_sector: getVal('m'+id+'-employment'),
      occupation: getVal('m'+id+'-occupation'), traditional_occupation: getVal('m'+id+'-trad'),
      profile_image_url: mPhoto
    };
    if (m.name) members.push(m);
  });
  return members;
}

// ── SUBMIT HOUSEHOLD ───────────────────────────────────
async function submitHousehold() {
  const headName = document.getElementById('head-name').value.trim();
  if (!headName) { showToast('ಮುಖ್ಯಸ್ಥರ ಹೆಸರು ಕಡ್ಡಾಯ / Head of household name is required', 'error'); return; }

  const btn = document.querySelector('#wcontent-4 .btn-success');
  btn.disabled = true;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg><span>ನೋಂದಾಯಿಸಲಾಗುತ್ತಿದೆ... / Submitting...</span>';

  // Get head avatar base64 if set
  const defaultSvgPrefix = 'data:image/svg+xml';
  const headAvatarImg = document.getElementById('head-avatar-preview');
  const headPhoto = (headAvatarImg && headAvatarImg.src && !headAvatarImg.src.startsWith(defaultSvgPrefix)) ? headAvatarImg.src : '';

  const payload = {
    id: 'HH' + Date.now(),
    enumeratorPhone: currentPhone,
    createdAt: new Date().toISOString(),
    head: {
      name: headName, is_head: true,
      dob:  document.getElementById('head-dob').value,
      age:  document.getElementById('head-age').value,
      gender: document.getElementById('head-gender').value,
      aadhaar_number: '', // Stripped / No Aadhaar
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
      profile_image_url: headPhoto
    },
    members: collectMembers()
  };

  const result = await sbSubmitHousehold(payload);

  btn.disabled = false;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>ನೋಂದಾಯಿಸಿ ಮತ್ತು ಕಾರ್ಡ್ ಸೃಷ್ಟಿಸಿ / Register & Generate Cards</span>';

  if (result.success) {
    showToast('✅ ಯಶಸ್ವಿಯಾಗಿ ನೋಂದಾಯಿಸಲಾಗಿದೆ / Submitting successful!', 'success');
    await initUserDashboard();
    
    // Redirect directly to View Cards tab
    selectedHouseholdForCards = result.id;
    showSection('view-cards', document.querySelector('.bottom-nav-item:nth-child(2)'));
  } else {
    showToast('❌ Failed: ' + (result.error || 'Unknown error'), 'error');
  }
}

// ── RENDER FUNCTIONS ───────────────────────────────────
function renderRecentHouseholds(hh) {
  const container = document.getElementById('recent-households-list');
  const list = (hh || []).slice(0, 3);
  if (!list.length) {
    container.innerHTML = `<div class="empty-state-small"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><p>ಯಾವುದೇ ಕುಟುಂಬಗಳಿಲ್ಲ. ಹೊಸ ಕುಟುಂಬ ಸೇರಿಸಿ! / No households yet.</p></div>`;
    return;
  }
  container.innerHTML = list.map(h => `
    <div class="preview-card" onclick="openHouseholdModal('${h.id}')">
      <div class="preview-avatar">${(h.head.name||'?')[0].toUpperCase()}</div>
      <div class="preview-info">
        <div class="preview-name">${h.head.name}</div>
        <div class="preview-sub">${h.head.taluk || h.head.district || 'N/A'} · ${1+(h.members?.length||0)} ಸದಸ್ಯರು / members</div>
      </div>
    </div>`).join('');
}

function renderHouseholdsGrid(hh) {
  const container = document.getElementById('households-grid');
  const list = hh || [];
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏠</div><h3>ಯಾವುದೇ ಕುಟುಂಬಗಳು ಕಂಡುಬಂದಿಲ್ಲ / No Households Added</h3><p>ಪ್ರಥಮ ಕುಟುಂಬದ ವಿವರಗಳನ್ನು ನೋಂದಾಯಿಸಲು ಕೆಳಗಿನ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ</p><button class="btn-primary" onclick="showSection('add-household', document.querySelector('.bottom-nav-item:nth-child(1)'))"><span>ಕುಟುಂಬ ಸೇರಿಸಿ / Add Household</span></button></div>`;
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
        <span class="hh-tag tag-members">👥 ${mc} ಸದಸ್ಯರು / Member${mc>1?'s':''}</span>
        ${h.head.taluk?`<span class="hh-tag tag-location">${h.head.taluk}</span>`:''}
        ${h.head.pincode?`<span class="hh-tag tag-state">${h.head.pincode}</span>`:''}
      </div>
    </div>`;
}

async function filterHouseholds() {
  const q  = document.getElementById('household-search').value.toLowerCase().trim();
  const hh = await sbFetchMyHouseholds(currentPhone);
  const filtered = hh.filter(h => (h.head.name||'').toLowerCase().includes(q) || (h.head.taluk||'').toLowerCase().includes(q) || (h.head.pincode||'').includes(q));
  const container = document.getElementById('households-grid');
  if (!filtered.length) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>ಯಾವುದೇ ಫಲಿತಾಂಶಗಳಿಲ್ಲ / No Results Found</h3><p>"${q}" ಗೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ವಿವರಗಳಿಲ್ಲ</p></div>`; return; }
  container.innerHTML = filtered.map(h => householdCardHTML(h)).join('');
}

function renderAdminRecentList(hh) {
  const container = document.getElementById('admin-recent-list');
  const list = (hh||[]).slice(0,4);
  if (!list.length) { container.innerHTML = `<div class="empty-state-small"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg><p>ಯಾವುದೇ ದಾಖಲೆಗಳಿಲ್ಲ / No data yet</p></div>`; return; }
  container.innerHTML = list.map(h => `
    <div class="preview-card" onclick="openHouseholdModal('${h.id}')">
      <div class="preview-avatar">${(h.head.name||'?')[0].toUpperCase()}</div>
      <div class="preview-info">
        <div class="preview-name">${h.head.name}</div>
        <div class="preview-sub">${formatPhone(h.enumeratorPhone)} · ${h.head.pincode||'N/A'}</div>
      </div>
    </div>`).join('');
}

function renderAdminHouseholdsGrid(hh) {
  const container = document.getElementById('admin-households-grid');
  if (!(hh||[]).length) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><h3>ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ / No Records</h3><p>ಸ್ವಯಂಸೇವಕರು ನೋಂದಾಯಿಸಿದ ನಂತರ ಇಲ್ಲಿ ಗೋಚರಿಸುತ್ತದೆ / Data will appear here once volunteers submit entries.</p></div>`; return; }
  container.innerHTML = hh.map(h => householdCardHTML(h)).join('');
}

async function filterAdminHouseholds() {
  const q  = document.getElementById('admin-search').value.toLowerCase().trim();
  const hh = await sbFetchAllHouseholds();
  
  // Search/Filter by Name, Pincode, State, Taluk, District, and Enumerator Phone
  const filtered = hh.filter(h => 
    (h.head.name||'').toLowerCase().includes(q) || 
    (h.head.pincode||'').toLowerCase().includes(q) || 
    (h.head.state||'').toLowerCase().includes(q) || 
    (h.head.taluk||'').toLowerCase().includes(q) || 
    (h.head.district||'').toLowerCase().includes(q) || 
    (h.enumeratorPhone||'').includes(q)
  );
  
  const container = document.getElementById('admin-households-grid');
  if (!filtered.length) { 
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><h3>ಯಾವುದೇ ಫಲಿತಾಂಶಗಳಿಲ್ಲ / No Results</h3><p>ಹುಡುಕಾಟಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವ ಯಾವುದೇ ಕುಟುಂಬಗಳಿಲ್ಲ / No households match your search</p></div>`; 
    return; 
  }
  container.innerHTML = filtered.map(h => householdCardHTML(h)).join('');
}

function renderEnumeratorsList(en, allHH) {
  const container = document.getElementById('enumerators-list');
  if (!(en||[]).length) { container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">👥</div><h3>ಯಾರೂ ನೋಂದಾಯಿಸಿಲ್ಲ / No Volunteers</h3><p>ಸ್ವಯಂಸೇವಕರು ಲಾಗಿನ್ ಆದ ನಂತರ ಇಲ್ಲಿ ಗೋಚರಿಸುತ್ತದೆ / Volunteers appear here once they log in.</p></div>`; return; }
  container.innerHTML = (en||[]).map(e => {
    const hhCount = (allHH||[]).filter(h => h.enumeratorPhone === e.phone).length;
    return `<div class="enumerator-card"><div class="enumerator-avatar">${(e.phone||'?').slice(0,1)}</div><div class="enum-info"><div class="enum-name">ಸ್ವಯಂಸೇವಕ / Volunteer</div><div class="enum-phone">${formatPhone(e.phone)}</div><div class="enum-stat">📋 ${hhCount} ಕುಟುಂಬಗಳು ನೋಂದಾಯಿತ / households</div></div></div>`;
  }).join('');
}

// ── HOUSEHOLD MODAL ────────────────────────────────────
function openHouseholdModal(id) {
  const h = householdsDB.find(hh => String(hh.id) === String(id));
  if (!h) return;
  
  const muttId = generateMuttID(h.head.name, h.head.mobile_number, h.head.pincode);
  
  document.getElementById('modal-title').textContent = `${h.head.name} - ಕುಟುಂಬದ ವಿವರ / Household Details`;
  const body = document.getElementById('modal-content');
  body.innerHTML = `
    <div class="modal-section"><div class="modal-section-title">ಕುಟುಂಬದ ಮುಖ್ಯಸ್ಥರು / Head of Household</div><div class="modal-detail-grid">
      ${detailItem('ಸದಸ್ಯತ್ವ ಐಡಿ / Member Mutt ID', muttId)}
      ${detailItem('ಪೂರ್ಣ ಹೆಸರು / Name',h.head.name)}
      ${detailItem('ಲಿಂಗ / Gender',h.head.gender||'N/A')}
      ${detailItem('ಜನ್ಮ ದಿನಾಂಕ / DOB',h.head.dob||'N/A')}
      ${detailItem('ವಯಸ್ಸು / Age',h.head.age||'N/A')}
      ${detailItem('ಮೊಬೈಲ್ / Mobile',h.head.mobile_number||'N/A')}
      ${detailItem('ವೈವಾಹಿಕ ಸ್ಥಿತಿ / Marital Status',h.head.marital_status||'N/A')}
      ${detailItem('ವಿದ್ಯಾಭ್ಯಾಸ / Education',h.head.education||'N/A')}
      ${detailItem('ಉದ್ಯೋಗ ವಲಯ / Employment',h.head.employment_sector||'N/A')}
      ${detailItem('ಉದ್ಯೋಗ / Occupation',h.head.occupation||'N/A')}
      ${detailItem('ಕುಲ ಕಸುಬು / Trad Occupation',h.head.traditional_occupation||'N/A')}
    </div></div>
    <div class="modal-section"><div class="modal-section-title">ವಾಸಸ್ಥಳದ ವಿವರಗಳು / Location</div><div class="modal-detail-grid">
      ${detailItem('ದೇಶ / Country',h.head.country||'India')}
      ${detailItem('ರಾಜ್ಯ / State',h.head.state||'N/A')}
      ${detailItem('ಜಿಲ್ಲೆ / District',h.head.district||'N/A')}
      ${detailItem('ತಾಲ್ಲೂಕು / Taluk',h.head.taluk||'N/A')}
      ${detailItem('ನಗರ/ಗ್ರಾಮ / Nagara / Town',h.head.nagara||'N/A')}
      ${detailItem('ವಾರ್ಡ್ / ಗ್ರಾಮ / Ward / Village',h.head.ward||'N/A')}
      ${detailItem('ಪಿನ್ ಕೋಡ್ / Pincode',h.head.pincode||'N/A')}
    </div></div>
    <div class="modal-section"><div class="modal-section-title">ಕುಟುಂಬದ ಹೆಚ್ಚುವರಿ ಸದಸ್ಯರು / Household Members (${h.members?.length||0})</div>
      ${!(h.members?.length)?'<p style="color:var(--text-muted);font-size:0.85rem;padding-left:10px;">ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ಸದಸ್ಯರಿಲ್ಲ / No additional members.</p>':h.members.map(m=>`
        <div class="member-block"><div class="member-block-header"><div class="member-mini-avatar">${(m.name||'?')[0].toUpperCase()}</div><div><div class="member-mini-name">${m.name||'Unknown'}</div><div class="member-mini-rel">${m.relationship||'N/A'}</div></div></div>
        <div class="modal-detail-grid">
          ${detailItem('ಸದಸ್ಯತ್ವ ಐಡಿ / Mutt ID', generateMuttID(m.name, m.mobile_number, h.head.pincode))}
          ${detailItem('ವಯಸ್ಸು / Age',m.age||'N/A')}
          ${detailItem('ಲಿಂಗ / Gender',m.gender||'N/A')}
          ${detailItem('ವೈವಾಹಿಕ ಸ್ಥಿತಿ / Marital Status',m.marital_status||'N/A')}
          ${detailItem('ವಿದ್ಯಾಭ್ಯಾಸ / Education',m.education||'N/A')}
          ${detailItem('ಉದ್ಯೋಗ / Occupation',m.occupation||'N/A')}
        </div></div>`).join('')}
    </div>
    <div class="modal-section"><div class="modal-section-title">ನೋಂದಣಿ ಮಾಹಿತಿ / Submission Info</div><div class="modal-detail-grid">
      ${detailItem('ಕುಟುಂಬದ ಕೋಡ್ / Household ID',String(h.id).slice(0,18))}
      ${detailItem('ನೋಂದಾಯಿಸಿದವರು / Volunteer Phone',formatPhone(h.enumeratorPhone))}
      ${detailItem('ನೋಂದಾಯಿಸಿದ ದಿನಾಂಕ / Registered On',new Date(h.createdAt).toLocaleString('en-IN'))}
      ${detailItem('ಒಟ್ಟು ಸದಸ್ಯರು / Total Members',1+(h.members?.length||0))}
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

const modalEl = document.getElementById('household-modal');
if (modalEl) {
  modalEl.addEventListener('click', function(e) {
    if (e.target === this) closeHouseholdModal();
  });
}

// ── EXPORT ─────────────────────────────────────────────
async function exportCSV() {
  const hh = await sbFetchAllHouseholds();
  if (!hh.length) { showToast('ಡೌನ್‌ಲೋಡ್ ಮಾಡಲು ಮಾಹಿತಿಯಿಲ್ಲ / No data to export', 'error'); return; }
  const headers = ['Mutt ID', 'Head Name', 'State', 'District', 'Taluk', 'Pincode', 'Total Members', 'Enumerator Phone', 'Date Registered'];
  const rows = hh.map(h => [
    generateMuttID(h.head.name, h.head.mobile_number, h.head.pincode), 
    h.head.name, 
    h.head.state||'', 
    h.head.district||'', 
    h.head.taluk||'', 
    h.head.pincode||'', 
    1+(h.members?.length||0), 
    formatPhone(h.enumeratorPhone), 
    new Date(h.createdAt).toLocaleDateString('en-IN')
  ]);
  const csv = [headers,...rows].map(r => r.join(',')).join('\n');
  downloadFile('tsm_data.csv', csv, 'text/csv');
  showToast('CSV file downloaded successfully!', 'success');
}

async function exportJSON() {
  const hh = await sbFetchAllHouseholds();
  if (!hh.length) { showToast('ಡೌನ್‌ಲೋಡ್ ಮಾಡಲು ಮಾಹಿತಿಯಿಲ್ಲ / No data to export', 'error'); return; }
  downloadFile('tsm_data.json', JSON.stringify(hh, null, 2), 'application/json');
  showToast('JSON file downloaded successfully!', 'success');
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
  
  // Clear persistent session
  localStorage.removeItem('tsm_session');

  currentPhone = ''; 
  currentRole = 'user'; 
  memberCount = 0;
  selectedHouseholdForCards = null;

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
function showToast(msg, type='info') {
  clearTimeout(toastTimer);
  const toast = document.getElementById('toast');
  if (!toast) return;
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
  if (e.key === 'Escape') {
    const modal = document.getElementById('household-modal');
    if (modal && !modal.classList.contains('hidden')) closeHouseholdModal();
  }
});

// ── THEME TOGGLE FUNCTION ──────────────────────────────
function toggleTheme() {
  const body = document.body;
  const isDark = body.classList.toggle('dark-theme');
  body.classList.toggle('light-theme', !isDark);

  // Update theme icons in toggle buttons
  document.querySelectorAll('.theme-toggle .theme-icon').forEach(el => {
    el.textContent = isDark ? '☀️' : '🌙';
  });

  localStorage.setItem('tsm_theme', isDark ? 'dark' : 'light');
}

// ── LOCATION AUTOCOMPLETE FUNCTION ──────────────────────
function autocompleteLocation(pincode) {
  const pin = pincode.replace(/\D/g, '');
  const input = document.getElementById('head-pincode');
  if (input) input.value = pin;
  
  if (pin.length === 6) {
    const loc = PINCODE_MAP[pin];
    if (loc) {
      const stateEl = document.getElementById('head-state');
      const distEl  = document.getElementById('head-district');
      const talukEl = document.getElementById('head-taluk');
      
      if (stateEl) stateEl.value = loc.state;
      if (distEl)  distEl.value  = loc.district;
      if (talukEl) talukEl.value = loc.taluk;
      showToast('ಸ್ಥಳ ಪತ್ತೆಯಾಗಿದೆ / Location auto-populated', 'success');
    }
  }
}

// ── AVATAR UPLOAD AND AGE CALCULATION HELPERS ───────────
function previewAvatar(event, previewId) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = document.getElementById(previewId);
    if (img) {
      img.src = e.target.result;
    }
  };
  reader.readAsDataURL(file);
}

function calculateAge(dobString, ageInputId) {
  if (!dobString) return;
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  const input = document.getElementById(ageInputId);
  if (input) {
    input.value = Math.max(0, age);
  }
}

// ── GENERATE INDIVIDUAL ID CARDS ────────────────────────
async function renderIDCardsSection() {
  const container = document.getElementById('cards-container');
  if (!container) return;
  
  const myHH = await sbFetchMyHouseholds(currentPhone);
  
  // If no households, show empty state
  if (!myHH || myHH.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📇</div>
        <h3>ಯಾವುದೇ ಕಾರ್ಡ್‌ಗಳಿಲ್ಲ / No Cards Available</h3>
        <p>ಕಾರ್ಡ್‌ಗಳನ್ನು ಸೃಷ್ಟಿಸಲು ಮೊದಲು ಕುಟುಂಬದ ವಿವರಗಳನ್ನು ನೋಂದಾಯಿಸಿ / Register a household first to generate ID cards.</p>
        <button class="btn-primary" onclick="showSection('add-household', document.querySelector('.bottom-nav-item:nth-child(1)'))">
          <span>ಕುಟುಂಬ ಸೇರಿಸಿ / Add Household</span>
        </button>
      </div>
    `;
    const oldSelector = document.getElementById('hh-card-selector-wrap');
    if (oldSelector) oldSelector.remove();
    return;
  }
  
  // Choose household
  let targetHH = null;
  if (selectedHouseholdForCards) {
    targetHH = myHH.find(h => String(h.id) === String(selectedHouseholdForCards));
  }
  if (!targetHH) {
    targetHH = myHH[0];
    selectedHouseholdForCards = targetHH.id;
  }
  
  // Render selector dropdown
  let selectorWrap = document.getElementById('hh-card-selector-wrap');
  if (!selectorWrap) {
    selectorWrap = document.createElement('div');
    selectorWrap.id = 'hh-card-selector-wrap';
    selectorWrap.style.marginBottom = '20px';
    selectorWrap.style.display = 'flex';
    selectorWrap.style.alignItems = 'center';
    selectorWrap.style.gap = '10px';
    
    const section = document.getElementById('section-view-cards');
    section.insertBefore(selectorWrap, container);
  }
  
  selectorWrap.innerHTML = `
    <label class="form-label" style="margin-bottom:0; font-size:0.85rem; color:var(--text-secondary);">ಕುಟುಂಬ ಆಯ್ಕೆಮಾಡಿ / Select Household:</label>
    <select id="hh-card-select" class="form-select" style="max-width:300px; padding:8px 12px; margin-left:10px;" onchange="selectHouseholdCards(this.value)">
      ${myHH.map(h => `<option value="${h.id}" ${String(h.id) === String(selectedHouseholdForCards) ? 'selected' : ''}>${h.head.name} (${h.head.pincode})</option>`).join('')}
    </select>
  `;
  
  // Generate head and member cards
  const cardsHTML = [];
  cardsHTML.push(generateSingleCardHTML(targetHH.head, 'Head / ಮುಖ್ಯಸ್ಥ', targetHH.head.pincode, targetHH, 1));
  
  if (targetHH.members && targetHH.members.length > 0) {
    targetHH.members.forEach((m, idx) => {
      cardsHTML.push(generateSingleCardHTML(m, m.relationship || 'Member / ಸದಸ್ಯ', targetHH.head.pincode, targetHH, idx + 2));
    });
  }
  
  container.innerHTML = cardsHTML.join('');
}

function selectHouseholdCards(val) {
  selectedHouseholdForCards = val;
  renderIDCardsSection();
}

function generateMuttID(name, phone, pincode) {
  const pin = pincode || '577001';
  const str = (name || '') + (phone || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const rand = Math.abs(hash) % 9000 + 1000;
  return `TSM-${pin}-${rand}`;
}

function generateSingleCardHTML(person, roleText, pincode, hh, seqId) {
  const muttId = generateMuttID(person.name, person.mobile_number || hh.head.mobile_number, pincode);
  const phone = person.mobile_number ? formatPhone(person.mobile_number) : (hh.head.mobile_number ? formatPhone(hh.head.mobile_number) : 'N/A');
  const occupation = person.occupation || 'N/A';
  const aadhaar = hh.head.aadhaar_number || 'N/A';
  const district = hh.head.district || 'Sirigere';
  
  const addressParts = [];
  if (hh.head.ward) addressParts.push(hh.head.ward);
  if (hh.head.nagara) addressParts.push(hh.head.nagara);
  if (hh.head.taluk) addressParts.push(hh.head.taluk);
  if (hh.head.district) addressParts.push(hh.head.district);
  if (pincode) addressParts.push(pincode);
  const address = addressParts.join(', ') || 'Sirigere Mutt';
  
  const photoSrc = person.profile_image_url || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23aaa" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>';
  
  // Clean SVG Icons
  const iconBriefcase = `<svg class="id-card-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
  const iconPhone = `<svg class="id-card-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
  const iconCard = `<svg class="id-card-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`;
  const iconMapPin = `<svg class="id-card-row-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

  const cardId = `card-${hh.id}-${seqId}`;

  return `
    <div class="id-card-container" id="${cardId}">
      <!-- Floating Download Button -->
      <button class="id-card-download-btn" onclick="downloadSingleCardImage('${cardId}', '${person.name.replace(/'/g, "\\'")}')" title="Download ID Card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      </button>
      
      <div class="id-card-main">
        <div class="id-card-bg-watermark"></div>
        <div class="id-card-overlay"></div>
        
        <div class="id-card-content">
          <!-- Left Panel -->
          <div class="id-card-left">
            <div class="id-card-avatar-wrap">
              <img src="${photoSrc}" class="id-card-avatar" alt="Photo" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%23aaa\\' stroke-width=\\'1.5\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\'/></svg>'">
            </div>
            <div class="id-card-rel-label">${roleText.toUpperCase()}</div>
            <div class="id-card-age-tag">AGE: ${person.age || 'N/A'}</div>
          </div>
          
          <!-- Right Panel -->
          <div class="id-card-right">
            <div class="id-card-name" title="${person.name}">${person.name}</div>
            <div class="id-card-seq-id">ID: ${seqId}</div>
            <hr class="id-card-divider">
            
            <div class="id-card-rows">
              <div class="id-card-row" title="Occupation: ${occupation}">
                ${iconBriefcase}
                <span class="id-card-row-text">${occupation}</span>
              </div>
              <div class="id-card-row" title="Phone: ${phone}">
                ${iconPhone}
                <span class="id-card-row-text">${phone}</span>
              </div>
              <div class="id-card-row" title="Aadhaar: ${aadhaar}">
                ${iconCard}
                <span class="id-card-row-text">${aadhaar}</span>
              </div>
              <div class="id-card-row" title="District: ${district}">
                ${iconMapPin}
                <span class="id-card-row-text">${district}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function downloadSingleCardImage(cardId, name) {
  const cardElement = document.getElementById(cardId);
  if (!cardElement) return;

  const imgElement = cardElement.querySelector('.id-card-avatar');
  const originalSrc = imgElement ? imgElement.src : '';
  let tempBase64 = '';

  try {
    if (originalSrc && !originalSrc.startsWith('data:') && !originalSrc.startsWith('blob:')) {
      showToast('Preparing download...', 'info');
      const response = await fetch(originalSrc);
      const blob = await response.blob();
      tempBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      imgElement.src = tempBase64;
    }

    const downloadBtn = cardElement.querySelector('.id-card-download-btn');
    if (downloadBtn) downloadBtn.style.display = 'none';

    const canvas = await html2canvas(cardElement.querySelector('.id-card-main'), {
      useCORS: true,
      allowTaint: false,
      scale: 2
    });

    if (downloadBtn) downloadBtn.style.display = '';

    if (imgElement && tempBase64) {
      imgElement.src = originalSrc;
    }

    const link = document.createElement('a');
    link.download = `${name.replace(/\s+/g, '_')}_ID_Card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('ID Card downloaded successfully!', 'success');
  } catch (error) {
    console.error('Download failed:', error);
    showToast('Download failed. Please try printing or screenshot instead.', 'error');
    const downloadBtn = cardElement.querySelector('.id-card-download-btn');
    if (downloadBtn) downloadBtn.style.display = '';
    if (imgElement && originalSrc) imgElement.src = originalSrc;
  }
}

// ── BROADCAST MESSAGE BOARD LOGIC ──────────────────────
async function sbFetchBroadcastMessages() {
  if (!isOnline) return getLocalBroadcastMessages();
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Fetch broadcasts from Supabase failed, using local fallback:', error.message);
      return getLocalBroadcastMessages();
    }
    return data || [];
  } catch (e) {
    console.warn('Fetch broadcasts exception, using local fallback:', e);
    return getLocalBroadcastMessages();
  }
}

async function sbBroadcastMessage(text, imgUrl) {
  const payload = {
    text: text,
    image_url: imgUrl,
    created_at: new Date().toISOString()
  };
  
  if (isOnline) {
    try {
      const { error } = await supabase.from('messages').insert(payload);
      if (!error) {
        saveLocalBroadcast(payload);
        return { success: true };
      }
      console.warn('Insert broadcast to Supabase failed, saving local:', error.message);
    } catch(e) {
      console.warn('Insert broadcast exception:', e);
    }
  }
  
  saveLocalBroadcast(payload);
  return { success: true };
}

function getLocalBroadcastMessages() {
  try {
    return JSON.parse(localStorage.getItem('tsm_broadcasts')) || [];
  } catch(e) {
    return [];
  }
}

function saveLocalBroadcast(msg) {
  try {
    const list = getLocalBroadcastMessages();
    list.unshift(msg);
    localStorage.setItem('tsm_broadcasts', JSON.stringify(list));
  } catch(e) {
    console.error('Save local broadcast error:', e);
  }
}

async function loadLatestBroadcast() {
  const msgs = await sbFetchBroadcastMessages();
  const board = document.getElementById('broadcast-message-board');
  if (!board) return;
  
  if (msgs && msgs.length > 0) {
    const latest = msgs[0];
    const textEl = document.getElementById('broadcast-msg-text');
    const timeEl = document.getElementById('broadcast-msg-time');
    const imgWrap = document.getElementById('broadcast-msg-image-wrap');
    const imgEl = document.getElementById('broadcast-msg-image');
    
    if (textEl) textEl.textContent = latest.text;
    if (timeEl) {
      const date = new Date(latest.created_at || latest.createdAt);
      timeEl.textContent = date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    
    const hasImage = latest.image_url || latest.imageUrl;
    if (hasImage) {
      if (imgEl) imgEl.src = latest.image_url || latest.imageUrl;
      if (imgWrap) imgWrap.classList.remove('hidden');
    } else {
      if (imgWrap) imgWrap.classList.add('hidden');
    }
    
    board.classList.remove('hidden');
  } else {
    board.classList.add('hidden');
  }
}

async function sendAdminBroadcastMessage() {
  const textVal = getVal('admin-message-text');
  const imgVal  = getVal('admin-message-img-url');
  
  if (!textVal) {
    showToast('ದಯವಿಟ್ಟು ಸಂದೇಶ ಬರೆಯಿರಿ / Please enter message text', 'error');
    return;
  }
  
  const btn = document.querySelector('.compose-message-box button');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('span').textContent = 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ... / Sending...';
  }
  
  const res = await sbBroadcastMessage(textVal, imgVal);
  
  if (btn) {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'ಸಂದೇಶ ಪ್ರಸಾರ ಮಾಡಿ / Broadcast Message';
  }
  
  if (res.success) {
    showToast('✅ ಸಂದೇಶ ಪ್ರಸಾರ ಮಾಡಲಾಗಿದೆ / Message broadcasted successfully!', 'success');
    const textInput = document.getElementById('admin-message-text');
    const imgInput  = document.getElementById('admin-message-img-url');
    if (textInput) textInput.value = '';
    if (imgInput) imgInput.value = '';
    await renderAdminMessagesList();
  } else {
    showToast('❌ Failed to broadcast message', 'error');
  }
}

async function renderAdminMessagesList() {
  const container = document.getElementById('admin-messages-list');
  if (!container) return;
  
  const msgs = await sbFetchBroadcastMessages();
  if (!msgs || msgs.length === 0) {
    container.innerHTML = `<p class="empty-text" style="color:var(--text-muted); padding: 20px 0;">ಯಾವುದೇ ಸಂದೇಶಗಳಿಲ್ಲ / No messages broadcasted yet.</p>`;
    return;
  }
  
  container.innerHTML = msgs.map((m, idx) => {
    const time = new Date(m.created_at || m.createdAt).toLocaleString('en-IN');
    const hasImage = m.image_url || m.imageUrl;
    return `
      <div class="admin-broadcast-card">
        <div class="admin-broadcast-card-content">
          <p class="admin-broadcast-card-text">${m.text}</p>
          ${hasImage ? `<img src="${m.image_url || m.imageUrl}" class="admin-broadcast-card-img-preview" alt="Broadcast Image">` : ''}
          <div class="admin-broadcast-card-meta">📅 ${time}</div>
        </div>
        <button class="btn-delete-broadcast" onclick="deleteBroadcastMessage(${idx})" title="Delete Message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    `;
  }).join('');
}

async function deleteBroadcastMessage(index) {
  const msgs = await sbFetchBroadcastMessages();
  if (msgs && msgs[index]) {
    const target = msgs[index];
    if (isOnline && target.id) {
      try {
        await supabase.from('messages').delete().eq('id', target.id);
      } catch (e) {
        console.error('Delete online message failed:', e);
      }
    }
    
    const localMsgs = getLocalBroadcastMessages();
    const updated = localMsgs.filter((_, idx) => idx !== index);
    localStorage.setItem('tsm_broadcasts', JSON.stringify(updated));
    showToast('ಸಂದೇಶವನ್ನು ಅಳಿಸಲಾಗಿದೆ / Message deleted', 'info');
    await renderAdminMessagesList();
  }
}
