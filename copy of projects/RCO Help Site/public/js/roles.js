/**
 * roles.js — RCO IT Help Site  ·  Access Control
 *
 * Defaults are defined here. Firebase RTDB can override per-role access
 * via the permissions node so IT Admins can toggle access from the site.
 */

import { getApps, getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, get, set }     from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ── Hierarchy ───────────────────────────────────────────────────────────────
const LEVELS = { it_admin: 4, c_suite: 3, director: 2, manager: 1, staff: 0 };

const MEMBERS = {
  it_admin: [
    'philip@rowecasaorganics.com',
    'andrew.neidley@rowecasaorganics.com',
    'kasey.tomasek@rowecasaorganics.com',
    'hayden.howell@rowecasaorganics.com',
    'chase.parrish@rowecasaorganics.com',
  ],
  c_suite: [
    'mike@rowecasaorganics.com',
    'jill@rowecasaorganics.com',
    'alicia@rowecasaorganics.com',
    'jacob@rowecasaorganics.com',
    'chris.paulene@rowecasaorganics.com',
    'michael@rowecasaorganics.com',
    'grant@rowecasaorganics.com',
    'ivan.gonzalez@rowecasaorganics.com',
    'heidi.partlow@rowecasaorganics.com',
  ],
  director: [
    'carly@rowecasaorganics.com',
    'kristen@rowecasaorganics.com',
    'celina.bianco@rowecasaorganics.com',
    'carissa@rowecasaorganics.com',
    'courtneyd@rowecasaorganics.com',
    'amanda@rowecasaorganics.com',
    'lisa@rowecasaorganics.com',
    'rachel.neidley@rowecasaorganics.com',
    'reylia@rowecasaorganics.com',
    'darcie.snyder@rowecasaorganics.com',
    'laura@rowecasaorganics.com',
    'krystle@rowecasaorganics.com',
    'kevin.ludwig@rowecasaorganics.com',
    'cammie.mccarty@rowecasaorganics.com',
  ],
  manager: [
    'kelsea.berry@rowecasaorganics.com',
    'lara@rowecasaorganics.com',
    'cassandra.oberembt@rowecasaorganics.com',
    'amanda.preddy@rowecasaorganics.com',
    'brandi@rowecasaorganics.com',
    'tonia@rowecasaorganics.com',
    'mark@rowecasaorganics.com',
    'alisha.wilson@rowecasaorganics.com',
    'ashley.roberson@rowecasaorganics.com',
    'kathy.sanford@rowecasaorganics.com',
    'morgan.storey@rowecasaorganics.com',
    'casey@rowecasaorganics.com',
    'kaylee@rowecasaorganics.com',
    'latasha.harris@rowecasaorganics.com',
    'katie@rowecasaorganics.com',
    'courtney@rowecasaorganics.com',
    'treavor.ford@rowecasaorganics.com',
    'lexie@rowecasaorganics.com',
    'jessica@rowecasaorganics.com',
    'jc@rowecasaorganics.com',
    'keasha@rowecasaorganics.com',
    'summer@rowecasaorganics.com',
    'ryan.churchill@rowecasaorganics.com',
    'krystle@rowecasaorganics.com',
    'kacie@rowecasaorganics.com',
    'leah.gideon@rowecasaorganics.com',
    'emily.seaman@rowecasaorganics.com',
    'graceh@rowecasaorganics.com',
    'emma.parrish@rowecasaorganics.com',
  ],
  staff: [],
};

// ── Content config (surveys / forms) ────────────────────────────────────────
export const CONTENT_CONFIG = {
  surveys: [
    {
      id:       'tech-discovery',
      title:    'RCO IT Software Inventory',
      minRole:  'manager',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1qGufmR0KvRCU8OhQiZgf1R9CnvEvBBHogAcUh6XbOeM/edit?gid=72884401#gid=72884401',
      url:      'surveys/tech-discovery.html',
    },
  ],
  forms: [
    {
      id:       'onboarding',
      title:    'User Onboarding Request',
      minRole:  'manager',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1HA_jQYKXn5X-WhcIUd79NPzR_WIzCi5y5CJ9aW7fVGk/edit?gid=1473197887#gid=1473197887',
      url:      'forms/onboarding.html',
    },
    {
      id:       'offboarding',
      title:    'User Offboarding Request',
      minRole:  'manager',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1HIlC6OlWtyIN8DH1kRnf0P2GBHGlHUWBJxFyllfdwjk/edit?gid=2068521876#gid=2068521876',
      url:      'forms/offboarding.html',
    },
    {
      id:       'equipment',
      title:    'IT Equipment & Software Request',
      minRole:  'manager',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1fbvR-hUOgW_nmhzuNn7mnS2bk75dbzUa-x_leXWt2Wo/edit?gid=461376341#gid=461376341',
      url:      'forms/equipment.html',
    },
    {
      id:       'rockstars',
      title:    'RCO Rockstars',
      minRole:  'manager',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1EctqjjirIIpJsLu4QgY7OpaQ0wnlid4h8zhfFMedkvk/edit?gid=689718345#gid=689718345',
      url:      'forms/rockstars.html',
    },
  ],
};

