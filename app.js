/* =====================================================
   TARALABALU SHISHYA MANDALI — Application Logic
   ===================================================== */

const SUPABASE_URL = 'https://ysgzawhxxovcatlhcbrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZ3phd2h4eG92Y2F0bGhjYnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTQyOTAsImV4cCI6MjA5NjI3MDI5MH0.BOpQt3pA5P4Oj2YE2sKTHY2Gy0_UDHqTOqJzz00tp0Y';

let supabaseClient = null;

// OTP Constants
const USER_OTP = '123456';
const ADMIN_OTP = '654321';

// App State
let currentUserPhone = '';
let currentUserRole = '';
let allMembers = [];
let filteredMembers = [];
let countriesList = [];

// Dynamic Vachana list for the Welcome tab
const VACHANAS_DATA = [
  {
    message: "ಕಳಬೇಡ, ಕೊಲಬೇಡ, ಹುಸಿಯ ನುಡಿಯಲು ಬೇಡ, ಮುನಿಯಬೇಡ, ಅನ್ಯರಿಗೆ ಅಸಹ್ಯಪಡಬೇಡ, ತನ್ನ ಬಣ್ಣಿಸಬೇಡ, ಇದಿರು ಹಳಿಯಬೇಡ. ಇದೇ ಅಂತರಂಗಶುದ್ಧಿ, ಇದೇ ಬಹಿರಂಗಶುದ್ಧಿ, ಇದೇ ನಮ್ಮ ಕೂಡಲಸಂಗಮದೇವನನೊಲಿಸುವ ಪರಿ.",
    author: "ಬಸವಣ್ಣ / Basavanna",
    timestamp: "ವಚನ ಸಾರ / Vachana Essence"
  },
  {
    message: "ಜ್ಞಾನದ ಬಲದಿಂದ ಅಜ್ಞಾನ ಕಳಚು ನೋಡಾ, ಜ್ಯೋತಿಯ ಬಲದಿಂದ ಕತ್ತಲೆ ಕಳಚು ನೋಡಾ, ಸತ್ಯದ ಬಲದಿಂದ ಅಸತ್ಯ ಕಳಚು ನೋಡಾ, ಶರಣನ ಜ್ಞಾನದಿಂದ ಸಂಸಾರ ಭೀತಿ ಕಳಚು ನೋಡಾ, ಚೆನ್ನಮಲ್ಲಿಕಾರ್ಜುನ.",
    author: "ಅಕ್ಕಮಹಾದೇವಿ / Akka Mahadevi",
    timestamp: "ಜ್ಞಾನ ಮಾರ್ಗ / Path of Knowledge"
  },
  {
    message: "ಕಾಯಕವೇ ಕೈಲಾಸ ನೋಡಾ, ಶರಣರ ನುಡಿಗಳೇ ಮಂತ್ರ ನೋಡಾ, ಸದಾಚಾರವೇ ಸ್ವರ್ಗ ನೋಡಾ, ದುರಾಚಾರವೇ ನರಕ ನೋಡಾ.",
    author: "ನುಲಿಯ ಚಂದಯ್ಯ / Nuliya Chandayya",
    timestamp: "ಕಾಯಕ ತತ್ವ / Work is Worship"
  },
  {
    message: "ನೆಲನೊಂದೇ ಹೊಲಗೇರಿ ಶಿವಾಲಯಕ್ಕೆ, ಜಲನೊಂದೇ ಶೌಚಾಚಮನಕ್ಕೆ, ಕುಲನೊಂದೇ ತನ್ನ ತಾನರಿದವಂಗೆ, ಫಲನೊಂದೇ ತನ್ನ ತಾನರಿದವಂಗೆ, ಆತ್ಮಾ ರಾಮಲಿಂಗೇಶ್ವರ.",
    author: "ಸರ್ವಜ್ಞ / Sarvajna",
    timestamp: "ಸಮಾನತೆ / Equality Message"
  }
];

// ── INITIALIZATION ───────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  setupEventListeners();
  checkSession();
});

function initSupabase() {
  try {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase connected.');
    } else {
      console.error('❌ Supabase SDK not loaded.');
      showToast('Supabase SDK not loaded. Working offline.', 'error');
    }
  } catch (error) {
    console.error('Supabase init error:', error);
  }
}

function setupEventListeners() {
  // Phone input formatting and button validator
  const phoneInput = document.getElementById('phone-input');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      let val = phoneInput.value.replace(/\D/g, '');
      phoneInput.value = val;
      const sendOtpBtn = document.getElementById('send-otp-btn');
      if (sendOtpBtn) {
        sendOtpBtn.disabled = val.length !== 10;
      }
    });
  }

  // OTP format validator
  const otpInput = document.getElementById('otp-input');
  if (otpInput) {
    otpInput.addEventListener('input', () => {
      otpInput.value = otpInput.value.replace(/\D/g, '');
    });
  }
}

function checkSession() {
  const sessionStr = localStorage.getItem('tsm_session');
  const splashScreen = document.getElementById('splash-screen');
  
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr);
      currentUserPhone = session.phone;
      currentUserRole = session.role;
      
      // Hide splash & login, show dashboards
      if (splashScreen) splashScreen.classList.add('hidden');
      document.getElementById('login-page').classList.add('hidden');
      
      if (currentUserRole === 'admin') {
        showAdminPortal();
      } else {
        showUserPortal();
      }
      return;
    } catch (e) {
      console.error('Failed to parse session:', e);
      localStorage.removeItem('tsm_session');
    }
  }

  // Splash Screen timeout sequence (2.5 seconds)
  setTimeout(() => {
    if (splashScreen) {
      splashScreen.style.transition = 'opacity 0.5s ease';
      splashScreen.style.opacity = '0';
      setTimeout(() => {
        splashScreen.classList.add('hidden');
      }, 500);
    }
  }, 2500);
}

// ── AUTHENTICATION FLOW ──────────────────────────────
function sendOTP() {
  const phone = document.getElementById('phone-input').value;
  if (phone.length === 10) {
    document.getElementById('login-phone-section').classList.add('hidden');
    document.getElementById('login-otp-section').classList.remove('hidden');
    document.getElementById('otp-input').focus();
    showToast('OTP sent (use 123456 = User, 654321 = Admin)', 'info');
  }
}

function changePhoneNumber() {
  document.getElementById('login-otp-section').classList.add('hidden');
  document.getElementById('login-phone-section').classList.remove('hidden');
  document.getElementById('phone-input').focus();
}

function verifyOTP() {
  const phone = document.getElementById('phone-input').value;
  const otp = document.getElementById('otp-input').value;
  const otpError = document.getElementById('otp-error');
  
  if (otp === USER_OTP || otp === ADMIN_OTP) {
    otpError.classList.add('hidden');
    currentUserPhone = phone;
    currentUserRole = otp === USER_OTP ? 'user' : 'admin';
    
    localStorage.setItem('tsm_session', JSON.stringify({
      phone: currentUserPhone,
      role: currentUserRole
    }));
    
    document.getElementById('login-page').classList.add('hidden');
    
    if (currentUserRole === 'admin') {
      showAdminPortal();
    } else {
      showUserPortal();
    }
  } else {
    otpError.classList.remove('hidden');
  }
}

// ── USER PORTAL & FORMS ──────────────────────────────
async function showUserPortal() {
  document.getElementById('user-portal').classList.remove('hidden');
  switchUserTab('fill-form');
  
  // Load geographical datasets
  await loadCountriesDropdown();
  
  // Restore autosaved data
  await restoreAutosaveForm();
  
  // Render vachanas list
  renderWelcomeVachanas();
}

