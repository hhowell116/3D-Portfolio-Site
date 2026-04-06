import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '../hooks/useEmployees';
import { EmployeeForm } from './EmployeeForm';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useRole } from '../rbac/useRole';
import { Search, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, FileSpreadsheet, Download } from 'lucide-react';
import type { Employee } from '@rco/shared';
import { MONTHS } from '@rco/shared';

export function EmployeeRoster() {
  const { employees, loading, deleteEmployee, toggleActive } = useEmployees();
  const { canManage, isItAdmin } = useRole();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  const downloadCsv = () => {
    const active = employees.filter((e) => e.isActive);
    const headers = ['First Name', 'Last Name', 'Email', 'Department', 'Employee ID', 'Birth Month', 'Birth Day', 'Hire Date', 'Phone Last 4'];
    const rows = active.map((e) => [
      e.firstName,
      e.lastName,
      e.email,
      e.department,
      e.employeeId,
      e.birthMonth || '',
      e.birthDay || '',
      e.hireDate
        ? (e.hireDate as any).toDate
          ? (e.hireDate as any).toDate().toISOString().split('T')[0]
          : new Date(e.hireDate as any).toISOString().split('T')[0]
        : '',
      e.phoneLast4 || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rco-employees-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch =
        !search ||
        `${e.firstName} ${e.lastName} ${e.department} ${e.email} ${e.employeeId}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesFilter =
        filterActive === 'all' ||
        (filterActive === 'active' && e.isActive) ||
        (filterActive === 'inactive' && !e.isActive);
      return matchesSearch && matchesFilter;
    });
  }, [employees, search, filterActive]);

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleDelete = async () => {
    if (deleteTarget?.id) {
      await deleteEmployee(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Employee Roster</h2>
          <p className="text-sm text-brand-taupe mt-0.5">
            {employees.filter((e) => e.isActive).length} active employees
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button
              onClick={downloadCsv}
              data-tour="export-csv-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-border text-sm text-brand-text-brown hover:bg-brand-off-white transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={() => navigate('/csv-import')}
              data-tour="import-csv-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-border text-sm text-brand-text-brown hover:bg-brand-off-white transition-colors"
            >
              <FileSpreadsheet size={16} />
              Import CSV
            </button>
            <button
              onClick={() => { setEditingEmployee(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors"
            >
              <Plus size={16} />
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-taupe" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-brand-border bg-white
              focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold
              placeholder:text-brand-light-gray"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-lg border border-brand-border p-0.5">
          {(['active', 'inactive', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition-colors ${
                filterActive === f
                  ? 'bg-brand-cream text-brand-warm-brown font-medium'
                  : 'text-brand-taupe hover:text-brand-text-brown'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-brand-taupe">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-brand-taupe">
            {search ? 'No employees match your search.' : 'No employees yet. Add your first employee to get started.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-off-white">
                  <th className="text-left px-4 py-3 font-medium text-brand-taupe">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-taupe hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-taupe hidden lg:table-cell">Birthday</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-taupe hidden lg:table-cell">Hire Date</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-taupe">Status</th>
                  {canManage && (
                    <th className="text-right px-4 py-3 font-medium text-brand-taupe">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className="border-b border-brand-border last:border-0 hover:bg-brand-off-white/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp.photoUrl ? (
                          <img
                            src={emp.photoUrl}
                            alt={emp.displayName}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-light-gray flex items-center justify-center text-xs font-medium text-brand-warm-brown">
                            {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-brand-deep-brown">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-brand-taupe">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-text-brown hidden md:table-cell">{emp.department}</td>
                    <td className="px-4 py-3 text-brand-text-brown hidden lg:table-cell">
                      {emp.birthMonth ? `${MONTHS[emp.birthMonth - 1]} ${emp.birthDay}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-brand-text-brown hidden lg:table-cell">
                      {emp.hireDate
                        ? (emp.hireDate as any).toDate
                          ? (emp.hireDate as any).toDate().toLocaleDateString()
                          : new Date(emp.hireDate as any).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          emp.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => emp.id && toggleActive(emp.id, !emp.isActive)}
                            className="p-1.5 rounded hover:bg-brand-cream text-brand-taupe hover:text-brand-warm-brown transition-colors"
                            title={emp.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {emp.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                          </button>
                          {isItAdmin && (
                            <button
                              onClick={() => setDeleteTarget(emp)}
                              className="p-1.5 rounded hover:bg-red-50 text-brand-taupe hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeForm employee={editingEmployee} onClose={handleFormClose} />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Employee"
        message={`Are you sure you want to permanently delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
