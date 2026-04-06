import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { QRCodeSVG } from 'qrcode.react';
import { Check, X, Trash2, QrCode, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { PhotoSubmission } from '@rco/shared';

const UPLOAD_URL = 'https://rco-hr-display.web.app/upload';

type Tab = 'pending' | 'reviewed' | 'qr';

export function PhotoSubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<PhotoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'photoSubmissions'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PhotoSubmission));
        items.sort((a, b) => {
          const at = a.submittedAt?.seconds || 0;
          const bt = b.submittedAt?.seconds || 0;
          return bt - at;
        });
        setSubmissions(items);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const pending = submissions.filter((s) => s.status === 'pending');
  const reviewed = submissions.filter((s) => s.status !== 'pending');

  const handleApprove = async (sub: PhotoSubmission) => {
    if (!sub.id) return;
    setActionId(sub.id);
    try {
      // Update employee photo
      await updateDoc(doc(db, 'employees', sub.employeeId), {
        photoUrl: sub.photoData,
        photoStatus: 'approved',
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      });
      // Mark submission as approved
      await updateDoc(doc(db, 'photoSubmissions', sub.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || '',
      });
    } catch (err) {
      console.error('Failed to approve photo:', err);
    }
    setActionId(null);
  };

  const handleReject = async (sub: PhotoSubmission) => {
    if (!sub.id) return;
    setActionId(sub.id);
    try {
      // If previously approved, remove photo from employee profile
      if (sub.status === 'approved') {
        await updateDoc(doc(db, 'employees', sub.employeeId), {
          photoUrl: null,
          photoStatus: 'rejected',
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || '',
        });
      }
      await updateDoc(doc(db, 'photoSubmissions', sub.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || '',
      });
    } catch (err) {
      console.error('Failed to reject photo:', err);
    }
    setActionId(null);
  };

  const handleDelete = async (sub: PhotoSubmission) => {
    if (!sub.id) return;
    await deleteDoc(doc(db, 'photoSubmissions', sub.id));
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Photo Submissions</h2>
          <p className="text-sm text-brand-taupe mt-0.5">
            {pending.length} pending review
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-lg border border-brand-border p-0.5 mb-5 w-fit">
        {([
          { key: 'pending' as Tab, label: 'Pending', icon: Clock, count: pending.length },
          { key: 'reviewed' as Tab, label: 'Reviewed', icon: CheckCircle, count: reviewed.length },
          { key: 'qr' as Tab, label: 'QR Code', icon: QrCode, count: null },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === t.key
                ? 'bg-brand-cream text-brand-warm-brown font-medium'
                : 'text-brand-taupe hover:text-brand-text-brown'
            }`}
          >
            <t.icon size={13} />
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                t.key === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* QR Code Tab */}
      {tab === 'qr' && (
        <div className="bg-white rounded-xl border border-brand-border p-8 max-w-md">
          <div className="text-center">
            <h3 className="text-lg font-serif font-bold text-brand-deep-brown mb-2">
              Employee Photo Upload QR Code
            </h3>
            <p className="text-sm text-brand-taupe mb-6">
              Print this QR code and display it in a common area. Employees can scan it to upload their own profile photo.
            </p>
            <div className="inline-block bg-white p-4 rounded-xl border border-brand-border">
              <QRCodeSVG
                value={UPLOAD_URL}
                size={220}
                bgColor="#ffffff"
                fgColor="#473C31"
                level="M"
              />
            </div>
            <p className="text-xs text-brand-taupe mt-4 break-all select-all font-mono bg-brand-off-white rounded-lg px-3 py-2">
              {UPLOAD_URL}
            </p>
            <button
              onClick={() => {
                const svg = document.querySelector('.qr-print-area svg');
                if (!svg) return;
                const win = window.open('', '_blank');
                if (!win) return;
                win.document.write(`
                  <html><head><title>RCO Photo Upload QR</title>
                  <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;}</style>
                  </head><body>
                  <h2>Scan to Upload Your Employee Photo</h2>
                  ${svg.outerHTML}
                  <p style="margin-top:16px;color:#666;font-size:14px;">${UPLOAD_URL}</p>
                  <script>window.print();</script>
                  </body></html>
                `);
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors"
            >
              Print QR Code
            </button>
            <div className="qr-print-area hidden">
              <QRCodeSVG value={UPLOAD_URL} size={400} bgColor="#ffffff" fgColor="#473C31" level="M" />
            </div>
          </div>
        </div>
      )}

      {/* Pending Tab */}
      {tab === 'pending' && (
        <>
          {loading ? (
            <div className="text-sm text-brand-taupe">Loading...</div>
          ) : pending.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-8 text-center text-sm text-brand-taupe">
              No pending photo submissions. Share the QR code with employees to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map((sub) => (
                <div key={sub.id} className="bg-white rounded-xl border border-brand-border overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={sub.photoData}
                        alt=""
                        className="w-16 h-16 rounded-full object-cover border-2 border-brand-border"
                      />
                      <div>
                        <p className="font-semibold text-brand-deep-brown">{sub.employeeName}</p>
                        <p className="text-xs text-brand-taupe">{formatDate(sub.submittedAt)}</p>
                      </div>
                    </div>
                    {/* Full preview */}
                    <img
                      src={sub.photoData}
                      alt="Submitted photo"
                      className="w-full rounded-lg mb-3"
                      style={{ maxHeight: 280, objectFit: 'cover' }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(sub)}
                        disabled={actionId === sub.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        <Check size={15} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(sub)}
                        disabled={actionId === sub.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <X size={15} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Reviewed Tab */}
      {tab === 'reviewed' && (
        <>
          {reviewed.length === 0 ? (
            <div className="bg-white rounded-xl border border-brand-border p-8 text-center text-sm text-brand-taupe">
              No reviewed submissions yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-off-white">
                    <th className="text-left px-4 py-3 font-medium text-brand-taupe">Employee</th>
                    <th className="text-left px-4 py-3 font-medium text-brand-taupe">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-brand-taupe hidden md:table-cell">Submitted</th>
                    <th className="text-left px-4 py-3 font-medium text-brand-taupe hidden md:table-cell">Reviewed</th>
                    <th className="text-right px-4 py-3 font-medium text-brand-taupe">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewed.map((sub) => (
                    <tr key={sub.id} className="border-b border-brand-border last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={sub.photoData} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className="font-medium text-brand-deep-brown">{sub.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          sub.status === 'approved'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {sub.status === 'approved' ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {sub.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-text-brown hidden md:table-cell">{formatDate(sub.submittedAt)}</td>
                      <td className="px-4 py-3 text-brand-text-brown hidden md:table-cell">{formatDate(sub.reviewedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {sub.status === 'rejected' && (
                            <button
                              onClick={() => handleApprove(sub)}
                              disabled={actionId === sub.id}
                              className="p-1.5 rounded hover:bg-green-50 text-brand-taupe hover:text-green-600 transition-colors disabled:opacity-50"
                              title="Approve instead"
                            >
                              <Check size={15} />
                            </button>
                          )}
                          {sub.status === 'approved' && (
                            <button
                              onClick={() => handleReject(sub)}
                              disabled={actionId === sub.id}
                              className="p-1.5 rounded hover:bg-red-50 text-brand-taupe hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Reject instead"
                            >
                              <X size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(sub)}
                            className="p-1.5 rounded hover:bg-red-50 text-brand-taupe hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
