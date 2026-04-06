// ============================================================
//  app.js — RCO IT Help Site
//  Handles: Firebase auth, Firestore submissions, nav, contact
// ============================================================

import { initializeApp, getApps, getApp }                  from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut }             from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Config ─────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyD-mpyReAsJW3dUiWQhFlFeIvUYj_Iju-E',
  authDomain:        'it-help-site.firebaseapp.com',
  databaseURL:       'https://it-help-site-default-rtdb.firebaseio.com',
  projectId:         'it-help-site',
  storageBucket:     'it-help-site.firebasestorage.app',
  messagingSenderId: '742349139773',
  appId:             '1:742349139773:web:3780ad352a9a7e00f55f54',
};

const ALLOWED_DOMAIN = '@rowecasaorganics.com';

// ── Init — reuse existing app if already initialized by roles module ────────
const app  = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser = null;

// ── Auth guard ──────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user || !user.email.endsWith(ALLOWED_DOMAIN)) {
    signOut(auth).finally(() => window.location.replace('login.html'));
    return;
  }
  currentUser = user;
  const userEl = document.getElementById('topbarUser');
  if (userEl) userEl.textContent = user.email;
});

// ── Sign out ────────────────────────────────────────────────────────────────
document.getElementById('authBtn')?.addEventListener('click', () => {
  signOut(auth).then(() => window.location.replace('login.html'));
});

// ── Sidebar nav ─────────────────────────────────────────────────────────────
document.querySelectorAll('[data-section]').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.section;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('[data-section]').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + name)?.classList.add('active');
    btn.classList.add('active');
    if (name === 'completed') {
      renderCompleted();
      if (typeof window.renderSubFilters === 'function') window.renderSubFilters(window._typeTab || 'surveys');
    }
    if (name === 'results' && typeof window.loadResults === 'function') {
      window.loadResults();
    }
  });
});

// ── Start survey button ─────────────────────────────────────────────────────
document.getElementById('startSurveyBtn')?.addEventListener('click', () => {
  window.location.href = 'surveys/tech-discovery.html';
});

// ── Refresh button ──────────────────────────────────────────────────────────
document.getElementById('refreshBtn')?.addEventListener('click', () => {
  renderCompleted();
});

// ── Expose renderCompleted for toggle buttons ───────────────────────────────
window._renderCompleted = renderCompleted;

// ── Helpers ─────────────────────────────────────────────────────────────────
function showListError(msg) {
  const html = `<div class="empty-state" style="padding:1.5rem 0">
    <div class="empty-icon">⚠️</div>
    <h3>Could not load submissions</h3>
    <p style="color:var(--sb-muted)">${msg}</p>
  </div>`;
  const sl = document.getElementById('completedSurveysList');
  const fl = document.getElementById('completedFormsList');
  if (sl) sl.innerHTML = html;
  if (fl) fl.innerHTML = html;
}

const PAGE_SIZE = 5;

function renderCards(docs, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!docs.length) {
    container.innerHTML = `<div class="empty-state" style="padding:1.5rem 0">
      <div class="empty-icon">📭</div>
      <p style="color:var(--sb-muted)">No submissions yet.</p>
    </div>`;
    return;
  }

  function buildCard(doc) {
    const s    = doc.data();
    const date = s.submittedAt?.toDate
      ? s.submittedAt.toDate().toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit'
        })
      : '—';
    return `<div class="card brown completed-card">
      <div class="card-top">
        <span class="card-status status-active">Submitted</span>
      </div>
      <h3 style="font-size:0.88rem">${s.title || 'Submission'}</h3>
      <div style="font-size:0.72rem;line-height:1.7;color:var(--sb-muted)">
        <div><strong>Department:</strong> ${s.dept || '—'}</div>
        <div style="white-space:nowrap"><strong>Submitted:</strong> ${date}</div>
        <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${s.userEmail || '—'}"><strong>By:</strong> ${s.userEmail || '—'}</div>
      </div>
      <div class="card-meta">
        <button class="card-action" data-url="${s.url || '#'}">Take Again →</button>
      </div>
    </div>`;
  }

  const visible  = docs.slice(0, PAGE_SIZE);
  const overflow = docs.slice(PAGE_SIZE);

  let html = `<div class="cards">${visible.map(buildCard).join('')}</div>`;

  if (overflow.length) {
    html += `
      <div id="${containerId}-more" class="cards" style="display:none">
        ${overflow.map(buildCard).join('')}
      </div>
      <div style="text-align:center;margin-top:1rem" id="${containerId}-more-wrap">
        <button class="clear-btn" style="font-size:0.82rem;font-weight:700"
                id="${containerId}-showmore">
          Show ${overflow.length} more submission${overflow.length !== 1 ? 's' : ''} ↓
        </button>
      </div>`;
  }

  container.innerHTML = html;

  document.getElementById(`${containerId}-showmore`)?.addEventListener('click', () => {
    document.getElementById(`${containerId}-more`).style.display = '';
    document.getElementById(`${containerId}-more-wrap`).style.display = 'none';
  });

  container.querySelectorAll('[data-url]').forEach(btn => {
    btn.addEventListener('click', () => window.location.href = btn.dataset.url);
  });
}

