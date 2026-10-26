const SUPABASE_URL = 'https://fmcdredwhtidjqieuhxz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A7z_HraTYzqmzW2Yshnvfw_oFESgxUZ';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let isLoginMode = false;
const userAnswers = {};
let userShortlist = [];
const completedTasks = new Set();
let currentAuthenticatedEmail = "";

// Calendar state initialized to October 2026
let calendarYear = 2026;
let calendarMonth = 9; // 9 = October

function startQuestionnaire() {
  document.getElementById('wizard-container').classList.remove('hidden');
}
function cancelQuestionnaire() {
  document.getElementById('wizard-container').classList.add('hidden');
}

function selectOption(stepNumber, selectedValue) {
  userAnswers[`q${stepNumber}`] = selectedValue;
  document.getElementById(`step-${stepNumber}`).classList.add('hidden');
  if (stepNumber < 4) {
    document.getElementById(`step-${stepNumber + 1}`).classList.remove('hidden');
    document.getElementById('step-indicator').innerText = `Question ${stepNumber + 1} of 4`;
  } else {
    localStorage.setItem('appliworld_onboarding', JSON.stringify(userAnswers));
    cancelQuestionnaire();
    openAuthModal('signup');
  }
}

function openLoginModal() {
  isLoginMode = true;
  updateAuthModalUI();
  document.getElementById('auth-modal').classList.remove('hidden');
}
function openAuthModal(mode) {
  isLoginMode = (mode === 'login');
  updateAuthModalUI();
  document.getElementById('auth-modal').classList.remove('hidden');
}
function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}
function toggleAuthMode(event) {
  if (event) event.preventDefault();
  isLoginMode = !isLoginMode;
  updateAuthModalUI();
}
function updateAuthModalUI() {
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const btn = document.getElementById('auth-submit-btn');
  const switchText = document.getElementById('auth-switch-text');
  if (isLoginMode) {
    if (title) title.innerText = "Welcome back to AppliWorld";
    if (subtitle) subtitle.innerText = "Log in to access your dashboard.";
    if (btn) btn.innerText = "Log In";
    if (switchText) switchText.innerHTML = `Don't have an account? <a href="#" onclick="toggleAuthMode(event)">Sign up</a>`;
  } else {
    if (title) title.innerText = "Create your AppliWorld account";
    if (subtitle) subtitle.innerText = "Save your plan and track deadlines.";
    if (btn) btn.innerText = "Create Account";
    if (switchText) switchText.innerHTML = `Already have an account? <a href="#" onclick="toggleAuthMode(event)">Log in</a>`;
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  if (!supabaseClient) { alert("Supabase client not initialized."); return; }

  if (isLoginMode) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { alert("Error logging in: " + error.message); return; }
    if (data.user && !data.user.email_confirmed_at) {
      await supabaseClient.auth.signOut();
      alert("Please verify your email address before logging in. Check your inbox for the confirmation link!");
      return;
    }
    currentAuthenticatedEmail = email;
    alert("Successfully logged in!");
    closeAuthModal();
    launchAppDashboard(email);
  } else {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) { alert("Error signing up: " + error.message); return; }
    alert("Account created! Check your email for the confirmation link.");
    closeAuthModal();
  }
}

function launchAppDashboard(email) {
  document.getElementById('public-header').classList.add('hidden');
  document.getElementById('landing-page-container').classList.add('hidden');
  document.getElementById('app-layout').classList.remove('hidden');

  const username = email ? email.split('@')[0] : "Student";
  document.getElementById('welcome-heading').innerText = `Welcome back, ${username}! 🌍`;

  renderHomeDashboard();
  renderExplorerGrid(universityCatalog);
  renderResources();
  renderInteractiveCalendar();
}

function switchSection(sectionId, event) {
  if (event) event.preventDefault();
  document.querySelectorAll('.app-section').forEach(sec => sec.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  const targetSection = document.getElementById(`section-${sectionId}`);
  if (targetSection) targetSection.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${sectionId}'`)) {
      btn.classList.add('active');
    }
  });
}

