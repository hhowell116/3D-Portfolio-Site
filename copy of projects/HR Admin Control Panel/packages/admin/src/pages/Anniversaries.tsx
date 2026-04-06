import { useMemo, useState } from 'react';
import { useEmployees } from '../hooks/useEmployees';
import { MONTHS } from '@rco/shared';
import { Award, ChevronLeft, ChevronRight } from 'lucide-react';

function getYearsOfService(hireDate: any): number {
  if (!hireDate) return 0;
  const hire = hireDate.toDate ? hireDate.toDate() : new Date(hireDate);
  const now = new Date();
  let years = now.getFullYear() - hire.getFullYear();
  if (
    now.getMonth() < hire.getMonth() ||
    (now.getMonth() === hire.getMonth() && now.getDate() < hire.getDate())
  ) {
    years--;
  }
  return Math.max(0, years);
}

export function Anniversaries() {
  const { employees, loading } = useEmployees();
  const [monthOffset, setMonthOffset] = useState(0);

  const viewMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return { month: d.getMonth() + 1, year: d.getFullYear(), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  }, [monthOffset]);

  const anniversaries = useMemo(() => {
    return employees
      .filter((e) => {
        if (!e.isActive || !e.hireDate) return false;
        const hire = (e.hireDate as any).toDate
          ? (e.hireDate as any).toDate()
          : new Date(e.hireDate as any);
        return hire.getMonth() + 1 === viewMonth.month;
      })
      .map((e) => ({
        ...e,
        years: getYearsOfService(e.hireDate),
        hireDay: ((e.hireDate as any).toDate
          ? (e.hireDate as any).toDate()
          : new Date(e.hireDate as any)
        ).getDate(),
      }))
      .filter((e) => e.years > 0)
      .sort((a, b) => a.hireDay - b.hireDay);
  }, [employees, viewMonth.month]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">Work Anniversaries</h2>
        <p className="text-sm text-brand-taupe mt-0.5">Celebrating years of service</p>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setMonthOffset((o) => o - 1)}
          className="p-2 rounded-lg border border-brand-border hover:bg-brand-off-white transition-colors"
        >
          <ChevronLeft size={16} className="text-brand-warm-brown" />
        </button>
        <h3 className="text-lg font-semibold text-brand-deep-brown min-w-[180px] text-center">
          {viewMonth.label}
        </h3>
        <button
          onClick={() => setMonthOffset((o) => o + 1)}
          className="p-2 rounded-lg border border-brand-border hover:bg-brand-off-white transition-colors"
        >
          <ChevronRight size={16} className="text-brand-warm-brown" />
        </button>
        {monthOffset !== 0 && (
          <button
            onClick={() => setMonthOffset(0)}
            className="text-xs text-brand-warm-brown hover:underline"
          >
            Today
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-brand-taupe">Loading...</div>
      ) : anniversaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-border p-8 text-center">
          <Award size={32} className="text-brand-light-gray mx-auto mb-2" />
          <p className="text-sm text-brand-taupe">No work anniversaries in {MONTHS[viewMonth.month - 1]}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {anniversaries.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-xl border border-brand-border p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
            >
              {emp.photoUrl ? (
                <img src={emp.photoUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-cream flex items-center justify-center">
                  <Award size={20} className="text-brand-bronze" />
                </div>
              )}
              <div>
                <p className="font-medium text-brand-deep-brown">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-sm font-semibold text-brand-bronze">
                  {emp.years} {emp.years === 1 ? 'Year' : 'Years'}
                </p>
                {emp.department && (
                  <p className="text-xs text-brand-light-gray">{emp.department}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