function switchUserTab(tabName) {
  document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  
  if (tabName === 'fill-form') {
    document.getElementById('tab-fill-form').classList.remove('hidden');
    document.querySelector('.bottom-nav button:nth-child(1)').classList.add('active');
  } else if (tabName === 'view-cards') {
    document.getElementById('tab-view-cards').classList.remove('hidden');
    document.querySelector('.bottom-nav button:nth-child(2)').classList.add('active');
    loadUserCards();
  } else if (tabName === 'welcome') {
    document.getElementById('tab-welcome').classList.remove('hidden');
    document.querySelector('.bottom-nav button:nth-child(3)').classList.add('active');
  }
}

// Load countries list from Database
async function loadCountriesDropdown() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('countries')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) throw error;
    countriesList = data || [];
    
    // Populate Head card country selection list & Admin Filter
    populateDropdown('head-country', countriesList);
    populateDropdown('edit-country', countriesList);
    populateDropdown('admin-filter-country', countriesList);
  } catch (err) {
    console.error('Failed to fetch countries:', err);
  }
}

// ── DYNAMIC FAMILY MEMBER CARDS GENERATION ───────────
function onExtraMembersCountChanged() {
  const countSelect = document.getElementById('extra-members-count');
  const count = parseInt(countSelect.value);
  renderFamilyMembers(count);
  saveAutosaveForm();
}