// --- GUIDE SECTION TAB SWITCHER ---
function switchGuideTab(tabName) {
  const infoContent = document.getElementById('guide-tab-info');
  const appContent = document.getElementById('guide-tab-app');
  const infoBtn = document.getElementById('tab-btn-info');
  const appBtn = document.getElementById('tab-btn-app');

  if (tabName === 'info') {
    infoContent.classList.remove('hidden');
    appContent.classList.add('hidden');
    infoBtn.classList.add('active');
    appBtn.classList.remove('active');
  } else {
    appContent.classList.remove('hidden');
    infoContent.classList.add('hidden');
    appBtn.classList.add('active');
    infoBtn.classList.remove('active');
  }
}

function renderHomeDashboard() {
  document.getElementById('home-shortlist-count').innerText = userShortlist.length;
  
  const selectedUnis = universityCatalog.filter(uni => userShortlist.includes(uni.id));
  let totalTasks = 0;
  selectedUnis.forEach(uni => totalTasks += uni.requirements.length);
  document.getElementById('home-task-count').innerText = `${completedTasks.size} / ${totalTasks}`;

  const top6 = universityCatalog.slice(0, 6);
  const homeUniGrid = document.getElementById('home-university-grid');
  if (homeUniGrid) {
    homeUniGrid.innerHTML = top6.map(uni => renderUniCardMarkup(uni)).join('');
  }

  renderPolishedChecklistAndUnis();
}