// ── Completed submissions ───────────────────────────────────────────────────
async function renderCompleted() {
  const surveysList = document.getElementById('completedSurveysList');
  const formsList   = document.getElementById('completedFormsList');
  if (!surveysList || !formsList) return;

  const spinner = `<div class="empty-state" style="padding:1.5rem 0">
    <div class="login-spinner" style="margin:1rem auto"></div>
    <p style="color:var(--sb-muted)">Loading submissions...</p>
  </div>`;
  surveysList.innerHTML = spinner;
  formsList.innerHTML   = spinner;

  // ── Wait for auth if needed (max 6s) ──────────────────────────────────────
  if (!currentUser) {
    await new Promise(resolve => {
      const unsub = onAuthStateChanged(auth, user => {
        if (user) { currentUser = user; unsub(); resolve(); }
      });
      setTimeout(resolve, 6000);
    });
  }

  if (!currentUser) {
    showListError('Not signed in. Please refresh the page.');
    return;
  }

  // ── Wait for roles module to set window._canViewAllSubmissions (max 4s) ───
  if (window._canViewAllSubmissions === undefined) {
    await new Promise(resolve => {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window._canViewAllSubmissions !== undefined || attempts >= 40) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  try {
    const viewAll = window._canViewAllSubmissions === true
                    && window._submissionsView === 'all';

    const q = viewAll
      ? query(collection(db, 'submissions'))
      : query(collection(db, 'submissions'), where('uid', '==', currentUser.uid));

    const snap = await getDocs(q);
    console.log(`renderCompleted — ${snap.size} docs, viewAll=${viewAll}`);

    // ── Apply sub-filter if a specific survey/form is selected ────────────
    const cfg        = window._contentConfig || { surveys: [], forms: [] };
    let filteredDocs = snap.docs;
    const subFilter  = window._subFilter;
    if (subFilter) {
      const fi = [...cfg.surveys, ...cfg.forms].find(c => c.id === subFilter);
      if (fi) {
        const ft = fi.title.toLowerCase();
        filteredDocs = filteredDocs.filter(doc => {
          const t = (doc.data().title || '').toLowerCase();
          return t.includes(ft) || ft.includes(t);
        });
      }
    }

    // ── Sort into surveys vs forms ────────────────────────────────────────
    const surveyTitles = cfg.surveys.map(s => s.title.toLowerCase());
    const formTitles   = cfg.forms.map(f => f.title.toLowerCase());

    const surveysData = [], formsData = [], otherData = [];

    filteredDocs.forEach(doc => {
      const title = (doc.data().title || '').toLowerCase();
      if (surveyTitles.some(t => title.includes(t) || t.includes(title))) {
        surveysData.push(doc);
      } else if (formTitles.some(t => title.includes(t) || t.includes(title))) {
        formsData.push(doc);
      } else {
        otherData.push(doc);
      }
    });

    // Unknown types bucket into Surveys
    renderCards([...surveysData, ...otherData], 'completedSurveysList');
    renderCards(formsData, 'completedFormsList');

  } catch (err) {
    console.error('Firestore error:', err);
    showListError(err.message);
  }
}

// ── Contact form ────────────────────────────────────────────────────────────
document.getElementById('sendBtn')?.addEventListener('click', () => {
  const from    = document.getElementById('contactFrom')?.value.trim();
  const subject = document.getElementById('contactSubject')?.value.trim();
  const body    = document.getElementById('contactBody')?.value.trim();

  if (!from)    { setContactStatus('error', 'Please enter your email address.'); return; }
  if (!subject) { setContactStatus('error', 'Please enter a subject.'); return; }
  if (!body)    { setContactStatus('error', 'Please enter a message.'); return; }

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1`
    + `&to=${encodeURIComponent('itsupport@rowecasaorganics.com')}`
    + `&su=${encodeURIComponent(subject)}`
    + `&body=${encodeURIComponent('From: ' + from + '\n\n' + body)}`;

  window.open(gmailUrl, '_blank');
  setContactStatus('success', '✅ Gmail opened with your message ready to send!');
});

document.getElementById('clearBtn')?.addEventListener('click', () => {
  ['contactFrom', 'contactSubject', 'contactBody'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  setContactStatus('', '');
});

function setContactStatus(type, msg) {
  const el = document.getElementById('contactStatus');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'contact-status' + (type ? ' ' + type : '');
}