// ── Site features (non-content items that can be toggled) ───────────────────
export const FEATURES_CONFIG = [
  { id: 'results',         title: 'Survey & Form Results', minRole: 'it_admin' },
  { id: 'sheets',          title: 'Google Sheets',         minRole: 'it_admin' },
  { id: 'roles',           title: 'Roles / Access Panel',  minRole: 'it_admin' },
  { id: 'all_submissions', title: 'View All Submissions',  minRole: 'it_admin' },
  { id: 'knowledge',       title: 'IT Knowledge Base',     minRole: 'staff'    },
];

// ── Role names (display order) ──────────────────────────────────────────────
export const ROLE_NAMES  = ['it_admin', 'c_suite', 'director', 'manager', 'staff'];
export const ROLE_LABELS = { it_admin:'IT Admin', c_suite:'C-Suite', director:'Director', manager:'Manager', staff:'Staff' };

// ── Mutable permission overrides ────────────────────────────────────────────
// Keys = role name, values = array of content IDs that role can access.
// null means "use defaults (minRole hierarchy)". Once loaded from RTDB this
// gets populated per role.
const _permOverrides = {};

// ── Firebase RTDB reference ─────────────────────────────────────────────────
let _rtdb = null;

function getRtdb() {
  if (_rtdb) return _rtdb;
  const app = getApps().length ? getApp() : null;
  if (!app) return null;
  _rtdb = getDatabase(app);
  return _rtdb;
}

// ── Load permission overrides from RTDB (with timeout so page isn't blocked) ─
export async function loadPermissions() {
  try {
    const db = getRtdb();
    if (!db) return;
    const snap = await Promise.race([
      get(ref(db, 'permissions')),
      new Promise((_, reject) => setTimeout(() => reject(new Error('RTDB timeout')), 5000))
    ]);
    if (snap.exists()) {
      const saved = snap.val();
      for (const [roleName, config] of Object.entries(saved)) {
        if (ROLE_NAMES.includes(roleName) && config.content) {
          _permOverrides[roleName] = config.content;
        }
      }
    }
  } catch (e) {
    console.warn('roles.js: could not load RTDB permissions, using defaults', e);
  }
}

// ── Save a single role's content permissions to RTDB ────────────────────────
export async function saveRolePermissions(roleName, contentIds) {
  try {
    const db = getRtdb();
    if (!db) return;
    _permOverrides[roleName] = contentIds;
    await set(ref(db, `permissions/${roleName}/content`), contentIds);
  } catch (e) {
    console.error('roles.js: could not save permissions', e);
  }
}

// ── Core helpers ────────────────────────────────────────────────────────────
export function getRole(email) {
  const e = (email || '').toLowerCase().trim();
  for (const [role, list] of Object.entries(MEMBERS)) {
    if (list.some(m => m.toLowerCase() === e)) return role;
  }
  return 'staff';
}

export function getRoleLevel(email) { return LEVELS[getRole(email)] ?? 0; }

export function getRoleLabel(email) {
  return ROLE_LABELS[getRole(email)] ?? 'Staff';
}

/**
 * Get every toggleable item (content + features) in one flat list.
 */
export function getAllItems() {
  return [
    ...CONTENT_CONFIG.surveys.map(c => ({ ...c, type: 'Survey' })),
    ...CONTENT_CONFIG.forms.map(c =>   ({ ...c, type: 'Form' })),
    ...FEATURES_CONFIG.map(f =>        ({ ...f, type: 'Feature' })),
  ];
}

/**
 * Check if an email can access a specific item (content or feature).
 * If RTDB overrides exist for the user's role, use those.
 * Otherwise fall back to the minRole hierarchy.
 */
export function canAccess(email, itemId) {
  const role = getRole(email);
  if (role === 'it_admin') return true;

  if (_permOverrides[role]) {
    return _permOverrides[role].includes(itemId);
  }

  // Default: use minRole hierarchy
  const item = getAllItems().find(c => c.id === itemId);
  if (!item) return false;
  return (LEVELS[role] ?? 0) >= (LEVELS[item.minRole] ?? 0);
}

/**
 * Check if a role has access to an item ID (by role name, not email).
 * Used by the admin toggle panel.
 */
export function roleHasAccess(roleName, itemId) {
  if (roleName === 'it_admin') return true;

  if (_permOverrides[roleName]) {
    return _permOverrides[roleName].includes(itemId);
  }

  const item = getAllItems().find(c => c.id === itemId);
  if (!item) return false;
  return (LEVELS[roleName] ?? 0) >= (LEVELS[item.minRole] ?? 0);
}

/**
 * Get the current item IDs a role can access (resolved from overrides or defaults).
 */
export function getRoleContentIds(roleName) {
  if (_permOverrides[roleName]) return [..._permOverrides[roleName]];

  const all = getAllItems();
  const level = LEVELS[roleName] ?? 0;
  return all.filter(c => level >= (LEVELS[c.minRole] ?? 0)).map(c => c.id);
}

export function canViewSheets(email)         { return canAccess(email, 'sheets'); }
export function canViewAllSubmissions(email) { return canAccess(email, 'all_submissions'); }
export function canViewResults(email)        { return canAccess(email, 'results'); }
export function canViewRoles(email)          { return canAccess(email, 'roles'); }

export { MEMBERS, LEVELS };
