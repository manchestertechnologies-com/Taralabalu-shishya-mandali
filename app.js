/* =====================================================
   TARALABALU SHISHYA MANDALI — Application Logic
   ===================================================== */

// ── SUPABASE CONFIGURATION ───────────────────────────
const SUPABASE_URL = 'https://ysgzawhxxovcatlhcbrb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZ3phd2h4eG92Y2F0bGhjYnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2OTQyOTAsImV4cCI6MjA5NjI3MDI5MH0.BOpQt3pA5P4Oj2YE2sKTHY2Gy0_UDHqTOqJzz00tp0Y';

let supabaseClient = null;

// Auth credentials
const USER_OTP = '123456';
const ADMIN_OTP = '654321';

// Global state variables
let currentUserPhone = '';
let currentUserRole = '';
let allMembers = [];
let filteredMembers = [];
let countriesList = [];
let statesList = [];
let districtsList = [];
let taluksList = [];
let wardsList = [];

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
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  setupEventListeners();
  checkSession();
});

function initSupabase() {
  try {
    if (window.supabase) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase Client initialized successfully.');
    } else {
      console.error('❌ Supabase SDK not loaded.');
      showToast('Supabase SDK missing. Working offline.', 'error');
    }
  } catch (error) {
    console.error('Supabase initialization failed:', error);
  }
}

function setupEventListeners() {
  // Login phone validator
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

  // OTP validator
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
      
      // Bypass splash screen and go straight to dashboards
      if (splashScreen) splashScreen.classList.add('hidden');
      document.getElementById('login-page').classList.add('hidden');
      
      if (currentUserRole === 'admin') {
        showAdminPortal();
      } else {
        showUserPortal();
      }
      return;
    } catch (e) {
      console.error('Session restored error:', e);
      localStorage.removeItem('tsm_session');
    }
  }

  // Run Splash Screen sequence (2.5 seconds wait)
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
    showToast('OTP sent successfully (try 123456 or 654321)', 'info');
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
    
    // Save session details
    localStorage.setItem('tsm_session', JSON.stringify({
      phone: currentUserPhone,
      role: currentUserRole
    }));
    
    // Page Transitions
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

function confirmLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('tsm_session');
    currentUserPhone = '';
    currentUserRole = '';
    
    // Hide portals, show login
    document.getElementById('user-portal').classList.add('hidden');
    document.getElementById('admin-portal').classList.add('hidden');
    
    // Clear inputs on login page
    document.getElementById('phone-input').value = '';
    document.getElementById('otp-input').value = '';
    document.getElementById('login-otp-section').classList.add('hidden');
    document.getElementById('login-phone-section').classList.remove('hidden');
    
    document.getElementById('login-page').classList.remove('hidden');
    showToast('Logged out successfully', 'info');
  }
}

// ── USER PORTAL & NAVIGATION ─────────────────────────
async function showUserPortal() {
  document.getElementById('user-portal').classList.remove('hidden');
  switchUserTab('fill-form');
  
  // Load countries dynamically
  await loadGeographicDropdowns();
  
  // Restore auto-saved form data
  restoreAutosave();
  
  // Render vachanas list
  renderWelcomeVachanas();
}

function switchUserTab(tabName) {
  // Reset active tabs navigation
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

// ── DYNAMIC CASCADING GEOGRAPHIC DROPDOWNS ───────────
async function loadGeographicDropdowns() {
  if (!supabaseClient) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('countries')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) throw error;
    countriesList = data || [];
    
    // Populate form and admin filters
    populateDropdown('form-country', countriesList);
    populateDropdown('edit-country', countriesList);
    populateDropdown('admin-filter-country', countriesList);
  } catch (err) {
    console.error('Failed to load countries:', err);
  }
}

