import { useState, useRef } from 'react';
import { Timestamp } from 'firebase/firestore';
import { useEmployees } from '../hooks/useEmployees';
import { Modal } from '../components/Modal';
import { Upload, X } from 'lucide-react';
import type { Employee } from '@rco/shared';
import { MONTHS } from '@rco/shared';

interface EmployeeFormProps {
  employee: Employee | null;
  onClose: () => void;
}

export function EmployeeForm({ employee, onClose }: EmployeeFormProps) {
  const { addEmployee, updateEmployee } = useEmployees();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(employee?.photoUrl || null);

  const [form, setForm] = useState({
    firstName: employee?.firstName || '',
    lastName: employee?.lastName || '',
    email: employee?.email || '',
    department: employee?.department || '',
    employeeId: employee?.employeeId || '',
    phoneLast4: employee?.phoneLast4 || '',
    birthMonth: employee?.birthMonth || 0,
    birthDay: employee?.birthDay || 0,
    hireDateStr: employee?.hireDate
      ? (() => {
          const d = (employee.hireDate as any).toDate
            ? (employee.hireDate as any).toDate()
            : new Date(employee.hireDate as any);
          return d.toISOString().split('T')[0];
        })()
      : '',
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return;
    setSaving(true);

    try {
      const data: Partial<Employee> = {
        firstName: form.firstName,
        lastName: form.lastName,
        displayName: `${form.firstName} ${form.lastName}`,
        email: form.email,
        department: form.department,
        employeeId: form.employeeId,
        phoneLast4: form.phoneLast4,
        birthMonth: form.birthMonth,
        birthDay: form.birthDay,
        hireDate: form.hireDateStr ? Timestamp.fromDate(new Date(form.hireDateStr)) : null,
      };

      if (employee?.id) {
        await updateEmployee(employee.id, data, photo || undefined);
      } else {
        await addEmployee(data, photo || undefined);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save employee:', err);
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm rounded-lg border border-brand-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold';
  const labelClass = 'block text-sm font-medium text-brand-text-brown mb-1';

  return (
    <Modal
      open
      title={employee ? 'Edit Employee' : 'Add Employee'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo */}
        <div className="flex items-center gap-4">
          {photoPreview ? (
            <div className="relative">
              <img src={photoPreview} alt="" className="w-16 h-16 rounded-full object-cover" />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-full bg-brand-off-white border-2 border-dashed border-brand-border flex items-center justify-center cursor-pointer hover:border-brand-taupe transition-colors"
            >
              <Upload size={18} className="text-brand-taupe" />
            </div>
          )}
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm text-brand-warm-brown hover:text-brand-deep-brown font-medium"
            >
              {photoPreview ? 'Change photo' : 'Upload photo'}
            </button>
            <p className="text-xs text-brand-taupe">JPG, PNG, HEIC up to 10MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>First Name *</label>
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Last Name *</label>
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Email & Department */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Employee ID & Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Employee ID</label>
            <input
              type="text"
              value={form.employeeId}
              onChange={(e) => set('employeeId', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone (last 4)</label>
            <input
              type="text"
              maxLength={4}
              value={form.phoneLast4}
              onChange={(e) => set('phoneLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={inputClass}
              placeholder="1234"
            />
          </div>
        </div>

        {/* Birthday */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Birth Month</label>
            <select
              value={form.birthMonth}
              onChange={(e) => set('birthMonth', parseInt(e.target.value))}
              className={inputClass}
            >
              <option value={0}>Select month...</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Birth Day</label>
            <input
              type="number"
              min={1}
              max={31}
              value={form.birthDay || ''}
              onChange={(e) => set('birthDay', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Hire Date */}
        <div>
          <label className={labelClass}>Hire Date</label>
          <input
            type="date"
            value={form.hireDateStr}
            onChange={(e) => set('hireDateStr', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm rounded-lg border border-brand-border text-brand-text-brown hover:bg-brand-off-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !form.firstName || !form.lastName}
            className="px-4 py-2.5 text-sm rounded-lg bg-brand-warm-brown text-white font-medium hover:bg-brand-deep-brown transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
