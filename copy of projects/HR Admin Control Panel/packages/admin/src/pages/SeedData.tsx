import { useState } from 'react';
import {
  collection, addDoc, doc, setDoc, serverTimestamp, getDocs, query, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import seedData from '../data/rockstar-seed.json';
import { ArrowLeft, Upload, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SeedEntry {
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  initials: string;
  tenure: string;
  month: string;
  quote: string;
  photoUrl: string | null;
}

export function SeedData() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const runSeed = async () => {
    setStatus('running');
    setLog([]);
    setProgress(0);

    try {
      const entries = seedData as SeedEntry[];
      const total = entries.length;

      // Check if data already exists
      const existingSnap = await getDocs(
        query(collection(db, 'employees'), where('isActive', '==', true))
      );
      if (existingSnap.size > 0) {
        addLog(`⚠ Found ${existingSnap.size} existing employees — seeding will add to them, not replace.`);
      }

      // Group by month for campaigns
      const monthGroups: Record<string, SeedEntry[]> = {};
      for (const entry of entries) {
        if (!monthGroups[entry.month]) monthGroups[entry.month] = [];
        monthGroups[entry.month].push(entry);
      }

      let processed = 0;

      for (const [month, employees] of Object.entries(monthGroups)) {
        // Create campaign
        addLog(`Creating campaign: ${month} 2025 Rockstars...`);
        const campaignRef = await addDoc(collection(db, 'campaigns'), {
          type: 'rockstar',
          title: `${month} 2025 Rockstars`,
          month,
          year: 2025,
          isActive: true,
          displayOrder: processed,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || '',
        });

        for (const emp of employees) {
          // Create employee
          addLog(`  Adding employee: ${emp.displayName}`);
          const empRef = await addDoc(collection(db, 'employees'), {
            firstName: emp.firstName,
            lastName: emp.lastName,
            displayName: emp.displayName,
            email: '',
            department: emp.department,
            employeeId: '',
            phoneLast4: '',
            photoUrl: emp.photoUrl,
            photoStatus: 'none',
            birthMonth: 0,
            birthDay: 0,
            hireDate: null,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || '',
          });

          // Create campaign entry
          const entryRef = await addDoc(
            collection(db, 'campaigns', campaignRef.id, 'entries'),
            {
              employeeRef: empRef.id,
              employeeName: emp.displayName,
              employeeTitle: emp.department,
              employeeTenure: emp.tenure,
              employeeInitials: emp.initials,
              photoUrl: emp.photoUrl,
              quote: emp.quote,
              badgeText: `${month} Rockstar`,
              isVisible: true,
              displayOrder: processed,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
          );

          // Sync to displayContent
          const displayDocId = `${campaignRef.id}_${entryRef.id}`;
          await setDoc(doc(db, 'displayContent', displayDocId), {
            type: 'rockstar',
            campaignId: campaignRef.id,
            entryId: entryRef.id,
            employeeName: emp.displayName,
            employeeTitle: emp.department,
            employeeTenure: emp.tenure,
            employeeInitials: emp.initials,
            photoUrl: emp.photoUrl,
            quote: emp.quote,
            badgeText: `${month} Rockstar`,
            displayOrder: processed,
            isActive: true,
            updatedAt: serverTimestamp(),
          });

          processed++;
          setProgress(Math.round((processed / total) * 100));
        }
      }

      addLog(`\n✓ Done! Seeded ${processed} employees across ${Object.keys(monthGroups).length} campaigns.`);
      addLog(`Display content is live — check the Rockstars display.`);
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
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Seed Rockstar Data</h2>
        <p className="text-sm text-brand-taupe mt-0.5">
          Import the {(seedData as SeedEntry[]).length} existing rockstar employees with photos into Firestore
        </p>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-brand-border mb-6 overflow-hidden">
        <div className="px-4 py-3 border-b border-brand-border bg-brand-off-white">
          <h3 className="text-sm font-semibold text-brand-deep-brown">Data Preview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border">
                <th className="text-left px-4 py-2 font-medium text-brand-taupe">Photo</th>
                <th className="text-left px-4 py-2 font-medium text-brand-taupe">Name</th>
                <th className="text-left px-4 py-2 font-medium text-brand-taupe">Title</th>
                <th className="text-left px-4 py-2 font-medium text-brand-taupe">Month</th>
              </tr>
            </thead>
            <tbody>
              {(seedData as SeedEntry[]).map((emp, i) => (
                <tr key={i} className="border-b border-brand-border last:border-0">
                  <td className="px-4 py-2">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-light-gray" />
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium text-brand-deep-brown">{emp.displayName}</td>
                  <td className="px-4 py-2 text-brand-text-brown">{emp.department}</td>
                  <td className="px-4 py-2 text-brand-taupe">{emp.month}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action */}
      {status === 'idle' && (
        <button
          onClick={runSeed}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-warm-brown text-white font-medium hover:bg-brand-deep-brown transition-colors"
        >
          <Upload size={18} />
          Import All Rockstars to Firestore
        </button>
      )}

      {status === 'running' && (
        <div className="flex items-center gap-3 text-sm text-brand-warm-brown">
          <Loader size={18} className="animate-spin" />
          Importing... {progress}%
        </div>
      )}

      {status === 'done' && (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle size={18} />
          Import complete!
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
        <pre className="mt-4 bg-brand-off-white border border-brand-border rounded-xl p-4 text-xs text-brand-text-brown max-h-64 overflow-y-auto whitespace-pre-wrap">
          {log.join('\n')}
        </pre>
      )}
    </div>
  );
}