// Cascades handlers (Registration Form)
async function onCountryChanged() {
  const countryId = document.getElementById('form-country').value;
  const stateSelect = document.getElementById('form-state');
  const districtSelect = document.getElementById('form-district');
  const talukSelect = document.getElementById('form-taluk');
  const wardSelect = document.getElementById('form-ward');
  
  // Clear and disable downstream dropdowns
  resetDropdown(stateSelect, 'Select State');
  resetDropdown(districtSelect, 'Select District');
  resetDropdown(talukSelect, 'Select Taluk');
  resetDropdown(wardSelect, 'Select Ward');
  
  if (!countryId || !supabaseClient) {
    saveAutosave();
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('states')
      .select('*')
      .eq('country_id', countryId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    statesList = data || [];
    populateDropdown('form-state', statesList);
    stateSelect.disabled = false;
  } catch (err) {
    console.error('Failed to load states:', err);
  }
  saveAutosave();
}

async function onStateChanged() {
  const stateId = document.getElementById('form-state').value;
  const districtSelect = document.getElementById('form-district');
  const talukSelect = document.getElementById('form-taluk');
  const wardSelect = document.getElementById('form-ward');
  
  resetDropdown(districtSelect, 'Select District');
  resetDropdown(talukSelect, 'Select Taluk');
  resetDropdown(wardSelect, 'Select Ward');
  
  if (!stateId || !supabaseClient) {
    saveAutosave();
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('districts')
      .select('*')
      .eq('state_id', stateId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    districtsList = data || [];
    populateDropdown('form-district', districtsList);
    districtSelect.disabled = false;
  } catch (err) {
    console.error('Failed to load districts:', err);
  }
  saveAutosave();
}

async function onDistrictChanged() {
  const districtId = document.getElementById('form-district').value;
  const talukSelect = document.getElementById('form-taluk');
  const wardSelect = document.getElementById('form-ward');
  
  resetDropdown(talukSelect, 'Select Taluk');
  resetDropdown(wardSelect, 'Select Ward');
  
  if (!districtId || !supabaseClient) {
    saveAutosave();
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('taluks')
      .select('*')
      .eq('district_id', districtId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    taluksList = data || [];
    populateDropdown('form-taluk', taluksList);
    talukSelect.disabled = false;
  } catch (err) {
    console.error('Failed to load taluks:', err);
  }
  saveAutosave();
}

async function onTalukChanged() {
  const talukId = document.getElementById('form-taluk').value;
  const wardSelect = document.getElementById('form-ward');
  
  resetDropdown(wardSelect, 'Select Ward');
  
  if (!talukId || !supabaseClient) {
    saveAutosave();
    return;
  }
  
  try {
    const { data, error } = await supabaseClient
      .from('wards')
      .select('*')
      .eq('taluk_id', talukId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    wardsList = data || [];
    populateDropdown('form-ward', wardsList);
    wardSelect.disabled = false;
  } catch (err) {
    console.error('Failed to load wards:', err);
  }
  saveAutosave();
}

// ── FORM AUTO-SAVE & AUTO-AGE CALCULATION ───────────
function calculateAgeAndAutosave() {
  const dobVal = document.getElementById('form-dob').value;
  const ageInput = document.getElementById('form-age');
  
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
  saveAutosave();
}

function triggerPhotoSelect() {
  document.getElementById('photo-file-input').click();
}

function previewPhoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('photo-preview');
    const placeholder = document.getElementById('photo-placeholder');
    
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    
    saveAutosave();
  };
  reader.readAsDataURL(file);
}

// LocalStorage Persistence
function saveAutosave() {
  const preview = document.getElementById('photo-preview');
  const autosaveData = {
    fullname: document.getElementById('form-fullname').value,
    phone: document.getElementById('form-phone').value,
    dob: document.getElementById('form-dob').value,
    age: document.getElementById('form-age').value,
    country: document.getElementById('form-country').value,
    state: document.getElementById('form-state').value,
    district: document.getElementById('form-district').value,
    taluk: document.getElementById('form-taluk').value,
    ward: document.getElementById('form-ward').value,
    address: document.getElementById('form-address').value,
    photoBase64: preview.classList.contains('hidden') ? null : preview.src
  };
  
  localStorage.setItem('tsm_form_autosave', JSON.stringify(autosaveData));
}

async function restoreAutosave() {
  const savedDataStr = localStorage.getItem('tsm_form_autosave');
  if (!savedDataStr) return;
  
  try {
    const data = JSON.parse(savedDataStr);
    
    document.getElementById('form-fullname').value = data.fullname || '';
    document.getElementById('form-phone').value = data.phone || '';
    document.getElementById('form-dob').value = data.dob || '';
    document.getElementById('form-age').value = data.age || '';
    document.getElementById('form-address').value = data.address || '';
    
    // Restore image preview
    if (data.photoBase64) {
      const preview = document.getElementById('photo-preview');
      const placeholder = document.getElementById('photo-placeholder');
      preview.src = data.photoBase64;
      preview.classList.remove('hidden');
      placeholder.classList.add('hidden');
    }
    
    // Restore location cascading selects sequentially
    if (data.country) {
      document.getElementById('form-country').value = data.country;
      await onCountryChanged();
      
      if (data.state) {
        document.getElementById('form-state').value = data.state;
        await onStateChanged();
        
        if (data.district) {
          document.getElementById('form-district').value = data.district;
          await onDistrictChanged();
          
          if (data.taluk) {
            document.getElementById('form-taluk').value = data.taluk;
            await onTalukChanged();
            
            if (data.ward) {
              document.getElementById('form-ward').value = data.ward;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to restore form autosave:', error);
  }
}

function clearAutosave() {
  localStorage.removeItem('tsm_form_autosave');
  document.getElementById('member-reg-form').reset();
  
  const preview = document.getElementById('photo-preview');
  const placeholder = document.getElementById('photo-placeholder');
  preview.src = '';
  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');
  
  // Disable cascades
  document.getElementById('form-state').disabled = true;
  document.getElementById('form-district').disabled = true;
  document.getElementById('form-taluk').disabled = true;
  document.getElementById('form-ward').disabled = true;
}

// ── SUBMISSION AND CARD GENERATION ───────────────────
async function submitForm() {
  if (!supabaseClient) {
    showToast('Cannot submit. Supabase is not connected.', 'error');
    return;
  }
  
  const fullname = document.getElementById('form-fullname').value.trim();
  const phone = document.getElementById('form-phone').value.trim();
  const dob = document.getElementById('form-dob').value;
  const age = document.getElementById('form-age').value;
  const countryId = document.getElementById('form-country').value;
  const stateId = document.getElementById('form-state').value;
  const districtId = document.getElementById('form-district').value;
  const talukId = document.getElementById('form-taluk').value;
  const wardId = document.getElementById('form-ward').value;
  const address = document.getElementById('form-address').value.trim();
  const preview = document.getElementById('photo-preview');
  
  if (!fullname || !phone || !dob || !countryId || !stateId || !districtId || !talukId || !wardId || !address) {
    showToast('Please fill all required fields.', 'error');
    return;
  }
  
  if (preview.classList.contains('hidden') || !preview.src) {
    showToast('Please upload a profile photo.', 'error');
    return;
  }
  
  showLoading(true, 'Uploading photo & registering member...');
  
  try {
    let photoUrl = null;
    
    // 1. Upload base64 profile image to storage bucket 'profile-photos'
    if (preview.src.startsWith('data:image')) {
      const fileName = `${phone}_${Date.now()}.jpg`;
      photoUrl = await uploadImageToBucket(preview.src, 'profile-photos', fileName);
    }
    
    // 2. Insert member row in Database
    const { data: memberData, error: memberErr } = await supabaseClient
      .from('members')
      .insert({
        full_name: fullname,
        phone: phone,
        dob: dob,
        age: parseInt(age),
        country_id: parseInt(countryId),
        state_id: parseInt(stateId),
        district_id: parseInt(districtId),
        taluk_id: parseInt(talukId),
        ward_id: parseInt(wardId),
        address: address,
        photo_url: photoUrl
      })
      .select()
      .single();
      
    if (memberErr) throw memberErr;
    
    const memberId = memberData.member_id;
    
    // 3. Render Membership Card & Upload to 'card-images'
    showLoading(true, 'Generating membership card...');
    const cardImgUrl = await generateAndUploadCard(memberData, photoUrl);
    
    // 4. Save to member_cards table
    const { error: cardErr } = await supabaseClient
      .from('member_cards')
      .insert({
        member_id: memberId,
        card_image_url: cardImgUrl
      });
      
    if (cardErr) throw cardErr;
    
    showLoading(false);
    showToast('Member Registered Successfully!', 'success');
    clearAutosave();
    switchUserTab('view-cards');
  } catch (error) {
    console.error('Submission failed:', error);
    showLoading(false);
    showToast(`Submission failed: ${error.message}`, 'error');
  }
}

// Helper to convert base64 to Blob and upload to Supabase Storage
async function uploadImageToBucket(base64Data, bucketName, fileName) {
  const response = await fetch(base64Data);
  const blob = await response.blob();
  
  const { data, error } = await supabaseClient.storage
    .from(bucketName)
    .upload(fileName, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'image/jpeg'
    });
    
  if (error) throw error;
  
  const { data: publicUrlData } = supabaseClient.storage
    .from(bucketName)
    .getPublicUrl(fileName);
    
  return publicUrlData.publicUrl;
}

// Generate Card via html2canvas and save to Storage
async function generateAndUploadCard(member, profileUrl) {
  // Query name mappings for visual display
  const districtName = document.getElementById('form-district').options[document.getElementById('form-district').selectedIndex].text;
  const talukName = document.getElementById('form-taluk').options[document.getElementById('form-taluk').selectedIndex].text;
  
  // Render temporary container for card screenshot
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.top = '-9999px';
  tempContainer.style.left = '-9999px';
  
  // Convert remote profile picture URL to base64 prior to canvas rendering (CORS safety)
  let base64Profile = profileUrl;
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
    scale: 3, // Premium clarity
    backgroundColor: null
  });
  
  document.body.removeChild(tempContainer);
  
  // Export canvas to base64 and upload
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
    // Single query fetch (members join resolved views and cards)
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

// ── ADMIN PORTAL LOGIC ───────────────────────────────
async function showAdminPortal() {
  document.getElementById('admin-portal').classList.remove('hidden');
  switchAdminTab('members');
  
  // Load countries in admin filters & modals
  await loadGeographicDropdowns();
  
  // Load messages from LocalStorage
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

// Fetch members for Admin Dashboard
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
    
    // Update count badge
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
  } catch (err) {
    console.error(err);
  }
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
  } catch (err) {
    console.error(err);
  }
  applyAdminFilters();
}

function applyAdminFilters() {
  const searchVal = document.getElementById('admin-search-input').value.toLowerCase().trim();
  const countryId = document.getElementById('admin-filter-country').value;
  const stateId = document.getElementById('admin-filter-state').value;
  const districtId = document.getElementById('admin-filter-district').value;
  
  filteredMembers = allMembers.filter(m => {
    // 1. Dropdown Filters
    if (countryId && m.country_id != countryId) return false;
    if (stateId && m.state_id != stateId) return false;
    if (districtId && m.district_id != districtId) return false;
    
    // 2. Text Search Match
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

// Edit Member Cascades
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
    const { data, error } = await supabaseClient
      .from('states')
      .select('*')
      .eq('country_id', countryId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    populateDropdown('edit-state', data || []);
    stateSelect.disabled = false;
  } catch (err) {
    console.error(err);
  }
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
    const { data, error } = await supabaseClient
      .from('districts')
      .select('*')
      .eq('state_id', stateId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    populateDropdown('edit-district', data || []);
    districtSelect.disabled = false;
  } catch (err) {
    console.error(err);
  }
}

async function onEditDistrictChanged() {
  const districtId = document.getElementById('edit-district').value;
  const talukSelect = document.getElementById('edit-taluk');
  const wardSelect = document.getElementById('edit-ward');
  
  resetDropdown(talukSelect, 'Select Taluk');
  resetDropdown(wardSelect, 'Select Ward');
  
  if (!districtId) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('taluks')
      .select('*')
      .eq('district_id', districtId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    populateDropdown('edit-taluk', data || []);
    talukSelect.disabled = false;
  } catch (err) {
    console.error(err);
  }
}

async function onEditTalukChanged() {
  const talukId = document.getElementById('edit-taluk').value;
  const wardSelect = document.getElementById('edit-ward');
  
  resetDropdown(wardSelect, 'Select Ward');
  
  if (!talukId) return;
  
  try {
    const { data, error } = await supabaseClient
      .from('wards')
      .select('*')
      .eq('taluk_id', talukId)
      .order('name', { ascending: true });
      
    if (error) throw error;
    populateDropdown('edit-ward', data || []);
    wardSelect.disabled = false;
  } catch (err) {
    console.error(err);
  }
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
  
  // Chain Cascades restoration for editing modal dropdowns
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
  } catch (err) {
    console.error(err);
  } finally {
    showLoading(false);
  }
  
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
    
    // Also regenerate card image if key info changed
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
      }, targetMember.photo_url);
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

// ── ADMIN APP NAVIGATION ─────────────────────────────
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
  
  // Clear any existing timeout
  if (toast.timeoutId) clearTimeout(toast.timeoutId);
  
  toast.timeoutId = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
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
