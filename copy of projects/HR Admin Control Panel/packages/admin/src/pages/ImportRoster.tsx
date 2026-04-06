import { useState, useMemo } from 'react';
import {
  collection, addDoc, serverTimestamp, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import orgChartData from '../data/org-chart-seed.json';
import { ArrowLeft, Upload, CheckCircle, AlertTriangle, Loader, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrgEntry {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  department: string;
  jobTitle: string;
  employeeId: string;
  location: string;
  supervisorId: string;
  photoUrl: string | null;
  initials: string;
}

export function ImportRoster() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [search, setSearch] = useState('');

  const entries = orgChartData as OrgEntry[];
  const departments = useMemo(() => {
    const deps = new Set(entries.map((e) => e.department).filter(Boolean));
    return Array.from(deps).sort();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return entries.slice(0, 30);
    return entries.filter((e) =>
      `${e.displayName} ${e.department} ${e.jobTitle} ${e.email}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ).slice(0, 50);
  }, [search]);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const runImport = async () => {
    setStatus('running');
    setLog([]);
    setProgress(0);

    try {
      // Check for existing employees
      const existingSnap = await getDocs(
        query(collection(db, 'employees'), where('isActive', '==', true))
      );
      if (existingSnap.size > 0) {
        addLog(`Found ${existingSnap.size} existing employees — importing will add to them.`);
        addLog(`Duplicates are possible if you import twice.\n`);
      }

      const total = entries.length;
      let imported = 0;
      const BATCH_SIZE = 5; // Write 5 at a time to avoid overload

      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (emp) => {
          await addDoc(collection(db, 'employees'), {
            firstName: emp.firstName,
            lastName: emp.lastName,
            displayName: emp.displayName,
            email: emp.email,
            department: emp.department,
            employeeId: emp.employeeId,
            phoneLast4: '',
            photoUrl: emp.photoUrl,
            photoStatus: emp.photoUrl ? 'approved' : 'none',
            birthMonth: 0,
            birthDay: 0,
            hireDate: null,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || '',
            // Extra fields from org chart
            jobTitle: emp.jobTitle,
            location: emp.location,
            supervisorId: emp.supervisorId,
          });
        }));

        imported += batch.length;
        setProgress(Math.round((imported / total) * 100));

        if (imported % 50 === 0 || imported === total) {
          addLog(`Imported ${imported} / ${total} employees...`);
        }
      }

      addLog(`\n✓ Done! Imported ${imported} employees with ${entries.filter(e => e.photoUrl).length} photos.`);
      addLog(`Departments: ${departments.length} (${departments.join(', ')})`);
      setStatus('done');
    } catch (err: any) {
      addLog(`\n✗ Error: ${err.message}`);
      setStatus('error');
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate('/it-overview')}
        className="flex items-center gap-1.5 text-sm text-brand-warm-brown hover:text-brand-deep-brown mb-4"
      >
        <ArrowLeft size={16} />
        Back to IT Overview
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Import Employee Roster</h2>
        <p className="text-sm text-brand-taupe mt-0.5">
          Import {entries.length} employees from the BambooHR org chart with {entries.filter(e => e.photoUrl).length} photos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-brand-border p-4 text-center">
          <p className="text-2xl font-bold text-brand-deep-brown">{entries.length}</p>
          <p className="text-xs text-brand-taupe">Employees</p>
        </div>
        <div className="bg-white rounded-xl border border-brand-border p-4 text-center">
          <p className="text-2xl font-bold text-brand-deep-brown">{departments.length}</p>
          <p className="text-xs text-brand-taupe">Departments</p>
        </div>
        <div className="bg-white rounded-xl border border-brand-border p-4 text-center">
          <p className="text-2xl font-bold text-brand-deep-brown">{entries.filter(e => e.photoUrl).length}</p>
          <p className="text-xs text-brand-taupe">With Photos</p>
        </div>
        <div className="bg-white rounded-xl border border-brand-border p-4 text-center">
          <p className="text-2xl font-bold text-brand-deep-brown">{entries.filter(e => e.email).length}</p>
          <p className="text-xs text-brand-taupe">With Email</p>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-brand-border mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-border bg-brand-off-white flex items-center justify-between">
          <h3 className="text-sm font-semibold text-brand-deep-brown">Preview</h3>
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
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-brand-border">
                <th className="text-left px-3 py-2 font-medium text-brand-taupe">Photo</th>
                <th className="text-left px-3 py-2 font-medium text-brand-taupe">Name</th>
                <th className="text-left px-3 py-2 font-medium text-brand-taupe">Title</th>
                <th className="text-left px-3 py-2 font-medium text-brand-taupe">Department</th>
                <th className="text-left px-3 py-2 font-medium text-brand-taupe">Location</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr key={i} className="border-b border-brand-border last:border-0">
                  <td className="px-3 py-1.5">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-brand-light-gray flex items-center justify-center text-[10px] font-medium text-brand-warm-brown">
                        {emp.initials}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-1.5 font-medium text-brand-deep-brown">{emp.displayName}</td>
                  <td className="px-3 py-1.5 text-brand-text-brown text-xs">{emp.jobTitle}</td>
                  <td className="px-3 py-1.5 text-brand-taupe text-xs">{emp.department}</td>
                  <td className="px-3 py-1.5 text-brand-taupe text-xs">{emp.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!search && (
            <p className="text-xs text-brand-taupe text-center py-2">
              Showing first 30 of {entries.length} — search to find specific employees
            </p>
          )}
        </div>
      </div>

      {/* Action */}
      {status === 'idle' && (
        <button
          onClick={runImport}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-warm-brown text-white font-medium hover:bg-brand-deep-brown transition-colors"
        >
          <Upload size={18} />
          Import All {entries.length} Employees to Firestore
        </button>
      )}

      {status === 'running' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm text-brand-warm-brown">
            <Loader size={18} className="animate-spin" />
            Importing... {progress}%
          </div>
          <div className="w-full bg-brand-border rounded-full h-2">
            <div
              className="bg-brand-gold rounded-full h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'done' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle size={18} />
            Import complete!
          </div>
          <button
            onClick={() => navigate('/employees')}
            className="text-sm text-brand-warm-brown hover:text-brand-deep-brown underline"
          >
            View Employee Roster →
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle size={18} />
          Import failed — see log below.
        </div>
      )}

      {/* Log */}
      {log.length > 0 && (
        <pre className="mt-4 bg-brand-off-white border border-brand-border rounded-xl p-4 text-xs text-brand-text-brown max-h-48 overflow-y-auto whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      )}
    </div>
  );
}
