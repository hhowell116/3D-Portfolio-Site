import { useState, useRef, useMemo } from 'react';
import {
  collection, addDoc, getDocs, serverTimestamp, getDoc, doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { syncEmployeeCampaigns } from '../utils/autoCampaign';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import {
  ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle,
  AlertTriangle, Loader, X, Search,
} from 'lucide-react';

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  jobTitle: string;
  employeeId: string;
  birthMonth: number;
  birthDay: number;
  hireDate: string;
  phoneLast4: string;
  location: string;
}

const TEMPLATE_HEADERS = [
  'First Name', 'Last Name', 'Email', 'Department', 'Job Title',
  'Employee ID', 'Birth Month', 'Birth Day', 'Hire Date', 'Phone Last 4', 'Location',
];

const EXAMPLE_ROW = [
  'Jane', 'Smith', 'jane@rowecasaorganics.com', 'Production', 'Production Specialist',
  'EMP-001', '4', '15', '2023-06-01', '1234', 'Texarkana',
];

function downloadTemplate() {
  const lines = [
    TEMPLATE_HEADERS.join(','),
    EXAMPLE_ROW.join(','),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employee_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    if (fields.length < 2) continue;

    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = header.indexOf(k);
        if (idx >= 0 && fields[idx]?.trim()) return fields[idx].trim();
      }
      return '';
    };

    // Try dedicated first/last columns first
    let firstName = get(['first name', 'firstname', 'first', 'first_name']);
    let lastName = get(['last name', 'lastname', 'last', 'last_name']);

    // If no separate first/last, try a combined "Name" column and split it
    if (!firstName && !lastName) {
      const fullName = get(['name', 'full name', 'fullname', 'employee name', 'employee']);
      if (fullName) {
        const parts = fullName.split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
    }

    // Parse birthday — handle "month/day", "month-day", or separate columns
    let birthMonth = parseInt(get(['birth month', 'birthmonth', 'bday month', 'birthday month'])) || 0;
    let birthDay = parseInt(get(['birth day', 'birthday day', 'bday day', 'birthday_day'])) || 0;

    // Try combined birthday field like "4/15" or "04-15" or "April 15"
    if (!birthMonth || !birthDay) {
      const bdayStr = get(['birthday', 'bday', 'birth date', 'birthdate', 'date of birth', 'dob']);
      if (bdayStr) {
        const slashMatch = bdayStr.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
        if (slashMatch) {
          birthMonth = parseInt(slashMatch[1]) || 0;
          birthDay = parseInt(slashMatch[2]) || 0;
        } else {
          // Try parsing as a date
          const d = new Date(bdayStr);
          if (!isNaN(d.getTime())) {
            birthMonth = d.getMonth() + 1;
            birthDay = d.getDate();
          }
        }
      }
    }

    // Clamp to valid ranges
    if (birthMonth < 1 || birthMonth > 12) birthMonth = 0;
    if (birthDay < 1 || birthDay > 31) birthDay = 0;

    rows.push({
      firstName,
      lastName,
      email: get(['email', 'e-mail', 'email address', 'work email', 'email_address']),
      department: get(['department', 'dept', 'division', 'team', 'group']),
      jobTitle: get(['job title', 'jobtitle', 'title', 'position', 'role', 'job_title']),
      employeeId: get(['employee id', 'employeeid', 'emp id', 'id', 'personid', 'employee_id', 'emp_id', 'ee id', 'number']),
      birthMonth,
      birthDay,
      hireDate: get(['hire date', 'hiredate', 'start date', 'startdate', 'hire_date', 'start_date', 'date hired', 'date of hire']),
      phoneLast4: get(['phone last 4', 'phonelast4', 'phone', 'last 4', 'phone_last_4', 'mobile', 'cell']),
      location: get(['location', 'office', 'site', 'work location', 'branch']),
    });
  }

  return rows.filter((r) => r.firstName || r.lastName);
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
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

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