function renderPolishedChecklistAndUnis() {
  const selectedUnis = universityCatalog.filter(uni => userShortlist.includes(uni.id));
  const chipsContainer = document.getElementById('your-unis-chips');
  const checklistContainer = document.getElementById('full-checklist-container');

  if (!chipsContainer || !checklistContainer) return;

  if (selectedUnis.length === 0) {
    chipsContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No universities added to your shortlist yet.</p>`;
    checklistContainer.innerHTML = `<div class="empty-state-card"><p>No universities selected yet. Add universities from the University Explorer to generate your customized task checklist!</p></div>`;
    return;
  }

  chipsContainer.innerHTML = selectedUnis.map(uni => `
    <div class="uni-chip">
      🏛️ ${uni.name} <span style="font-size: 0.75rem; color: var(--text-muted);">(${uni.location})</span>
    </div>
  `).join('');

  checklistContainer.innerHTML = selectedUnis.map(uni => {
    const deadlinesFormatted = uni.deadlines.map(d => d.label).join(' | ');
    return `
      <div class="checklist-card-styled">
        <div class="checklist-card-header">
          <h4>${uni.name}</h4>
          <span class="checklist-deadline-badge">📅 Deadlines: ${deadlinesFormatted}</span>
        </div>
        <ul class="checklist-tasks-list">
          ${uni.requirements.map((req, index) => {
            const taskId = `${uni.id}-${index}`;
            const isChecked = completedTasks.has(taskId);
            return `
              <li class="checklist-task-item ${isChecked ? 'completed' : ''}">
                <label>
                  <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleTask('${taskId}')">
                  <span>${req}</span>
                </label>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function renderExplorerGrid(catalogToRender) {
  const fullGrid = document.getElementById('full-university-grid');
  if (fullGrid) {
    fullGrid.innerHTML = catalogToRender.map(uni => renderUniCardMarkup(uni)).join('');
  }
}

function renderUniCardMarkup(uni) {
  const deadlinesHtml = uni.deadlines.map(d => `<span><strong>${d.round}:</strong> ${d.label}</span>`).join('<br>');
  return `
    <div class="uni-card">
      <div class="uni-badge">✓ Verified Source</div>
      <h4>${uni.name}</h4>
      <p class="uni-loc">📍 ${uni.location}</p>
      <p class="uni-deadline">📅 <strong>Deadlines:</strong><br>${deadlinesHtml}</p>
      <div class="uni-actions">
        <a href="${uni.site}" target="_blank" class="btn-text">Official Site →</a>
        <button class="btn-primary-sm" onclick="toggleShortlist(${uni.id})">
          ${userShortlist.includes(uni.id) ? 'Remove' : '+ Add to List'}
        </button>
      </div>
    </div>
  `;
}

function filterUniversities() {
  const query = document.getElementById('uni-search').value.toLowerCase();
  const filtered = universityCatalog.filter(uni => 
    uni.name.toLowerCase().includes(query) || uni.location.toLowerCase().includes(query)
  );
  renderExplorerGrid(filtered);
}

function toggleShortlist(uniId) {
  if (userShortlist.includes(uniId)) {
    userShortlist = userShortlist.filter(id => id !== uniId);
  } else {
    userShortlist.push(uniId);
  }
  renderHomeDashboard();
  renderExplorerGrid(universityCatalog);
  renderInteractiveCalendar();
}

function toggleTask(taskId) {
  if (completedTasks.has(taskId)) {
    completedTasks.delete(taskId);
  } else {
    completedTasks.add(taskId);
  }
  renderHomeDashboard();
}

// --- INTERACTIVE MONTH-TO-MONTH CALENDAR (Oct 2026 - Mar 2029) ---
function changeCalendarMonth(direction) {
  calendarMonth += direction;
  if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  } else if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  }

  if (calendarYear < 2026 || (calendarYear === 2026 && calendarMonth < 9)) {
    calendarYear = 2026;
    calendarMonth = 9;
  }
  if (calendarYear > 2029 || (calendarYear === 2029 && calendarMonth > 2)) {
    calendarYear = 2029;
    calendarMonth = 2;
  }

  renderInteractiveCalendar();
}

function renderInteractiveCalendar() {
  const titleEl = document.getElementById('calendar-month-title');
  const gridEl = document.getElementById('interactive-calendar-grid');
  if (!titleEl || !gridEl) return;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  titleEl.innerText = `${monthNames[calendarMonth]} ${calendarYear}`;

  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();

  const selectedUnis = universityCatalog.filter(uni => userShortlist.includes(uni.id));

  let markup = "";

  for (let i = 0; i < firstDayIndex; i++) {
    markup += `<div class="calendar-day empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const formattedMonth = String(calendarMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateString = `${calendarYear}-${formattedMonth}-${formattedDay}`;

    // Highlight TODAY (October 22, 2026)
    const isToday = (calendarYear === 2026 && calendarMonth === 9 && day === 22);

    const matchingDeadlines = [];
    selectedUnis.forEach(uni => {
      uni.deadlines.forEach(d => {
        if (d.date === dateString) {
          matchingDeadlines.push({ uniName: uni.name, round: d.round });
        }
      });
    });

    const hasDeadline = matchingDeadlines.length > 0;

    let classList = "calendar-day";
    if (isToday) classList += " today";
    if (hasDeadline) classList += " deadline";

    markup += `
      <div class="${classList}">
        <strong>${day}</strong>
        <div>
          ${isToday ? '<span style="color: #3b82f6; font-size: 0.7rem; font-weight: 700;">● Today</span>' : ''}
          ${hasDeadline ? matchingDeadlines.map(m => `<div class="deadline-tag" title="${m.uniName} (${m.round})">${m.uniName} (${m.round})</div>`).join('') : ''}
        </div>
      </div>
    `;
  }

  gridEl.innerHTML = markup;
}

function renderResources() {
  const markup = resourceCatalog.map(res => `
    <div class="resource-card">
      <span class="res-category">${res.category}</span>
      <h4>${res.title}</h4>
      <p>${res.description}</p>
      <a href="${res.link}" target="_blank" class="btn-text" style="margin-top: auto; padding-top: 1rem; display: inline-block;">Open Resource →</a>
    </div>
  `).join('');

  if (document.getElementById('home-resources-grid')) {
    document.getElementById('home-resources-grid').innerHTML = markup;
  }
}