function renderFamilyMembers(count) {
  const container = document.getElementById('family-members-container');
  container.innerHTML = '';
  
  for (let i = 0; i < count; i++) {
    const cardHtml = `
      <div class="form-card" id="member-card-${i}">
        <div class="form-card-header" onclick="toggleCardCollapse('member-${i}')">
          <div class="card-left-header">
            <div class="card-avatar member-avatar">👤</div>
            <div class="card-header-titles">
              <h4 id="member-header-name-${i}">Member ${i + 1}</h4>
              <p id="member-header-sub-${i}">Family Member Details</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <button type="button" class="btn-delete-card" onclick="deleteFamilyMemberCard(${i})" title="Remove Member">×</button>
            <div class="card-collapse-icon" id="member-collapse-icon-${i}">▲</div>
          </div>
        </div>
        
        <div class="form-card-body" id="member-card-body-${i}">
          <!-- Photo Upload -->
          <div class="photo-upload-section">
            <div class="photo-preview-container" onclick="triggerPhotoSelect('member-${i}')">
              <img id="member-photo-preview-${i}" src="" class="hidden" alt="Profile Preview">
              <div id="member-photo-placeholder-${i}" class="photo-placeholder">
                <span class="placeholder-icon">📸</span>
                <span class="placeholder-text">Add Profile Photo</span>
              </div>
            </div>
            <input type="file" id="member-photo-input-${i}" accept="image/*" class="hidden" onchange="previewMemberPhoto('member-${i}', event)">
            <p class="field-hint">Tap circle to choose profile image</p>
          </div>

          <!-- Personal Info -->
          <h4 class="form-group-title">Personal Info</h4>
          <div class="input-field">
            <label for="member-fullname-${i}">Name / ಹೆಸರು *</label>
            <input type="text" id="member-fullname-${i}" required oninput="updateMemberHeaderName(${i})">
          </div>

          <div class="form-row">
            <div class="input-field width-50">
              <label for="member-relationship-${i}">Relationship / ಸಂಬಂಧ *</label>
              <select id="member-relationship-${i}" required onchange="saveAutosaveForm()">
                <option value="Spouse / ಪತ್ನಿ/ಪತಿ">Spouse / ಪತ್ನಿ/ಪತಿ</option>
                <option value="Son / ಮಗ">Son / ಮಗ</option>
                <option value="Daughter / ಮಗಳು">Daughter / ಮಗಳು</option>
                <option value="Father / ತಂದೆ">Father / ತಂದೆ</option>
                <option value="Mother / ತಾಯಿ">Mother / ತಾಯಿ</option>
              </select>
            </div>
            <div class="input-field width-50">
              <label for="member-marital-${i}">Marital Status *</label>
              <select id="member-marital-${i}" required onchange="saveAutosaveForm()">
                <option value="Single / ಅವಿವಾಹಿತ">Single / ಅವಿವಾಹಿತ</option>
                <option value="Married / ವಿವಾಹಿತ">Married / ವಿವಾಹಿತ</option>
                <option value="Divorced / ವಿಚ್ಛೇದಿತ">Divorced / ವಿಚ್ಛೇದಿತ</option>
                <option value="Widowed / ವಿಧವೆ/ವಿಧುರ">Widowed / ವಿಧವೆ/ವಿಧುರ</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="input-field width-50">
              <label for="member-dob-${i}">Date of Birth / ಜನ್ಮ ದಿನಾಂಕ *</label>
              <input type="date" id="member-dob-${i}" required onchange="onDobChanged('member-${i}')">
            </div>
            <div class="input-field width-50">
              <label for="member-age-${i}">Age / ವಯಸ್ಸು</label>
              <input type="text" id="member-age-${i}" readonly placeholder="Auto-calculated">
            </div>
          </div>

          <div class="input-field">
            <label for="member-aadhar-${i}">Aadhar Number / ಆಧಾರ್ ಸಂಖ್ಯೆ</label>
            <input type="text" id="member-aadhar-${i}" placeholder="0000 0000 0000" maxlength="14" oninput="formatAadharInput('member-${i}')">
          </div>

          <div class="input-field text-phone">
            <label for="member-phone-${i}">Mobile Number / ಮೊಬೈಲ್ ಸಂಖ್ಯೆ</label>
            <input type="tel" id="member-phone-${i}" maxlength="10" oninput="saveAutosaveForm()">
          </div>

          <div class="input-field">
            <label for="member-education-${i}">Education / ಶಿಕ್ಷಣ</label>
            <input type="text" id="member-education-${i}" oninput="saveAutosaveForm()">
          </div>

          <div class="form-row">
            <div class="input-field width-50">
              <label for="member-sector-${i}">Employment Sector</label>
              <select id="member-sector-${i}" onchange="saveAutosaveForm()">
                <option value="Government / ಸರ್ಕಾರಿ">Government / ಸರ್ಕಾರಿ</option>
                <option value="Private / ಖಾಸಗಿ">Private / ಖಾಸಗಿ</option>
                <option value="Self / ಸ್ವಯಂ">Self / ಸ್ವಯಂ</option>
                <option value="Student / ವಿದ್ಯಾರ್ಥಿ">Student / ವಿದ್ಯಾರ್ಥಿ</option>
                <option value="None / ಇಲ್ಲ">None / ಇಲ್ಲ</option>
              </select>
            </div>
            <div class="input-field width-50">
              <label for="member-occupation-${i}">Occupation / ಉದ್ಯೋಗ</label>
              <input type="text" id="member-occupation-${i}" oninput="saveAutosaveForm()">
            </div>
          </div>

          <div class="input-field">
            <label for="member-traditional-occ-${i}">Traditional Occupation / ಸಾಂಪ್ರದಾಯಿಕ ಉದ್ಯೋಗ</label>
            <input type="text" id="member-traditional-occ-${i}" oninput="saveAutosaveForm()">
          </div>

          <!-- Location Dropdowns -->
          <h4 class="form-group-title">Address / ವಿಳಾಸ</h4>
          
          <div class="input-field">
            <label for="member-country-${i}">Country / ದೇಶ *</label>
            <select id="member-country-${i}" required onchange="onCascadeChange('member-${i}', 'country')">
              <option value="">Select Country</option>
            </select>
          </div>

          <div class="form-row">
            <div class="input-field width-50">
              <label for="member-state-${i}">State / ರಾಜ್ಯ *</label>
              <select id="member-state-${i}" required onchange="onCascadeChange('member-${i}', 'state')" disabled>
                <option value="">Select State</option>
              </select>
            </div>
            <div class="input-field width-50">
              <label for="member-district-${i}">District / ಜಿಲ್ಲೆ *</label>
              <select id="member-district-${i}" required onchange="onCascadeChange('member-${i}', 'district')" disabled>
                <option value="">Select District</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="input-field width-50">
              <label for="member-taluk-${i}">Taluk / ತಾಲ್ಲೂಕು *</label>
              <select id="member-taluk-${i}" required onchange="onCascadeChange('member-${i}', 'taluk')" disabled>
                <option value="">Select Taluk</option>
              </select>
            </div>
            <div class="input-field width-50">
              <label for="member-ward-${i}">Ward / ವಾರ್ಡ್ / Nagara *</label>
              <select id="member-ward-${i}" required onchange="saveAutosaveForm()" disabled>
                <option value="">Select Ward</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="input-field width-50">
              <label for="member-pincode-${i}">Pincode *</label>
              <input type="text" id="member-pincode-${i}" maxlength="6" required oninput="onPincodeChange('member-${i}')">
            </div>
          </div>

          <div class="input-field">
            <label for="member-address-${i}">Full Address / ಪೂರ್ಣ ವಿಳಾಸ *</label>
            <textarea id="member-address-${i}" rows="3" required oninput="saveAutosaveForm()"></textarea>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
    populateDropdown(`member-country-${i}`, countriesList);
  }
}

function updateMemberHeaderName(index) {
  const val = document.getElementById(`member-fullname-${index}`).value.trim();
  const title = document.getElementById(`member-header-name-${index}`);
  title.textContent = val || `Member ${index + 1}`;
  saveAutosaveForm();
}

function deleteFamilyMemberCard(index) {
  event.stopPropagation(); // Stop collapse click
  if (confirm(`Remove Member ${index + 1}?`)) {
    const countSelect = document.getElementById('extra-members-count');
    let count = parseInt(countSelect.value);
    
    // We remove the card and decrement selection
    const card = document.getElementById(`member-card-${index}`);
    if (card) {
      card.remove();
    }
    
    // Read state from currently rendered DOM to shift index positions
    const container = document.getElementById('family-members-container');
    const cards = container.querySelectorAll('.form-card');
    
    // Re-render remaining cards with updated indexes to maintain integrity
    const savedData = serializeFormState();
    savedData.members.splice(index, 1);
    savedData.membersCount = savedData.members.length;
    
    countSelect.value = savedData.membersCount;
    restoreSerializedState(savedData);
  }
}

// Expandable / Collapsible cards function
function toggleCardCollapse(cardPrefix) {
  const body = document.getElementById(`${cardPrefix}-card-body`);
  const icon = document.getElementById(`${cardPrefix}-collapse-icon`);
  
  if (body.classList.contains('hidden')) {
    body.classList.remove('hidden');
    icon.textContent = '▲';
  } else {
    body.classList.add('hidden');
    icon.textContent = '▼';
  }
}

// File Picker Trigger
function triggerPhotoSelect(cardPrefix) {
  document.getElementById(`${cardPrefix}-photo-input`).click();
}

function previewMemberPhoto(cardPrefix, event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById(`${cardPrefix}-photo-preview`);
    const placeholder = document.getElementById(`${cardPrefix}-photo-placeholder`);
    
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    
    saveAutosaveForm();
  };
  reader.readAsDataURL(file);
}

// ── CASCADES SYSTEM FOR DYNAMIC DROPDOWNS ────────────
async function onCascadeChange(cardPrefix, level) {
  if (!supabaseClient) return;
  
  const countryId = document.getElementById(`${cardPrefix}-country`).value;
  const stateSelect = document.getElementById(`${cardPrefix}-state`);
  const districtSelect = document.getElementById(`${cardPrefix}-district`);
  const talukSelect = document.getElementById(`${cardPrefix}-taluk`);
  const wardSelect = document.getElementById(`${cardPrefix}-ward`);
  
  if (level === 'country') {
    resetDropdown(stateSelect, 'Select State');
    resetDropdown(districtSelect, 'Select District');
    resetDropdown(talukSelect, 'Select Taluk');
    resetDropdown(wardSelect, 'Select Ward');
    if (!countryId) { saveAutosaveForm(); return; }
    
    try {
      const { data, error } = await supabaseClient.from('states').select('*').eq('country_id', countryId).order('name', { ascending: true });
      if (error) throw error;
      populateDropdown(`${cardPrefix}-state`, data || []);
      stateSelect.disabled = false;
    } catch (err) { console.error(err); }
    
  } else if (level === 'state') {
    const stateId = stateSelect.value;
    resetDropdown(districtSelect, 'Select District');
    resetDropdown(talukSelect, 'Select Taluk');
    resetDropdown(wardSelect, 'Select Ward');
    if (!stateId) { saveAutosaveForm(); return; }
    
    try {
      const { data, error } = await supabaseClient.from('districts').select('*').eq('state_id', stateId).order('name', { ascending: true });
      if (error) throw error;
      populateDropdown(`${cardPrefix}-district`, data || []);
      districtSelect.disabled = false;
    } catch (err) { console.error(err); }
    
  } else if (level === 'district') {
    const districtId = districtSelect.value;
    resetDropdown(talukSelect, 'Select Taluk');
    resetDropdown(wardSelect, 'Select Ward');
    if (!districtId) { saveAutosaveForm(); return; }
    
    try {
      const { data, error } = await supabaseClient.from('taluks').select('*').eq('district_id', districtId).order('name', { ascending: true });
      if (error) throw error;
      populateDropdown(`${cardPrefix}-taluk`, data || []);
      talukSelect.disabled = false;
    } catch (err) { console.error(err); }
    
  } else if (level === 'taluk') {
    const talukId = talukSelect.value;
    resetDropdown(wardSelect, 'Select Ward');
    if (!talukId) { saveAutosaveForm(); return; }
    
    try {
      const { data, error } = await supabaseClient.from('wards').select('*').eq('taluk_id', talukId).order('name', { ascending: true });
      if (error) throw error;
      populateDropdown(`${cardPrefix}-ward`, data || []);
      wardSelect.disabled = false;
    } catch (err) { console.error(err); }
  }
  
  saveAutosaveForm();
}

// DOB listener programmatically calculates Age
function onDobChanged(cardPrefix) {
  const dobVal = document.getElementById(`${cardPrefix}-dob`).value;
  const ageInput = document.getElementById(`${cardPrefix}-age`);
  
  if (dobVal) {
    const dob = new Date(dobVal);
    const today = new Date();
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }
    ageInput.value = calculatedAge >= 0 ? calculatedAge : 0;
  } else {
    ageInput.value = '';
  }
  saveAutosaveForm();
}

// Pincode Autocomplete programmatically sets cascades
const PINCODE_LOOKUP = {
  '577001': { countryId: '1', stateId: '1', districtId: '1', talukId: '1' },
  '577002': { countryId: '1', stateId: '1', districtId: '1', talukId: '1' },
  '577527': { countryId: '1', stateId: '1', districtId: '2', talukId: '6' }
};

async function onPincodeChange(cardPrefix) {
  const pincode = document.getElementById(`${cardPrefix}-pincode`).value.trim();
  if (pincode.length === 6 && PINCODE_LOOKUP[pincode]) {
    const lookup = PINCODE_LOOKUP[pincode];
    showLoading(true, 'Resolving locations from Pincode...');
    
    try {
      document.getElementById(`${cardPrefix}-country`).value = lookup.countryId;
      await onCascadeChange(cardPrefix, 'country');
      
      document.getElementById(`${cardPrefix}-state`).value = lookup.stateId;
      await onCascadeChange(cardPrefix, 'state');
      
      document.getElementById(`${cardPrefix}-district`).value = lookup.districtId;
      await onCascadeChange(cardPrefix, 'district');
      
      document.getElementById(`${cardPrefix}-taluk`).value = lookup.talukId;
      await onCascadeChange(cardPrefix, 'taluk');
    } catch (e) {
      console.error(e);
    } finally {
      showLoading(false);
    }
  }
  saveAutosaveForm();
}

function formatAadharInput(cardPrefix) {
  const input = document.getElementById(`${cardPrefix}-aadhar`);
  let val = input.value.replace(/\D/g, '');
  
  // Format with spaces
  let formatted = '';
  for (let i = 0; i < val.length; i++) {
    formatted += val[i];
    if ((i + 1) % 4 === 0 && (i + 1) !== 12 && (i + 1) !== val.length) {
      formatted += ' ';
    }
  }
  input.value = formatted;
  saveAutosaveForm();
}

// ── SERIALIZATION AND AUTO-SAVE ──────────────────────
function serializeFormState() {
  const extraCount = parseInt(document.getElementById('extra-members-count').value);
  const state = {
    membersCount: extraCount,
    head: {
      fullname: document.getElementById('head-fullname').value,
      phone: document.getElementById('head-phone').value,
      dob: document.getElementById('head-dob').value,
      age: document.getElementById('head-age').value,
      aadhar: document.getElementById('head-aadhar').value,
      education: document.getElementById('head-education').value,
      marital: document.getElementById('head-marital').value,
      sector: document.getElementById('head-sector').value,
      occupation: document.getElementById('head-occupation').value,
      traditionalOcc: document.getElementById('head-traditional-occ').value,
      country: document.getElementById('head-country').value,
      state: document.getElementById('head-state').value,
      district: document.getElementById('head-district').value,
      taluk: document.getElementById('head-taluk').value,
      ward: document.getElementById('head-ward').value,
      pincode: document.getElementById('head-pincode').value,
      address: document.getElementById('head-address').value,
      photoBase64: document.getElementById('head-photo-preview').classList.contains('hidden') ? null : document.getElementById('head-photo-preview').src
    },
    members: []
  };
  
  for (let i = 0; i < extraCount; i++) {
    // If elements are present in DOM
    const cardBody = document.getElementById(`member-card-body-${i}`);
    if (cardBody) {
      state.members.push({
        fullname: document.getElementById(`member-fullname-${i}`).value,
        phone: document.getElementById(`member-phone-${i}`).value,
        dob: document.getElementById(`member-dob-${i}`).value,
        age: document.getElementById(`member-age-${i}`).value,
        aadhar: document.getElementById(`member-aadhar-${i}`).value,
        relationship: document.getElementById(`member-relationship-${i}`).value,
        education: document.getElementById(`member-education-${i}`).value,
        marital: document.getElementById(`member-marital-${i}`).value,
        sector: document.getElementById(`member-sector-${i}`).value,
        occupation: document.getElementById(`member-occupation-${i}`).value,
        traditionalOcc: document.getElementById(`member-traditional-occ-${i}`).value,
        country: document.getElementById(`member-country-${i}`).value,
        state: document.getElementById(`member-state-${i}`).value,
        district: document.getElementById(`member-district-${i}`).value,
        taluk: document.getElementById(`member-taluk-${i}`).value,
        ward: document.getElementById(`member-ward-${i}`).value,
        pincode: document.getElementById(`member-pincode-${i}`).value,
        address: document.getElementById(`member-address-${i}`).value,
        photoBase64: document.getElementById(`member-photo-preview-${i}`).classList.contains('hidden') ? null : document.getElementById(`member-photo-preview-${i}`).src
      });
    }
  }
  return state;
}

function saveAutosaveForm() {
  const state = serializeFormState();
  localStorage.setItem('tsm_multi_autosave', JSON.stringify(state));
}

async function restoreAutosaveForm() {
  const savedDataStr = localStorage.getItem('tsm_multi_autosave');
  if (!savedDataStr) return;
  
  try {
    const state = JSON.parse(savedDataStr);
    await restoreSerializedState(state);
  } catch (error) {
    console.error('Autosave restoration failed:', error);
  }
}

async function restoreSerializedState(state) {
  showLoading(true, 'Restoring your changes...');
  
  document.getElementById('extra-members-count').value = state.membersCount;
  renderFamilyMembers(state.membersCount);
  
  // 1. Restore Head
  const h = state.head;
  document.getElementById('head-fullname').value = h.fullname || '';
  document.getElementById('head-phone').value = h.phone || '';
  document.getElementById('head-dob').value = h.dob || '';
  document.getElementById('head-age').value = h.age || '';
  document.getElementById('head-aadhar').value = h.aadhar || '';
  document.getElementById('head-education').value = h.education || '';
  document.getElementById('head-marital').value = h.marital || 'Single / ಅವಿವಾಹಿತ';
  document.getElementById('head-sector').value = h.sector || 'Government / ಸರ್ಕಾರಿ';
  document.getElementById('head-occupation').value = h.occupation || '';
  document.getElementById('head-traditional-occ').value = h.traditionalOcc || '';
  document.getElementById('head-pincode').value = h.pincode || '';
  document.getElementById('head-address').value = h.address || '';
  
  if (h.photoBase64) {
    const preview = document.getElementById('head-photo-preview');
    const placeholder = document.getElementById('head-photo-placeholder');
    preview.src = h.photoBase64;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  }
  
  // Chain cascades for Head
  if (h.country) {
    document.getElementById('head-country').value = h.country;
    await onCascadeChange('head', 'country');
    if (h.state) {
      document.getElementById('head-state').value = h.state;
      await onCascadeChange('head', 'state');
      if (h.district) {
        document.getElementById('head-district').value = h.district;
        await onCascadeChange('head', 'district');
        if (h.taluk) {
          document.getElementById('head-taluk').value = h.taluk;
          await onCascadeChange('head', 'taluk');
          if (h.ward) {
            document.getElementById('head-ward').value = h.ward;
          }
        }
      }
    }
  }
  
  // 2. Restore Family Members
  for (let i = 0; i < state.members.length; i++) {
    const m = state.members[i];
    if (!m) continue;
    
    document.getElementById(`member-fullname-${i}`).value = m.fullname || '';
    document.getElementById(`member-phone-${i}`).value = m.phone || '';
    document.getElementById(`member-dob-${i}`).value = m.dob || '';
    document.getElementById(`member-age-${i}`).value = m.age || '';
    document.getElementById(`member-aadhar-${i}`).value = m.aadhar || '';
    document.getElementById(`member-relationship-${i}`).value = m.relationship || 'Spouse / ಪತ್ನಿ/ಪತಿ';
    document.getElementById(`member-education-${i}`).value = m.education || '';
    document.getElementById(`member-marital-${i}`).value = m.marital || 'Single / ಅವಿವಾಹಿತ';
    document.getElementById(`member-sector-${i}`).value = m.sector || 'Government / ಸರ್ಕಾರಿ';
    document.getElementById(`member-occupation-${i}`).value = m.occupation || '';
    document.getElementById(`member-traditional-occ-${i}`).value = m.traditionalOcc || '';
    document.getElementById(`member-pincode-${i}`).value = m.pincode || '';
    document.getElementById(`member-address-${i}`).value = m.address || '';
    
    // Set headers
    document.getElementById(`member-header-name-${i}`).textContent = m.fullname || `Member ${i + 1}`;
    
    if (m.photoBase64) {
      const preview = document.getElementById(`member-photo-preview-${i}`);
      const placeholder = document.getElementById(`member-photo-placeholder-${i}`);
      preview.src = m.photoBase64;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    }
    
    // Chain cascades for Member index i
    if (m.country) {
      document.getElementById(`member-country-${i}`).value = m.country;
      await onCascadeChange(`member-${i}`, 'country');
      if (m.state) {
        document.getElementById(`member-state-${i}`).value = m.state;
        await onCascadeChange(`member-${i}`, 'state');
        if (m.district) {
          document.getElementById(`member-district-${i}`).value = m.district;
          await onCascadeChange(`member-${i}`, 'district');
          if (m.taluk) {
            document.getElementById(`member-taluk-${i}`).value = m.taluk;
            await onCascadeChange(`member-${i}`, 'taluk');
            if (m.ward) {
              document.getElementById(`member-ward-${i}`).value = m.ward;
            }
          }
        }
      }
    }
  }
  showLoading(false);
}

function clearAutosaveForm() {
  localStorage.removeItem('tsm_multi_autosave');
  document.getElementById('survey-form').reset();
  
  // Clear Head photo
  const headPreview = document.getElementById('head-photo-preview');
  const headPlaceholder = document.getElementById('head-photo-placeholder');
  headPreview.src = '';
  headPreview.classList.add('hidden');
  headPlaceholder.classList.remove('hidden');
  
  // Disable Head dropdowns
  document.getElementById('head-state').disabled = true;
  document.getElementById('head-district').disabled = true;
  document.getElementById('head-taluk').disabled = true;
  document.getElementById('head-ward').disabled = true;
  
  // Clear Members count select
  document.getElementById('extra-members-count').value = '0';
  document.getElementById('family-members-container').innerHTML = '';
}

// ── SURVEY SUBMISSION & MULTI-CARD GENERATION ────────
async function submitSurveyForm() {
  if (!supabaseClient) {
    showToast('Database connection missing.', 'error');
    return;
  }
  
  const householdId = crypto.randomUUID(); // Unique group ID for this household submission
  const state = serializeFormState();
  const membersCount = state.members.length;
  
  // 1. Verify Head fields
  const h = state.head;
  if (!h.fullname || !h.phone || !h.dob || !h.country || !h.state || !h.district || !h.taluk || !h.ward || !h.address) {
    showToast('Please fill all required Head of Household fields.', 'error');
    return;
  }
  if (!h.photoBase64) {
    showToast('Please upload a profile photo for the Head of Household.', 'error');
    return;
  }
  
  // 2. Verify Family Member fields
  for (let i = 0; i < membersCount; i++) {
    const m = state.members[i];
    if (!m.fullname || !m.dob || !m.country || !m.state || !m.district || !m.taluk || !m.ward || !m.address) {
      showToast(`Please fill all required fields for Member ${i + 1}.`, 'error');
      return;
    }
    if (!m.photoBase64) {
      showToast(`Please upload a profile photo for Member ${i + 1}.`, 'error');
      return;
    }
  }
  
  showLoading(true, 'Uploading photos and saving records...');
  
  try {
    // A. Process and upload Head details
    let headPhotoUrl = null;
    if (h.photoBase64 && h.photoBase64.startsWith('data:image')) {
      try {
        const fileName = `head_${currentUserPhone}_${Date.now()}.jpg`;
        headPhotoUrl = await uploadImageToBucket(h.photoBase64, 'profile-photos', fileName);
      } catch (photoErr) {
        console.warn('Head photo upload failed, continuing without photo:', photoErr.message);
      }
    }
    
    const { data: dbHead, error: headErr } = await supabaseClient
      .from('members')
      .insert({
        household_id: householdId,
        is_head: true,
        relationship: 'Head',
        full_name: h.fullname,
        phone: h.phone,
        dob: h.dob,
        age: parseInt(h.age),
        marital_status: h.marital,
        education: h.education,
        employment_sector: h.sector,
        occupation: h.occupation,
        traditional_occupation: h.traditionalOcc,
        country_id: parseInt(h.country),
        state_id: parseInt(h.state),
        district_id: parseInt(h.district),
        taluk_id: parseInt(h.taluk),
        ward_id: parseInt(h.ward),
        address: h.address,
        pincode: h.pincode,
        photo_url: headPhotoUrl
      })
      .select()
      .single();
      
    if (headErr) throw headErr;
    
    // Generate Card for Head
    showLoading(true, 'Generating Head card...');
    const headCardImg = await generateAndUploadCard(dbHead, headPhotoUrl, 'head');
    
    await supabaseClient.from('member_cards').insert({
      member_id: dbHead.member_id,
      card_image_url: headCardImg
    });
    
    // B. Process and upload Family Members
    for (let i = 0; i < membersCount; i++) {
      const m = state.members[i];
      showLoading(true, `Uploading photo for Member ${i + 1}...`);
      
      let memberPhotoUrl = null;
      if (m.photoBase64 && m.photoBase64.startsWith('data:image')) {
        try {
          const fileName = `member_${i}_${currentUserPhone}_${Date.now()}.jpg`;
          memberPhotoUrl = await uploadImageToBucket(m.photoBase64, 'profile-photos', fileName);
        } catch (photoErr) {
          console.warn(`Member ${i+1} photo upload failed, continuing without photo:`, photoErr.message);
        }
      }
      
      showLoading(true, `Saving member ${i + 1} details...`);
      const { data: dbMember, error: memberErr } = await supabaseClient
        .from('members')
        .insert({
          household_id: householdId,
          is_head: false,
          relationship: m.relationship,
          full_name: m.fullname,
          phone: m.phone || h.phone, // fallback to head phone
          dob: m.dob,
          age: parseInt(m.age),
          marital_status: m.marital,
          education: m.education,
          employment_sector: m.sector,
          occupation: m.occupation,
          traditional_occupation: m.traditionalOcc,
          country_id: parseInt(m.country),
          state_id: parseInt(m.state),
          district_id: parseInt(m.district),
          taluk_id: parseInt(m.taluk),
          ward_id: parseInt(m.ward),
          address: m.address,
          pincode: m.pincode,
          photo_url: memberPhotoUrl
        })
        .select()
        .single();
        
      if (memberErr) throw memberErr;
      
      // Generate Card for Member
      showLoading(true, `Generating card for Member ${i + 1}...`);
      const memberCardImg = await generateAndUploadCard(dbMember, memberPhotoUrl, `member-${i}`);
      
      await supabaseClient.from('member_cards').insert({
        member_id: dbMember.member_id,
        card_image_url: memberCardImg
      });
    }
    
    showLoading(false);
    showToast('Survey Submitted and Cards Generated!', 'success');
    clearAutosaveForm();
    switchUserTab('view-cards');
  } catch (error) {
    console.error('Submission failed:', error);
    showLoading(false);
    showToast(`Submission error: ${error.message}`, 'error');
  }
}

// Ensure a storage bucket exists (create if missing)
async function ensureBucket(bucketName) {
  const { data: buckets } = await supabaseClient.storage.listBuckets();
  const exists = buckets && buckets.some(b => b.name === bucketName);
  if (!exists) {
    await supabaseClient.storage.createBucket(bucketName, { public: true });
  }
}

// Upload base64 image data to Supabase storage bucket
async function uploadImageToBucket(base64Data, bucketName, fileName) {
  try {
    // Auto-create bucket if it doesn't exist
    await ensureBucket(bucketName);

    const response = await fetch(base64Data);
    const blob = await response.blob();

    const { error } = await supabaseClient.storage
      .from(bucketName)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: blob.type || 'image/jpeg'
      });

    if (error) throw error;

    const { data: publicUrlData } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
}


// Generate Card via html2canvas and save to Storage
async function generateAndUploadCard(member, profileUrl, cardPrefix) {
  // Resolve geographic select list labels
  const districtName = document.getElementById(`${cardPrefix}-district`).options[document.getElementById(`${cardPrefix}-district`).selectedIndex].text;
  const talukName = document.getElementById(`${cardPrefix}-taluk`).options[document.getElementById(`${cardPrefix}-taluk`).selectedIndex].text;
  
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '-9999px';
  tempContainer.style.left = '-9999px';
  
  // Convert remote profile picture URL to base64 prior to canvas rendering (CORS safety)
  let base64Profile = profileUrl || 'assets/app_icon.jpg';
  if (profileUrl) {
    try {
      const res = await fetch(profileUrl);
      const blob = await res.blob();
      base64Profile = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('CORS profile load exception, falling back:', e);
    }
  }
  
  const cardHtml = getSingleCardHTML({
    member_id: member.member_id,
    full_name: member.full_name,
    phone: member.phone,
    age: member.age,
    district_name: districtName,
    taluk_name: talukName,
    photo_url: base64Profile
  }, false);
  
  tempContainer.innerHTML = cardHtml;
  document.body.appendChild(tempContainer);
  
  const cardElement = tempContainer.querySelector('.id-card-wrapper');
  
  const canvas = await html2canvas(cardElement, {
    useCORS: true,
    scale: 3,
    backgroundColor: null
  });
  
  document.body.removeChild(tempContainer);
  
  const cardBase64 = canvas.toDataURL('image/png');
  const fileName = `card_${member.member_id}.png`;
  
  const cardResponse = await fetch(cardBase64);
  const cardBlob = await cardResponse.blob();
  
  const { error } = await supabaseClient.storage
    .from('card-images')
    .upload(fileName, cardBlob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/png'
    });
    
  if (error) throw error;
  
  const { data: publicUrlData } = supabaseClient.storage
    .from('card-images')
    .getPublicUrl(fileName);
    
  return publicUrlData.publicUrl;
}

// Horizontal card template generator
function getSingleCardHTML(m, includeDownloadBtn = true) {
  const photo = m.photo_url || 'assets/app_icon.jpg';
  const downloadBtn = includeDownloadBtn 
    ? `<button class="id-card-download-btn" onclick="downloadCardImage('${m.card_image_url || ''}', '${m.full_name}')" title="Download PNG">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
       </button>`
    : '';
    
  return `
    <div class="id-card-wrapper" onclick="${includeDownloadBtn ? `openCardFullModal('${m.card_image_url || ''}')` : ''}">
      ${downloadBtn}
      <div class="id-card-inner">
        <div class="id-card-overlay">
          <div class="id-card-left">
            <img src="${photo}" class="id-card-photo" alt="Profile">
            <div class="id-card-title">MEMBER</div>
            <div class="id-card-age-tag">${m.age} Yrs</div>
          </div>
          <div class="id-card-right">
            <h4 class="id-card-name">${m.full_name}</h4>
            <div class="id-card-memberid">ID: ${m.member_id}</div>
            <div class="id-card-divider"></div>
            
            <div class="id-card-row">
              <span class="id-card-row-icon">📞</span>
              <span class="id-card-row-text">${m.phone}</span>
            </div>
            <div class="id-card-row">
              <span class="id-card-row-icon">📍</span>
              <span class="id-card-row-text">${m.taluk_name || ''}, ${m.district_name || ''}</span>
            </div>
            <div class="id-card-row">
              <span class="id-card-row-icon">🏢</span>
              <span class="id-card-row-text">Taralabalushishyamandali</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Download Card File directly from Supabase Storage URL
async function downloadCardImage(imageUrl, name) {
  if (!imageUrl) return;
  event.stopPropagation(); // prevent modal opening
  
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${name.replace(/\s+/g, '_')}_Card.png`;
    link.click();
    showToast('Download started!', 'success');
  } catch (error) {
    console.error('Download failed:', error);
    showToast('Failed to download card.', 'error');
  }
}

// Open modal showing card image
function openCardFullModal(url) {
  if (!url) return;
  const container = document.getElementById('card-render-container');
  container.innerHTML = `<img src="${url}" style="max-width:100%; border-radius:12px; box-shadow:var(--shadow-lg);">`;
  document.getElementById('card-detail-modal').classList.remove('hidden');
}

function closeCardModal() {
  document.getElementById('card-detail-modal').classList.add('hidden');
}

// ── USER DASHBOARD CARD HISTORY ──────────────────────
async function loadUserCards() {
  const container = document.getElementById('user-cards-list');
  container.innerHTML = '<div class="loading-spinner"></div>';
  
  if (!supabaseClient) {
    container.innerHTML = '<p class="empty-state">Database not connected.</p>';
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('members_resolved')
      .select('*, member_cards(*)')
      .eq('phone', currentUserPhone)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    if (!data || data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">💳</span>
          <p>No membership cards generated yet.<br>ನಮೂನೆಗಳನ್ನು ಇನ್ನೂ ರಚಿಸಲಾಗಿಲ್ಲ</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.map(m => {
      const card = m.member_cards && m.member_cards[0];
      return getSingleCardHTML({
        member_id: m.member_id,
        full_name: m.full_name,
        phone: m.phone,
        age: m.age,
        district_name: m.district_name,
        taluk_name: m.taluk_name,
        photo_url: m.photo_url,
        card_image_url: card ? card.card_image_url : null
      });
    }).join('');
  } catch (err) {
    console.error('Failed to load user cards:', err);
    container.innerHTML = '<p class="empty-state">Failed to fetch cards.</p>';
  }
}

function renderWelcomeVachanas() {
  const container = document.getElementById('vachanas-list');
  if (!container) return;
  
  container.innerHTML = VACHANAS_DATA.map(v => `
    <div class="vachana-card">
      <div class="vachana-message">“${v.message}”</div>
      <div class="vachana-meta">
        <span class="vachana-author">- ${v.author}</span>
        <span>${v.timestamp}</span>
      </div>
    </div>
  `).join('');
}

async function loadGeographicDropdowns() {
  await loadCountriesDropdown();
}

// ── ADMIN PORTAL LOGIC ───────────────────────────────
async function showAdminPortal() {
  document.getElementById('admin-portal').classList.remove('hidden');
  switchAdminTab('members');
  
  await loadGeographicDropdowns();
  loadAdminBroadcastMessages();
}

function switchAdminTab(tabName) {
  document.querySelectorAll('#admin-portal .bottom-nav button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
  
  if (tabName === 'members') {
    document.getElementById('tab-admin-members').classList.remove('hidden');
    document.querySelector('#admin-portal .bottom-nav button:nth-child(1)').classList.add('active');
    fetchAdminMembers();
  } else if (tabName === 'messages') {
    document.getElementById('tab-admin-messages').classList.remove('hidden');
    document.querySelector('#admin-portal .bottom-nav button:nth-child(2)').classList.add('active');
  }
}

async function fetchAdminMembers() {
  showLoading(true, 'Fetching member records...');
  
  try {
    const { data, error } = await supabaseClient
      .from('members_resolved')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    allMembers = data || [];
    filteredMembers = [...allMembers];
    
    document.getElementById('admin-total-count').textContent = allMembers.length;
    renderAdminMembersTable();
  } catch (err) {
    console.error('Fetch members error:', err);
    showToast('Failed to fetch records.', 'error');
  } finally {
    showLoading(false);
  }
}

// Cascading filters in Admin
async function onAdminCountryFilterChanged() {
  const countryId = document.getElementById('admin-filter-country').value;
  const stateSelect = document.getElementById('admin-filter-state');
  const districtSelect = document.getElementById('admin-filter-district');
  
  resetDropdown(stateSelect, 'State (All)');
  resetDropdown(districtSelect, 'District (All)');
  
  if (!countryId || !supabaseClient) {
    applyAdminFilters();
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('states')
      .select('*')
      .eq('country_id', countryId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    populateDropdown('admin-filter-state', data || []);
    stateSelect.disabled = false;
  } catch (err) { console.error(err); }
  applyAdminFilters();
}

async function onAdminStateFilterChanged() {
  const stateId = document.getElementById('admin-filter-state').value;
  const districtSelect = document.getElementById('admin-filter-district');
  
  resetDropdown(districtSelect, 'District (All)');
  
  if (!stateId || !supabaseClient) {
    applyAdminFilters();
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('districts')
      .select('*')
      .eq('state_id', stateId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    populateDropdown('admin-filter-district', data || []);
    districtSelect.disabled = false;
  } catch (err) { console.error(err); }
  applyAdminFilters();
}

function applyAdminFilters() {
  const searchVal = document.getElementById('admin-search-input').value.toLowerCase().trim();
  const countryId = document.getElementById('admin-filter-country').value;
  const stateId = document.getElementById('admin-filter-state').value;
  const districtId = document.getElementById('admin-filter-district').value;
  
  filteredMembers = allMembers.filter(m => {
    if (countryId && m.country_id != countryId) return false;
    if (stateId && m.state_id != stateId) return false;
    if (districtId && m.district_id != districtId) return false;
    
    if (searchVal) {
      const nameMatch = m.full_name?.toLowerCase().includes(searchVal);
      const phoneMatch = m.phone?.includes(searchVal);
      const addressMatch = m.address?.toLowerCase().includes(searchVal);
      const idMatch = m.member_id?.toString() === searchVal;
      
      if (!nameMatch && !phoneMatch && !addressMatch && !idMatch) return false;
    }
    return true;
  });
  
  renderAdminMembersTable();
}

function resetAdminFilters() {
  document.getElementById('admin-search-input').value = '';
  document.getElementById('admin-filter-country').value = '';
  
  resetDropdown(document.getElementById('admin-filter-state'), 'State (All)');
  resetDropdown(document.getElementById('admin-filter-district'), 'District (All)');
  
  filteredMembers = [...allMembers];
  renderAdminMembersTable();
}

function renderAdminMembersTable() {
  const tbody = document.getElementById('admin-members-tbody');
  
  if (filteredMembers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;color:var(--text-secondary);">No records found.</td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = filteredMembers.map(m => {
    const photo = m.photo_url || 'assets/app_icon.jpg';
    const dateStr = m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : 'N/A';
    
    return `
      <tr>
        <td style="font-weight:700;">ID ${m.member_id}</td>
        <td><img src="${photo}" class="members-table-photo" alt="Photo"></td>
        <td style="font-weight:600;color:var(--primary-dark);">${m.full_name}</td>
        <td>${m.phone}</td>
        <td>${m.country_name || 'N/A'}</td>
        <td>${m.state_name || 'N/A'}</td>
        <td>${m.district_name || 'N/A'}</td>
        <td>${m.taluk_name || 'N/A'}</td>
        <td>${dateStr}</td>
        <td>
          <div class="table-actions">
            <button class="btn-table btn-edit-member" onclick="openEditModal(${m.id})" title="Edit Member">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
            </button>
            <button class="btn-table btn-delete-member" onclick="deleteMember(${m.id})" title="Delete Member">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Delete Member Row
async function deleteMember(id) {
  if (confirm('Are you sure you want to permanently delete this member?')) {
    showLoading(true, 'Deleting member record...');
    try {
      const { error } = await supabaseClient
        .from('members')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      showToast('Member deleted successfully.', 'success');
      await fetchAdminMembers();
    } catch (err) {
      console.error(err);
      showToast('Delete operation failed.', 'error');
    } finally {
      showLoading(false);
    }
  }
}

// Edit Member cascades
async function onEditCountryChanged() {
  const countryId = document.getElementById('edit-country').value;
  const stateSelect = document.getElementById('edit-state');
  const districtSelect = document.getElementById('edit-district');
  const talukSelect = document.getElementById('edit-taluk');
  const wardSelect = document.getElementById('edit-ward');
  
  resetDropdown(stateSelect, 'Select State');
  resetDropdown(districtSelect, 'Select District');
  resetDropdown(talukSelect, 'Select Taluk');
  resetDropdown(wardSelect, 'Select Ward');
  
  if (!countryId) return;
  
  try {
    const { data, error } = await supabaseClient.from('states').select('*').eq('country_id', countryId).order('name', { ascending: true });
    if (error) throw error;
    populateDropdown('edit-state', data || []);
    stateSelect.disabled = false;
  } catch (err) { console.error(err); }
}

async function onEditStateChanged() {
  const stateId = document.getElementById('edit-state').value;
  const districtSelect = document.getElementById('edit-district');
  const talukSelect = document.getElementById('edit-taluk');
  const wardSelect = document.getElementById('edit-ward');
  
  resetDropdown(districtSelect, 'Select District');
  resetDropdown(talukSelect, 'Select Taluk');
  resetDropdown(wardSelect, 'Select Ward');
  if (!stateId) return;
  
  try {
    const { data, error } = await supabaseClient.from('districts').select('*').eq('state_id', stateId).order('name', { ascending: true });
    if (error) throw error;
    populateDropdown('edit-district', data || []);
    districtSelect.disabled = false;
  } catch (err) { console.error(err); }
}

async function onEditDistrictChanged() {
  const districtId = document.getElementById('edit-district').value;
  const talukSelect = document.getElementById('edit-taluk');
  const wardSelect = document.getElementById('edit-ward');
  
  resetDropdown(talukSelect, 'Select Taluk');
  resetDropdown(wardSelect, 'Select Ward');
  if (!districtId) return;
  
  try {
    const { data, error } = await supabaseClient.from('taluks').select('*').eq('district_id', districtId).order('name', { ascending: true });
    if (error) throw error;
    populateDropdown('edit-taluk', data || []);
    talukSelect.disabled = false;
  } catch (err) { console.error(err); }
}

async function onEditTalukChanged() {
  const talukId = document.getElementById('edit-taluk').value;
  const wardSelect = document.getElementById('edit-ward');
  
  resetDropdown(wardSelect, 'Select Ward');
  if (!talukId) return;
  
  try {
    const { data, error } = await supabaseClient.from('wards').select('*').eq('taluk_id', talukId).order('name', { ascending: true });
    if (error) throw error;
    populateDropdown('edit-ward', data || []);
    wardSelect.disabled = false;
  } catch (err) { console.error(err); }
}

function calculateAgeForEdit() {
  const dobVal = document.getElementById('edit-dob').value;
  const ageInput = document.getElementById('edit-age');
  
  if (dobVal) {
    const dob = new Date(dobVal);
    const today = new Date();
    let calculatedAge = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      calculatedAge--;
    }
    ageInput.value = calculatedAge >= 0 ? calculatedAge : 0;
  } else {
    ageInput.value = '';
  }
}

// Edit Member Dialog Open
async function openEditModal(dbId) {
  const member = allMembers.find(m => m.id === dbId);
  if (!member) return;
  
  document.getElementById('edit-member-id').value = member.id;
  document.getElementById('edit-fullname').value = member.full_name;
  document.getElementById('edit-phone').value = member.phone;
  document.getElementById('edit-dob').value = member.dob;
  document.getElementById('edit-age').value = member.age;
  document.getElementById('edit-address').value = member.address;
  
  showLoading(true, 'Loading address details...');
  try {
    if (member.country_id) {
      document.getElementById('edit-country').value = member.country_id;
      await onEditCountryChanged();
      
      if (member.state_id) {
        document.getElementById('edit-state').value = member.state_id;
        await onEditStateChanged();
        
        if (member.district_id) {
          document.getElementById('edit-district').value = member.district_id;
          await onEditDistrictChanged();
          
          if (member.taluk_id) {
            document.getElementById('edit-taluk').value = member.taluk_id;
            await onEditTalukChanged();
            
            if (member.ward_id) {
              document.getElementById('edit-ward').value = member.ward_id;
            }
          }
        }
      }
    }
  } catch (err) { console.error(err); }
  finally { showLoading(false); }
  
  document.getElementById('edit-member-modal').classList.remove('hidden');
}

function closeEditModal() {
  document.getElementById('edit-member-modal').classList.add('hidden');
  document.getElementById('edit-member-form').reset();
}

async function submitEditMember() {
  const id = document.getElementById('edit-member-id').value;
  const fullname = document.getElementById('edit-fullname').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const dob = document.getElementById('edit-dob').value;
  const age = document.getElementById('edit-age').value;
  const countryId = document.getElementById('edit-country').value;
  const stateId = document.getElementById('edit-state').value;
  const districtId = document.getElementById('edit-district').value;
  const talukId = document.getElementById('edit-taluk').value;
  const wardId = document.getElementById('edit-ward').value;
  const address = document.getElementById('edit-address').value.trim();
  
  showLoading(true, 'Saving updates...');
  
  try {
    const { error } = await supabaseClient
      .from('members')
      .update({
        full_name: fullname,
        phone: phone,
        dob: dob,
        age: parseInt(age),
        country_id: parseInt(countryId),
        state_id: parseInt(stateId),
        district_id: parseInt(districtId),
        taluk_id: parseInt(talukId),
        ward_id: parseInt(wardId),
        address: address
      })
      .eq('id', id);
      
    if (error) throw error;
    
    // Regenerate card image
    const targetMember = allMembers.find(m => m.id == id);
    if (targetMember && (targetMember.full_name !== fullname || targetMember.age != age)) {
      await generateAndUploadCard({
        member_id: targetMember.member_id,
        full_name: fullname,
        phone: phone,
        age: age,
        dob: dob,
        country_id: countryId,
        state_id: stateId,
        district_id: districtId,
        taluk_id: talukId,
        ward_id: wardId,
        address: address
      }, targetMember.photo_url, 'edit');
    }
    
    showToast('Record updated successfully.', 'success');
    closeEditModal();
    await fetchAdminMembers();
  } catch (err) {
    console.error(err);
    showToast('Failed to update record.', 'error');
  } finally {
    showLoading(false);
  }
}

// Data Export (CSV and JSON)
function exportData(format) {
  if (filteredMembers.length === 0) {
    showToast('No records to export.', 'info');
    return;
  }
  
  let dataStr = '';
  let mimeType = '';
  let fileName = '';
  
  if (format === 'csv') {
    const headers = ['ID Number', 'Name', 'Phone', 'DOB', 'Age', 'Country', 'State', 'District', 'Place', 'Address', 'Created Date'];
    const rows = filteredMembers.map(m => [
      `ID ${m.member_id}`,
      `"${m.full_name.replace(/"/g, '""')}"`,
      m.phone,
      m.dob,
      m.age,
      m.country_name || '',
      m.state_name || '',
      m.district_name || '',
      m.taluk_name || '',
      `"${m.address.replace(/"/g, '""')}"`,
      m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN') : ''
    ]);
    
    dataStr = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    mimeType = 'text/csv;charset=utf-8;';
    fileName = 'members_export.csv';
  } else if (format === 'json') {
    dataStr = JSON.stringify(filteredMembers, null, 2);
    mimeType = 'application/json;charset=utf-8;';
    fileName = 'members_export.json';
  }
  
  const blob = new Blob([dataStr], { type: mimeType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  showToast('Export file downloaded!', 'success');
}

// ── BROADCAST MESSAGE SYSTEM (LocalStorage backed) ───
function loadAdminBroadcastMessages() {
  const container = document.getElementById('admin-messages-list');
  if (!container) return;
  
  const messagesStr = localStorage.getItem('tsm_admin_messages') || '[]';
  const messageList = JSON.parse(messagesStr);
  
  if (messageList.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:24px 0;">No messages sent yet.</p>';
    return;
  }
  
  container.innerHTML = messageList.map((m, idx) => {
    const timeStr = new Date(m.timestamp).toLocaleString('en-IN');
    return `
      <div class="admin-broadcast-card">
        <div>
          <div class="admin-broadcast-card-text">${m.text}</div>
          <div class="admin-broadcast-card-meta">📅 ${timeStr}</div>
        </div>
        <button class="btn-delete-broadcast" onclick="deleteBroadcastMessage(${idx})" title="Delete Message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    `;
  }).join('');
}

function sendBroadcastMessage() {
  const input = document.getElementById('compose-message-input');
  const text = input.value.trim();
  
  if (!text) {
    showToast('Please type a message first.', 'error');
    return;
  }
  
  const messagesStr = localStorage.getItem('tsm_admin_messages') || '[]';
  const messageList = JSON.parse(messagesStr);
  
  messageList.unshift({
    text: text,
    timestamp: new Date().toISOString()
  });
  
  localStorage.setItem('tsm_admin_messages', JSON.stringify(messageList));
  input.value = '';
  showToast('Message broadcasted successfully!', 'success');
  loadAdminBroadcastMessages();
}

function deleteBroadcastMessage(index) {
  if (confirm('Are you sure you want to delete this message?')) {
    const messagesStr = localStorage.getItem('tsm_admin_messages') || '[]';
    let messageList = JSON.parse(messagesStr);
    
    messageList.splice(index, 1);
    localStorage.setItem('tsm_admin_messages', JSON.stringify(messageList));
    showToast('Message deleted.', 'info');
    loadAdminBroadcastMessages();
  }
}

// ── UTILITY HELPERS ───────────────────────────────────
function populateDropdown(selectId, list) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  const originalHint = select.options[0].text;
  select.innerHTML = `<option value="">${originalHint}</option>`;
  
  list.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  });
}

function resetDropdown(select, hintText) {
  select.innerHTML = `<option value="">${hintText}</option>`;
  select.value = '';
  select.disabled = true;
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  const iconEl = toast.querySelector('.toast-icon');
  const messageEl = toast.querySelector('.toast-message');
  
  toast.className = `toast ${type}`;
  messageEl.textContent = message;
  
  if (type === 'success') iconEl.textContent = '✅';
  else if (type === 'error') iconEl.textContent = '❌';
  else iconEl.textContent = 'ℹ️';
  
  toast.classList.remove('hidden');
  
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  
  toast.timeoutId = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4500);
}

function showLoading(show, text = 'Processing...') {
  const overlay = document.getElementById('loading-overlay');
  const textEl = document.getElementById('loading-text');
  
  if (overlay) {
    if (show) {
      if (textEl) textEl.textContent = text;
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }
}

function confirmLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('tsm_session');
    currentUserPhone = '';
    currentUserRole = '';
    
    document.getElementById('user-portal').classList.add('hidden');
    document.getElementById('admin-portal').classList.add('hidden');
    
    document.getElementById('phone-input').value = '';
    document.getElementById('otp-input').value = '';
    document.getElementById('login-otp-section').classList.add('hidden');
    document.getElementById('login-phone-section').classList.remove('hidden');
    
    document.getElementById('login-page').classList.remove('hidden');
    showToast('Logged out successfully', 'info');
  }
}