export function CsvImport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'idle' | 'preview' | 'running' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const filtered = useMemo(() => {
    if (!search) return rows.slice(0, 50);
    return rows.filter((r) =>
      `${r.firstName} ${r.lastName} ${r.department} ${r.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ).slice(0, 50);
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    withEmail: rows.filter((r) => r.email).length,
    withBirthday: rows.filter((r) => r.birthMonth && r.birthDay).length,
    withHireDate: rows.filter((r) => r.hireDate).length,
  }), [rows]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(reader.result as string);
      setRows(parsed);
      setStatus('preview');
    };
    reader.readAsText(file);
  };

  const runImport = async () => {
    setStatus('running');
    setLog([]);
    setProgress(0);

    try {
      let imported = 0;
      let skipped = 0;
      let duplicates = 0;
      const total = rows.length;
      const BATCH = 5;

      // Build a set of existing employees for duplicate detection
      addLog('Checking for existing employees...');
      const existingSnap = await getDocs(collection(db, 'employees'));
      const existingKeys = new Set<string>();
      existingSnap.docs.forEach((d) => {
        const data = d.data();
        // Key by lowercase "first last" and also by email if available
        const nameKey = `${(data.firstName || '').trim()} ${(data.lastName || '').trim()}`.toLowerCase().trim();
        if (nameKey) existingKeys.add(nameKey);
        if (data.email) existingKeys.add(data.email.toLowerCase().trim());
      });
      addLog(`Found ${existingSnap.size} existing employees. Starting import...\n`);

      // Track what we add in this session too (in case CSV has internal duplicates)
      const sessionKeys = new Set<string>();

      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);

        await Promise.all(batch.map(async (row) => {
          try {
            const firstName = (row.firstName || '').trim();
            const lastName = (row.lastName || '').trim();
            const displayName = `${firstName} ${lastName}`.trim();

            // Skip completely empty rows
            if (!displayName) { skipped++; return; }

            // Duplicate check: by name and by email
            const nameKey = displayName.toLowerCase();
            const emailKey = (row.email || '').toLowerCase().trim();

            if (existingKeys.has(nameKey) || sessionKeys.has(nameKey)) {
              duplicates++;
              return;
            }
            if (emailKey && (existingKeys.has(emailKey) || sessionKeys.has(emailKey))) {
              duplicates++;
              return;
            }

            // Mark as seen for this session
            sessionKeys.add(nameKey);
            if (emailKey) sessionKeys.add(emailKey);

            const hireDate = parseDate(row.hireDate);
            const phone = (row.phoneLast4 || '').replace(/\D/g, '').slice(-4);

            const data: any = {
              firstName,
              lastName,
              displayName,
              email: (row.email || '').trim(),
              department: (row.department || '').trim(),
              jobTitle: (row.jobTitle || '').trim(),
              employeeId: (row.employeeId || '').trim(),
              phoneLast4: phone,
              photoUrl: null,
              photoStatus: 'none',
              birthMonth: row.birthMonth || 0,
              birthDay: row.birthDay || 0,
              hireDate: hireDate ? Timestamp.fromDate(hireDate) : null,
              location: (row.location || '').trim(),
              isActive: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: user?.uid || '',
            };

            const docRef = await addDoc(collection(db, 'employees'), data);

            // Auto-create birthday/anniversary campaigns (safe — won't throw)
            await syncEmployeeCampaigns(
              { id: docRef.id, ...data },
              user?.uid || ''
            );

            imported++;
          } catch (err: any) {
            skipped++;
            addLog(`⚠ Skipped "${row.firstName} ${row.lastName}": ${err.message}`);
          }
        }));

        setProgress(Math.round(((imported + skipped) / total) * 100));

        if ((imported + skipped) % 25 === 0 || (imported + skipped) === total) {
          addLog(`Progress: ${imported} imported, ${skipped} skipped / ${total} total`);
        }
      }

      addLog(`\n✓ Done! Imported ${imported} new employees.`);
      if (duplicates > 0) addLog(`Skipped ${duplicates} duplicates (already in the system).`);
      if (skipped > 0) addLog(`Skipped ${skipped} empty/invalid rows.`);
      if (stats.withBirthday > 0) addLog(`Auto-created birthday campaigns for employees with birthday data.`);
      if (stats.withHireDate > 0) addLog(`Auto-created anniversary campaigns for employees with hire dates.`);
      setStatus('done');
    } catch (err: any) {
      addLog(`\n✗ Error: ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate('/employees')}
        className="flex items-center gap-1.5 text-sm text-brand-warm-brown hover:text-brand-deep-brown mb-4"
      >
        <ArrowLeft size={16} />
        Back to Employee Roster
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Import Employees from CSV</h2>
        <p className="text-sm text-brand-taupe mt-0.5">
          Upload a CSV file to bulk-import employees. Birthday and anniversary campaigns are created automatically.
        </p>
      </div>

      {/* Step 1: Template download */}
      <div className="bg-white rounded-xl border border-brand-border p-5 mb-4">
        <h3 className="text-sm font-semibold text-brand-deep-brown mb-2">Step 1: Download Template</h3>
        <p className="text-xs text-brand-taupe mb-3">
          Start with this template, or use any CSV with matching column headers. Headers are flexible —
          "First Name", "FirstName", or "First" all work.
        </p>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-border text-sm text-brand-text-brown hover:bg-brand-off-white transition-colors"
        >
          <Download size={15} />
          Download Template (.csv)
        </button>
        <div className="mt-3 overflow-x-auto">
          <table className="text-[11px] text-brand-taupe">
            <thead>
              <tr>
                {TEMPLATE_HEADERS.map((h) => (
                  <th key={h} className="px-2 py-1 font-medium text-left border-b border-brand-border whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {EXAMPLE_ROW.map((v, i) => (
                  <td key={i} className="px-2 py-1 whitespace-nowrap">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 2: Upload */}
      <div className="bg-white rounded-xl border border-brand-border p-5 mb-4">
        <h3 className="text-sm font-semibold text-brand-deep-brown mb-2">Step 2: Upload CSV</h3>
        {status === 'idle' ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-brand-border rounded-lg p-8 text-center cursor-pointer hover:border-brand-taupe transition-colors"
          >
            <FileSpreadsheet size={32} className="text-brand-light-gray mx-auto mb-2" />
            <p className="text-sm text-brand-taupe">Click to select a CSV file</p>
            <p className="text-xs text-brand-light-gray mt-1">Or drag and drop</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className="text-brand-warm-brown" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-deep-brown">{fileName}</p>
              <p className="text-xs text-brand-taupe">{rows.length} employees parsed</p>
            </div>
            {status === 'preview' && (
              <button
                onClick={() => { setRows([]); setFileName(''); setStatus('idle'); }}
                className="p-1.5 rounded hover:bg-brand-off-white text-brand-taupe"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
      </div>

      {/* Step 3: Preview & Import */}
      {(status === 'preview' || status === 'running' || status === 'done' || status === 'error') && rows.length > 0 && (
        <div className="bg-white rounded-xl border border-brand-border mb-4 overflow-hidden">
          <div className="px-4 py-3 border-b border-brand-border bg-brand-off-white flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-deep-brown">Step 3: Review & Import</h3>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-taupe" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-brand-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 w-48"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-brand-border">
            <div className="text-center">
              <p className="text-lg font-bold text-brand-deep-brown">{stats.total}</p>
              <p className="text-[10px] text-brand-taupe">Employees</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-brand-deep-brown">{stats.withEmail}</p>
              <p className="text-[10px] text-brand-taupe">With Email</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-brand-gold">{stats.withBirthday}</p>
              <p className="text-[10px] text-brand-taupe">Birthdays</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-brand-bronze">{stats.withHireDate}</p>
              <p className="text-[10px] text-brand-taupe">Hire Dates</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-brand-border">
                  <th className="text-left px-3 py-2 font-medium text-brand-taupe">Name</th>
                  <th className="text-left px-3 py-2 font-medium text-brand-taupe">Email</th>
                  <th className="text-left px-3 py-2 font-medium text-brand-taupe">Department</th>
                  <th className="text-left px-3 py-2 font-medium text-brand-taupe">Birthday</th>
                  <th className="text-left px-3 py-2 font-medium text-brand-taupe">Hire Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className="border-b border-brand-border last:border-0">
                    <td className="px-3 py-1.5 font-medium text-brand-deep-brown whitespace-nowrap">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-3 py-1.5 text-brand-taupe">{row.email || '—'}</td>
                    <td className="px-3 py-1.5 text-brand-taupe">{row.department || '—'}</td>
                    <td className="px-3 py-1.5 text-brand-taupe">
                      {row.birthMonth && row.birthDay ? `${row.birthMonth}/${row.birthDay}` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-brand-taupe">{row.hireDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && !search && (
              <p className="text-[10px] text-brand-taupe text-center py-2">
                Showing first 50 of {rows.length} — search to find specific employees
              </p>
            )}
          </div>

          {/* Import button */}
          <div className="px-4 py-3 border-t border-brand-border">
            {status === 'preview' && (
              <button
                onClick={runImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors"
              >
                <Upload size={16} />
                Import {rows.length} Employees
              </button>
            )}
            {status === 'running' && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-brand-warm-brown">
                  <Loader size={16} className="animate-spin" />
                  Importing... {progress}%
                </div>
                <div className="w-full bg-brand-border rounded-full h-2">
                  <div className="bg-brand-gold rounded-full h-2 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {status === 'done' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle size={16} /> Import complete!
                </div>
                <button
                  onClick={() => navigate('/employees')}
                  className="text-sm text-brand-warm-brown hover:underline"
                >
                  View Employee Roster →
                </button>
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle size={16} /> Import failed — see log below.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <pre className="bg-brand-off-white border border-brand-border rounded-xl p-4 text-xs text-brand-text-brown max-h-48 overflow-y-auto whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      )}
    </div>
  );
}
