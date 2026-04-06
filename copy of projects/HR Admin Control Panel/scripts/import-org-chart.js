/**
 * Parses the BambooHR org chart CSV, downloads & compresses photos,
 * and outputs a seed JSON for the admin panel.
 *
 * Run: node scripts/import-org-chart.js
 * Output: packages/admin/src/data/org-chart-seed.json
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const CSV_PATH = path.resolve(__dirname, '../general_bamboohr_org_chart.csv');
const OUTPUT = path.resolve(__dirname, '../packages/admin/src/data/org-chart-seed.json');
const MAX_SIZE = 200; // smaller for 328 employees to keep bundle reasonable
const CONCURRENCY = 10;

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === '\n' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if (ch === '\r' && !inQuotes) {
      // skip
    } else {
      current += ch;
    }
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
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return resolve(null);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

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
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toBuffer('image/jpeg', 60);
    return 'data:image/jpeg;base64,' + out.toString('base64');
  } catch {
    return null;
  }
}

// Process in batches for concurrency control
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

async function main() {
  console.log('Parsing CSV...');
  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csv);
  console.log(`Found ${rows.length} employees`);

  console.log('Downloading and compressing photos...');
  const results = await processBatch(rows, async (row) => {
    const name = row['Name'] || '';
    const parts = name.split(',').map(s => s.trim());
    let firstName, lastName;

    if (parts.length === 1) {
      // "First Last" format
      const words = parts[0].split(' ');
      firstName = words[0] || '';
      lastName = words.slice(1).join(' ') || '';
    } else {
      // shouldn't happen in this CSV but just in case
      firstName = parts[1] || '';
      lastName = parts[0] || '';
    }

    let photoUrl = null;
    const photoField = row['Photo'] || '';
    if (photoField && photoField.startsWith('http')) {
      const buf = await downloadBuffer(photoField);
      if (buf) {
        photoUrl = await compressBuffer(buf);
      }
    }

    return {
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      email: row['Email'] || '',
      department: row['Department'] || '',
      jobTitle: row['Job Title'] || '',
      employeeId: row['PersonID'] || '',
      location: row['Location'] || '',
      supervisorId: row['SupervisorID'] || '',
      photoUrl,
      initials: `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase(),
    };
  }, CONCURRENCY);

  const withPhotos = results.filter(r => r.photoUrl).length;
  console.log(`Photos: ${withPhotos}/${results.length} downloaded`);

  // Calculate total size
  const json = JSON.stringify(results, null, 2);
  const sizeMB = (Buffer.byteLength(json) / 1024 / 1024).toFixed(1);
  console.log(`Output size: ${sizeMB} MB`);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, json);
  console.log(`Wrote ${results.length} entries to ${OUTPUT}`);
}

main().catch(console.error);
