// ============================================================
//  RCO Rockstars — Google Sheets Integration
//  Run setupSheet() once manually to format headers.
//  Submissions push data down, newest at the top.
// ============================================================

const SHEET_NAME = 'RCO Rockstars';

const COLORS = [
  '#f6f0e6', // warm cream
  '#e8f5f0', // soft sage
  '#fdf8ee', // soft gold
  '#ede8f5', // soft lavender
  '#f5ece8', // soft terracotta
  '#e8f0f5', // soft sky
  '#eef5e8', // soft mint
  '#f5f0e8', // warm sand
];

const HEADERS = [
  'Submitted',
  'Submitted By',
  'Month',
  'Rockstar Name',
  'Quote',
  'Has Photo',
];

// ============================================================
//  RUN THIS ONCE MANUALLY — sets up headers and formatting
// ============================================================
function setupSheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const numCols = HEADERS.length;
  sheet.getRange(1, 1, 1, numCols).clearContent();
  sheet.getRange(1, 1, 1, numCols).clearFormat();
  sheet.getRange(1, 1, 1, numCols).setValues([HEADERS]);
  formatHeaderRow(sheet, numCols);

  SpreadsheetApp.getUi().alert('✅ Sheet setup complete! Headers are formatted and ready.');
}

// ── doPost ───────────────────────────────────────────────────
function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_NAME);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

    const numCols = HEADERS.length;

    // Safety net — if sheet has no header, run setup silently
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, numCols).setValues([HEADERS]);
      formatHeaderRow(sheet, numCols);
    }

    // ── Collect rockstar rows from payload ────────────────────
    const submittedAt  = new Date();
    const submittedStr = Utilities.formatDate(submittedAt, Session.getScriptTimeZone(), 'MM/dd/yyyy h:mm a');
    const submittedBy  = data.submitted_by || '—';
    const month        = data.month || '—';
    const count        = parseInt(data.rockstar_count) || 0;

    const rows = [];
    for (let r = 0; r < count; r++) {
      const name  = (data['rs_' + r + '_name']  || '').trim();
      const quote = (data['rs_' + r + '_quote'] || '').trim();
      const photo = (data['rs_' + r + '_photo'] || 'No');
      if (!name) continue;
      rows.push([
        r === 0 ? submittedStr : '',
        r === 0 ? submittedBy  : '',
        month,
        name,
        quote || '—',
        photo,
      ]);
    }

    if (rows.length === 0) {
      rows.push([submittedStr, submittedBy, month, '—', '—', 'No']);
    }

    // ── Pick next color ──────────────────────────────────────
    const color      = getNextColor(sheet);
    const lightColor = lightenColor(color);

    // ── Insert rows after row 1 (newest at top) ──────────────
    const totalNewRows = rows.length + 1; // data rows + spacer
    sheet.insertRowsAfter(1, totalNewRows);

    // ── Write rows ───────────────────────────────────────────
    rows.forEach((row, i) => {
      const rowNum   = 2 + i;
      const rowRange = sheet.getRange(rowNum, 1, 1, numCols);
      rowRange.setValues([row]);

      rowRange.setBackground(i === 0 ? color : lightColor);
      rowRange.setFontColor('#3d2b1f');
      rowRange.setFontSize(10);
      rowRange.setVerticalAlignment('middle');
      rowRange.setWrap(false);
      sheet.setRowHeight(rowNum, 26);

      if (i === 0) {
        sheet.getRange(rowNum, 1, 1, 3).setFontWeight('bold');
      } else {
        sheet.getRange(rowNum, 1, 1, 2).setFontColor('#9e8a7a');
      }
    });

    // ── Spacer row ───────────────────────────────────────────
    const spacerRow = 2 + rows.length;
    sheet.setRowHeight(spacerRow, 14);
    sheet.getRange(spacerRow, 1, 1, numCols).setBackground('#ffffff');

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log('Error: ' + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Get next color ────────────────────────────────────────────
function getNextColor(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return COLORS[0];
  try {
    for (let r = 2; r <= lastRow; r++) {
      const bg = sheet.getRange(r, 1).getBackground().toLowerCase();
      if (bg && bg !== '#ffffff' && bg !== 'white') {
        const idx = COLORS.findIndex(c =>
          c.toLowerCase() === bg || lightenColor(c).toLowerCase() === bg
        );
        if (idx !== -1) return COLORS[(idx + 1) % COLORS.length];
      }
    }
  } catch(e) {}
  return COLORS[0];
}

// ── Lighten a hex color ───────────────────────────────────────
function lightenColor(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const blend = v => Math.round(v + (255 - v) * 0.2);
  return '#' + [blend(r), blend(g), blend(b)]
    .map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── doGet — health check ──────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'RCO Rockstars endpoint is live.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Format header row ─────────────────────────────────────────
function formatHeaderRow(sheet, numCols) {
  const hdr = sheet.getRange(1, 1, 1, numCols);
  hdr.setValues([HEADERS]);
  hdr.setFontWeight('bold');
  hdr.setBackground('#5f4b3c');
  hdr.setFontColor('#ffffff');
  hdr.setFontSize(11);
  hdr.setHorizontalAlignment('center');
  hdr.setVerticalAlignment('middle');
  hdr.setWrap(false);
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 40);

  const widths = [145, 280, 120, 220, 350, 80];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
}
