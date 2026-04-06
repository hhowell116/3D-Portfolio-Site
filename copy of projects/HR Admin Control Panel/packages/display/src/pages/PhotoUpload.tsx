import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const MAX_SIZE = 800;
const QUALITY = 0.85;

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_SIZE) { height = Math.round((height * MAX_SIZE) / width); width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width = Math.round((width * MAX_SIZE) / height); height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

interface EmployeeResult {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  photoUrl: string | null;
}

type Step = 'lookup' | 'upload' | 'success';

export function PhotoUpload() {
  const [step, setStep] = useState<Step>('lookup');
  const [searchName, setSearchName] = useState('');
  const [results, setResults] = useState<EmployeeResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<EmployeeResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Load all active employees once for client-side search
  const [allEmployees, setAllEmployees] = useState<EmployeeResult[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'employees'), where('isActive', '==', true));
    getDocs(q).then((snap) => {
      setAllEmployees(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            department: data.department || '',
            photoUrl: data.photoUrl || null,
          };
        })
      );
    });
  }, []);

  const handleSearch = () => {
    const term = searchName.trim().toLowerCase();
    if (!term) return;
    const matches = allEmployees.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(term) ||
        e.lastName.toLowerCase().includes(term)
    );
    setResults(matches);
    setSearched(true);
  };

  const handleSelect = (emp: EmployeeResult) => {
    setSelected(emp);
    setStep('upload');
    setPreview(null);
    setError('');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }
    setError('');
    try {
      const dataUrl = await compressPhoto(file);
      setPreview(dataUrl);
    } catch {
      setError('Failed to process image. Please try another file.');
    }
  };

  const handleSubmit = async () => {
    if (!selected || !preview) return;
    setSubmitting(true);
    setError('');
    try {
      await addDoc(collection(db, 'photoSubmissions'), {
        employeeId: selected.id,
        employeeName: `${selected.firstName} ${selected.lastName}`,
        photoData: preview,
        status: 'pending',
        submittedAt: Timestamp.now(),
        reviewedAt: null,
        reviewedBy: null,
      });
      setStep('success');
    } catch (err: any) {
      setError('Failed to submit photo. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #f9f6f2 0%, #ebe5dc 50%, #d7d1ca 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 16px',
      fontFamily: "'Lato', 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/logo.png" alt="RCO" style={{ width: 120, marginBottom: 12, opacity: 0.85 }} />
        <h1 style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 24, fontWeight: 700, color: '#473C31', margin: 0,
        }}>
          Employee Photo Upload
        </h1>
        <p style={{ color: '#5f4b3c', fontSize: 14, marginTop: 4 }}>
          Submit a photo for your employee profile
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: 24,
        width: '100%', maxWidth: 420,
        boxShadow: '0 4px 24px rgba(95,75,60,0.1)',
      }}>

        {/* STEP: Lookup */}
        {step === 'lookup' && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#473C31', marginTop: 0, marginBottom: 16 }}>
              Find Your Name
            </h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search by name..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{
                  flex: 1, padding: '10px 14px', fontSize: 14,
                  border: '1px solid #E8E4DF', borderRadius: 10,
                  outline: 'none', background: '#f9f8f6',
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  padding: '10px 20px', fontSize: 14, fontWeight: 600,
                  background: '#5f4b3c', color: '#fff', border: 'none',
                  borderRadius: 10, cursor: 'pointer',
                }}
              >
                Search
              </button>
            </div>

            {searched && results.length === 0 && (
              <p style={{ color: '#bd9979', fontSize: 13, textAlign: 'center' }}>
                No employees found. Try a different name.
              </p>
            )}

            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', background: '#f9f8f6',
                      border: '1px solid #E8E4DF', borderRadius: 10,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: '#d7d1ca', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 600, color: '#5f4b3c',
                      }}>
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                    )}
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#473C31' }}>
                        {emp.firstName} {emp.lastName}
                      </p>
                      {emp.department && (
                        <p style={{ margin: 0, fontSize: 12, color: '#bd9979' }}>{emp.department}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* STEP: Upload */}
        {step === 'upload' && selected && (
          <>
            <button
              onClick={() => { setStep('lookup'); setSelected(null); setPreview(null); }}
              style={{
                background: 'none', border: 'none', color: '#bd9979',
                fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 12,
              }}
            >
              &larr; Back to search
            </button>

            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#473C31', marginTop: 0, marginBottom: 4 }}>
              Upload Photo for {selected.firstName} {selected.lastName}
            </h2>
            <p style={{ color: '#5f4b3c', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
              Choose a clear, well-lit photo of yourself. It will be reviewed by HR before appearing on displays.
            </p>

            {preview ? (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    width: 160, height: 160, borderRadius: '50%',
                    objectFit: 'cover', border: '3px solid #E8E4DF',
                  }}
                />
                <p style={{ fontSize: 12, color: '#bd9979', marginTop: 8 }}>Photo preview</p>
                <button
                  onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  style={{
                    background: 'none', border: '1px solid #E8E4DF',
                    padding: '6px 16px', borderRadius: 8, fontSize: 13,
                    cursor: 'pointer', color: '#5f4b3c', marginTop: 4,
                  }}
                >
                  Choose Different Photo
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed #d7d1ca', borderRadius: 12,
                  padding: '32px 16px', textAlign: 'center',
                  cursor: 'pointer', marginBottom: 16,
                  background: '#f9f8f6',
                }}
              >
                <p style={{ margin: 0, fontSize: 14, color: '#5f4b3c', fontWeight: 600 }}>
                  Tap to choose a photo
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#bd9979' }}>
                  JPG, PNG, or HEIC up to 10MB
                </p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ display: 'none' }}
            />

            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            {preview && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                  background: submitting ? '#bd9979' : '#5f4b3c', color: '#fff',
                  border: 'none', borderRadius: 10, cursor: submitting ? 'default' : 'pointer',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit Photo for Review'}
              </button>
            )}
          </>
        )}

        {/* STEP: Success */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>&#10003;</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#473C31', marginTop: 0 }}>
              Photo Submitted!
            </h2>
            <p style={{ color: '#5f4b3c', fontSize: 14, marginBottom: 20 }}>
              Your photo has been submitted for review. HR will approve it and it will appear on the facility displays.
            </p>
            <button
              onClick={() => { setStep('lookup'); setSelected(null); setPreview(null); setSearchName(''); setResults([]); setSearched(false); }}
              style={{
                padding: '10px 24px', fontSize: 14, fontWeight: 600,
                background: '#5f4b3c', color: '#fff', border: 'none',
                borderRadius: 10, cursor: 'pointer',
              }}
            >
              Submit Another Photo
            </button>
          </div>
        )}
      </div>

      <p style={{ color: '#bd9979', fontSize: 11, marginTop: 24, textAlign: 'center' }}>
        Rowe Casa Organics &mdash; Employee Photo Submission
      </p>
    </div>
  );
}
