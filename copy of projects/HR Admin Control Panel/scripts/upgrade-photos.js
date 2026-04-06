/**
 * Re-downloads BambooHR photos at 800px (up from 200px) and updates
 * ONLY the photoUrl field on existing Firestore employee documents.
 * Uses Firebase REST API — no admin SDK or service account needed.
 *
 * Run: node scripts/upgrade-photos.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const CSV_PATH = path.resolve(__dirname, '../general_bamboohr_org_chart.csv');
const PROJECT_ID = 'rco-hr-admin';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAX_SIZE = 1200;
const QUALITY = 92;
const CONCURRENCY = 10;

// Get access token from Firebase CLI's stored refresh token
function getAccessToken() {
  const configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.config/configstore/firebase-tools.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const refreshToken = config.tokens?.refresh_token;
  if (!refreshToken) throw new Error('No Firebase refresh token found. Run: firebase login');

  return new Promise((resolve, reject) => {
    const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com&client_secret=j9iVZfS8kkCEFUPaAeJV0sAi`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const data = JSON.parse(Buffer.concat(chunks).toString());
        if (data.access_token) resolve(data.access_token);
        else reject(new Error('Token refresh failed: ' + JSON.stringify(data)));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

let ACCESS_TOKEN = '';

// ─── CSV Parser ──────────────────────────────────
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === '\n' && !inQuotes) { lines.push(current); current = ''; }
    else if (ch === '\r' && !inQuotes) { /* skip */ }
    else { current += ch; }
  }
  if (current.trim()) lines.push(current);
  const header = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const fields = parseLine(lines[i]);
    const obj = {};
    header.forEach((h, idx) => { obj[h] = fields[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

function parseLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { fields.push(current); current = ''; }
    else { current += ch; }
  }
  fields.push(current);
  return fields;
}

// ─── HTTP helpers ────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve);
      }
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: ACCESS_TOKEN ? { 'Authorization': `Bearer ${ACCESS_TOKEN}` } : {},
      timeout: 30000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function patchDocument(docPath, fields) {
  return new Promise((resolve, reject) => {
    const fieldPaths = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&');
    const url = `${FIRESTORE_BASE}/${docPath}?${fieldPaths}`;
    const body = JSON.stringify({ fields });
    const parsed = new URL(url);

    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (ACCESS_TOKEN) headers['Authorization'] = `Bearer ${ACCESS_TOKEN}`;

    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'PATCH',
      headers,
      timeout: 30000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(true);
        else {
          const resp = Buffer.concat(chunks).toString();
          reject(new Error(`PATCH ${res.statusCode}: ${resp.substring(0, 200)}`));
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Image compression ───────────────────────────
async function compressBuffer(buffer) {
  try {
    const img = await loadImage(buffer);
    let { width, height } = img;
    if (width > height) {
      if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
    } else {
      if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
    }
    const canvas = createCanvas(width, height);
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    const out = canvas.toBuffer('image/jpeg', QUALITY);
    return 'data:image/jpeg;base64,' + out.toString('base64');
  } catch {
    return null;
  }
}

// ─── Batch processor ─────────────────────────────
async function processBatch(items, fn, concurrency) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    process.stdout.write(`  ${Math.min(i + concurrency, items.length)}/${items.length}\r`);
  }
  console.log();
  return results;
}

// ─── Main ────────────────────────────────────────
async function main() {
  // 0. Authenticate
  console.log('Authenticating with Firebase...');
  ACCESS_TOKEN = await getAccessToken();
  console.log('Authenticated.');

  // 1. Parse CSV
  console.log('Parsing CSV...');
  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csv);
  console.log(`Found ${rows.length} rows in CSV`);

  // 2. Load all employees from Firestore via REST API (paginated)
  console.log('Loading employees from Firestore...');
  const employees = [];
  let pageToken = '';
  do {
    const url = `${FIRESTORE_BASE}/employees?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const resp = await fetchJSON(url);
    if (resp.documents) {
      for (const doc of resp.documents) {
        const id = doc.name.split('/').pop();
        const f = doc.fields || {};
        employees.push({
          id,
          firstName: f.firstName?.stringValue || '',
          lastName: f.lastName?.stringValue || '',
          displayName: f.displayName?.stringValue || '',
          email: f.email?.stringValue || '',
        });
      }
    }
    pageToken = resp.nextPageToken || '';
  } while (pageToken);
  console.log(`Found ${employees.length} employees in Firestore`);

  // 3. Match CSV rows to Firestore employees
  function normalize(s) { return (s || '').toLowerCase().trim(); }

  const matched = [];
  for (const row of rows) {
    const csvName = row['Name'] || '';
    const words = csvName.split(' ').map(s => s.trim());
    const firstName = words[0] || '';
    const lastName = words.slice(1).join(' ') || '';
    const photoUrl = row['Photo'] || '';
    if (!photoUrl || !photoUrl.startsWith('http')) continue;

    const csvFirst = normalize(firstName);
    const csvLast = normalize(lastName);
    const csvDisplay = normalize(`${firstName} ${lastName}`);

    const emp = employees.find((e) =>
      (normalize(e.firstName) === csvFirst && normalize(e.lastName) === csvLast) ||
      normalize(e.displayName) === csvDisplay
    );

    if (emp) {
      matched.push({ empId: emp.id, empName: emp.displayName || `${emp.firstName} ${emp.lastName}`, photoUrl });
    }
  }
  console.log(`Matched ${matched.length} employees to CSV photos`);

  // 4. Download photos at 800px
  console.log(`Downloading photos at ${MAX_SIZE}px...`);
  const downloaded = await processBatch(matched, async (item) => {
    const buf = await downloadBuffer(item.photoUrl);
    if (!buf) return { ...item, newPhoto: null };
    const compressed = await compressBuffer(buf);
    return { ...item, newPhoto: compressed };
  }, CONCURRENCY);

  const withPhotos = downloaded.filter(d => d.newPhoto).length;
  console.log(`Downloaded ${withPhotos}/${matched.length} photos`);

  // 5. Update Firestore — ONLY photoUrl
  console.log('Updating Firestore (photoUrl only)...');
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < downloaded.length; i++) {
    const item = downloaded[i];
    if (!item.newPhoto) { skipped++; continue; }

    try {
      await patchDocument(`employees/${item.empId}`, {
        photoUrl: { stringValue: item.newPhoto },
      });
      updated++;
    } catch (err) {
      console.error(`  Error updating ${item.empName}: ${err.message}`);
      errors++;
    }

    if ((i + 1) % 20 === 0) {
      process.stdout.write(`  Updated ${updated}/${downloaded.length}\r`);
    }
  }

  console.log(`\nDone!`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped (download failed): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Not matched to Firestore: ${rows.length - matched.length}`);
}

main().catch(console.error);
