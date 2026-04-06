import { useState, useEffect, useMemo } from 'react';
import {
  collection, query, where, getDocs, addDoc, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { MONTHS } from '@rco/shared';
import type { Employee } from '@rco/shared';
import { ArrowLeft, Cake, Award, Loader, CheckCircle, Sparkles } from 'lucide-react';

export function QuickCampaign() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthName = MONTHS[now.getMonth()];

  useEffect(() => {
    async function load() {
      const snap = await getDocs(
        query(collection(db, 'employees'), where('isActive', '==', true))
      );
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee)));
      setLoading(false);
    }
    load();
  }, []);

  const birthdays = useMemo(
    () => employees
      .filter((e) => e.birthMonth === currentMonth)
      .sort((a, b) => (a.birthDay || 0) - (b.birthDay || 0)),
    [employees, currentMonth]
  );

  const anniversaries = useMemo(() => {
    return employees
      .filter((e) => {
        if (!e.hireDate) return false;
        const hire = (e.hireDate as any).toDate
          ? (e.hireDate as any).toDate()
          : new Date(e.hireDate as any);
        return hire.getMonth() + 1 === currentMonth;
      })
      .map((e) => {
        const hire = (e.hireDate as any).toDate
          ? (e.hireDate as any).toDate()
          : new Date(e.hireDate as any);
        let years = currentYear - hire.getFullYear();
        if (now < new Date(currentYear, hire.getMonth(), hire.getDate())) years--;
        return { ...e, years: Math.max(0, years), hireDay: hire.getDate() };
      })
      .filter((e) => e.years > 0)
      .sort((a, b) => a.hireDay - b.hireDay);
  }, [employees, currentMonth, currentYear]);

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const generateCampaign = async (type: 'birthday' | 'anniversary') => {
    setGenerating(type);
    const items = type === 'birthday' ? birthdays : anniversaries;
    const title = type === 'birthday'
      ? `${monthName} ${currentYear} Birthdays`
      : `${monthName} ${currentYear} Work Anniversaries`;

    try {
      // Create campaign
      const campaignRef = await addDoc(collection(db, 'campaigns'), {
        type,
        title,
        month: monthName,
        year: currentYear,
        isActive: true,
        displayOrder: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || '',
      });

      // Create entries + display content
      for (let i = 0; i < items.length; i++) {
        const emp = items[i];
        const isAnniv = type === 'anniversary';
        const annivData = isAnniv ? (emp as any) : null;

        const badgeText = isAnniv
          ? `Happy ${ordinal(annivData.years)} Anniversary`
          : `${monthName} Birthday`;

        const quote = isAnniv
          ? `Celebrating ${ordinal(annivData.years)} year${annivData.years > 1 ? 's' : ''} at Rowe Casa Organics!`
          : `Happy Birthday, ${emp.firstName}!`;

        const entryRef = await addDoc(
          collection(db, 'campaigns', campaignRef.id, 'entries'),
          {
            employeeRef: emp.id || '',
            employeeName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
            employeeTitle: emp.department || '',
            employeeTenure: isAnniv ? `${annivData.years} ${annivData.years === 1 ? 'Year' : 'Years'}` : '',
            employeeInitials: `${(emp.firstName || '?')[0]}${(emp.lastName || '?')[0]}`.toUpperCase(),
            photoUrl: emp.photoUrl || null,
            quote,
            badgeText,
            isVisible: true,
            displayOrder: i,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );

        // Sync to displayContent
        await setDoc(doc(db, 'displayContent', `${campaignRef.id}_${entryRef.id}`), {
          type,
          campaignId: campaignRef.id,
          entryId: entryRef.id,
          employeeName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
          employeeTitle: emp.department || '',
          employeeTenure: isAnniv ? `${annivData.years} ${annivData.years === 1 ? 'Year' : 'Years'}` : '',
          employeeInitials: `${(emp.firstName || '?')[0]}${(emp.lastName || '?')[0]}`.toUpperCase(),
          photoUrl: emp.photoUrl || null,
          quote,
          badgeText,
          displayOrder: i,
          isActive: true,
          updatedAt: serverTimestamp(),
        });
      }

      setDone((prev) => [...prev, type]);
    } catch (err) {
      console.error('Failed to generate campaign:', err);
    }
    setGenerating(null);
  };

  if (loading) {
    return <div className="text-sm text-brand-taupe">Loading employee data...</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/campaigns')}
        className="flex items-center gap-1.5 text-sm text-brand-warm-brown hover:text-brand-deep-brown mb-4"
      >
        <ArrowLeft size={16} />
        Back to Campaigns
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">
          Quick Generate — {monthName} {currentYear}
        </h2>
        <p className="text-sm text-brand-taupe mt-0.5">
          Auto-create birthday and anniversary campaigns from employee data
        </p>
      </div>

      {/* Birthday Campaign */}
      <div className="bg-white rounded-xl border border-brand-border mb-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center">
              <Cake size={20} className="text-brand-gold" />
            </div>
            <div>
              <h3 className="font-semibold text-brand-deep-brown">{monthName} Birthdays</h3>
              <p className="text-xs text-brand-taupe">
                {birthdays.length} {birthdays.length === 1 ? 'employee' : 'employees'} with birthdays this month
              </p>
            </div>
          </div>
          {done.includes('birthday') ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle size={16} /> Created
            </span>
          ) : (
            <button
              onClick={() => generateCampaign('birthday')}
              disabled={birthdays.length === 0 || generating !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors disabled:opacity-50"
            >
              {generating === 'birthday' ? (
                <><Loader size={15} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={15} /> Generate Campaign</>
              )}
            </button>
          )}
        </div>
        {birthdays.length > 0 ? (
          <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {birthdays.map((emp) => (
              <div key={emp.id} className="flex items-center gap-2">
                {emp.photoUrl ? (
                  <img src={emp.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-cream flex items-center justify-center text-[10px] font-medium text-brand-warm-brown">
                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-deep-brown truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-brand-taupe">{monthName} {emp.birthDay}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6 text-center text-sm text-brand-taupe">
            No employees have birthday data for {monthName} yet.
            <br />
            <span className="text-xs">Add birthdays in the Employee Roster to enable this.</span>
          </div>
        )}
      </div>

      {/* Anniversary Campaign */}
      <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-bronze/10 flex items-center justify-center">
              <Award size={20} className="text-brand-bronze" />
            </div>
            <div>
              <h3 className="font-semibold text-brand-deep-brown">{monthName} Work Anniversaries</h3>
              <p className="text-xs text-brand-taupe">
                {anniversaries.length} {anniversaries.length === 1 ? 'employee' : 'employees'} with anniversaries this month
              </p>
            </div>
          </div>
          {done.includes('anniversary') ? (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle size={16} /> Created
            </span>
          ) : (
            <button
              onClick={() => generateCampaign('anniversary')}
              disabled={anniversaries.length === 0 || generating !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-warm-brown text-white text-sm font-medium hover:bg-brand-deep-brown transition-colors disabled:opacity-50"
            >
              {generating === 'anniversary' ? (
                <><Loader size={15} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={15} /> Generate Campaign</>
              )}
            </button>
          )}
        </div>
        {anniversaries.length > 0 ? (
          <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {anniversaries.map((emp) => (
              <div key={emp.id} className="flex items-center gap-2">
                {emp.photoUrl ? (
                  <img src={emp.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-brand-cream flex items-center justify-center text-[10px] font-medium text-brand-warm-brown">
                    {emp.firstName?.[0]}{emp.lastName?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-deep-brown truncate">{emp.firstName} {emp.lastName}</p>
                  <p className="text-[10px] text-brand-bronze font-semibold">{ordinal(emp.years)} Anniversary</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-6 text-center text-sm text-brand-taupe">
            No employees have hire date data for {monthName} yet.
            <br />
            <span className="text-xs">Add hire dates in the Employee Roster to enable this.</span>
          </div>
        )}
      </div>
    </div>
  );
}
