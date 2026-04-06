import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './celebrations.css';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  department: string;
  photoUrl: string | null;
  birthMonth: number;
  birthDay: number;
  hireDate: any;
  isActive: boolean;
}

interface Celebration {
  name: string;
  photoUrl: string | null;
  initials: string;
  day: number;
  type: 'birthday' | 'anniversary';
  years?: number;
  department: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export function CelebrationsBoard() {
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthName = MONTH_NAMES[now.getMonth()];
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const today = now.getDate();

  useEffect(() => {
    const q = query(
      collection(db, 'employees'),
      where('isActive', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const results: Celebration[] = [];

      snap.docs.forEach((d) => {
        const emp = d.data() as Employee;
        const name = emp.displayName || `${emp.firstName} ${emp.lastName}`;
        const initials = `${(emp.firstName || '?')[0]}${(emp.lastName || '?')[0]}`.toUpperCase();

        // Birthday
        if (emp.birthMonth === currentMonth && emp.birthDay) {
          results.push({
            name,
            photoUrl: emp.photoUrl || null,
            initials,
            day: emp.birthDay,
            type: 'birthday',
            department: emp.department || '',
          });
        }

        // Anniversary
        if (emp.hireDate) {
          const hire = emp.hireDate.toDate ? emp.hireDate.toDate() : new Date(emp.hireDate);
          if (hire.getMonth() + 1 === currentMonth) {
            let years = currentYear - hire.getFullYear();
            if (now < new Date(currentYear, hire.getMonth(), hire.getDate())) years--;
            if (years > 0) {
              results.push({
                name,
                photoUrl: emp.photoUrl || null,
                initials,
                day: hire.getDate(),
                type: 'anniversary',
                years,
                department: emp.department || '',
              });
            }
          }
        }
      });

      results.sort((a, b) => a.day - b.day);
      setCelebrations(results);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const birthdays = celebrations.filter((c) => c.type === 'birthday' && c.day === today);
  const anniversaries = celebrations.filter((c) => c.type === 'anniversary' && c.day === today);

  // Map day → celebrations for calendar
  const dayMap = new Map<number, Celebration[]>();
  celebrations.forEach((c) => {
    if (!dayMap.has(c.day)) dayMap.set(c.day, []);
    dayMap.get(c.day)!.push(c);
  });

  if (loading) {
    return (
      <div className="cb-idle">
        <img src="/logo.png" alt="RCO" />
        <p>Loading celebrations...</p>
      </div>
    );
  }

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="cb-root">
      {/* Top bar */}
      <div className="cb-topbar">
        <img src="/logo.png" alt="RCO" className="cb-logo" />
        <div className="cb-title-area">
          <h1 className="cb-month">{monthName} {currentYear}</h1>
          <p className="cb-subtitle">Employee Celebrations</p>
        </div>
      </div>

      <div className="cb-body">
        {/* LEFT — Calendar */}
        <div className="cb-calendar-side">
          <div className="cb-cal-grid">
            {/* Day headers */}
            {DAY_LABELS.map((d) => (
              <div key={d} className="cb-cal-header">{d}</div>
            ))}

            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className="cb-cal-cell cb-cal-empty" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const events = dayMap.get(day);
              const isToday = day === today;
              const hasBirthday = events?.some((e) => e.type === 'birthday');
              const hasAnniversary = events?.some((e) => e.type === 'anniversary');

              return (
                <div
                  key={day}
                  className={`cb-cal-cell ${isToday ? 'cb-cal-today' : ''} ${events ? 'cb-cal-has-event' : ''}`}
                >
                  <span className="cb-cal-num">{day}</span>
                  {events && (
                    <div className="cb-cal-dots">
                      {hasBirthday && <span className="cb-dot-bday" title="Birthday">&#127874;</span>}
                      {hasAnniversary && <span className="cb-dot-anniv" title="Anniversary">&#127942;</span>}
                    </div>
                  )}
                  {events && (
                    <div className="cb-cal-names">
                      {events.map((ev, idx) => (
                        <span key={idx} className={`cb-cal-name ${ev.type === 'birthday' ? 'cb-name-bday' : 'cb-name-anniv'}`}>
                          {ev.name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="cb-legend">
            <span className="cb-legend-item"><span className="cb-dot-bday">&#127874;</span> Birthday</span>
            <span className="cb-legend-item"><span className="cb-dot-anniv">&#127942;</span> Anniversary</span>
          </div>
        </div>

        {/* RIGHT — Celebration Lists */}
        <div className="cb-lists-side">
          {/* Birthdays */}
          {birthdays.length > 0 && (
            <div className="cb-section">
              <h2 className="cb-section-title cb-section-bday">
                <span>&#127874;</span> Happy Birthday!
              </h2>
              <div className="cb-cards">
                {birthdays.map((c, i) => (
                  <div key={i} className="cb-card cb-card-bday">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt="" className="cb-card-photo" />
                    ) : (
                      <div className="cb-card-initials cb-initials-bday">{c.initials}</div>
                    )}
                    <div className="cb-card-info">
                      <p className="cb-card-name">{c.name}</p>
                      <p className="cb-card-detail">{monthName} {c.day}</p>
                      {c.department && <p className="cb-card-dept">{c.department}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anniversaries */}
          {anniversaries.length > 0 && (
            <div className="cb-section">
              <h2 className="cb-section-title cb-section-anniv">
                <span>&#127942;</span> Happy Work Anniversary!
              </h2>
              <div className="cb-cards">
                {anniversaries.map((c, i) => (
                  <div key={i} className="cb-card cb-card-anniv">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} alt="" className="cb-card-photo" />
                    ) : (
                      <div className="cb-card-initials cb-initials-anniv">{c.initials}</div>
                    )}
                    <div className="cb-card-info">
                      <p className="cb-card-name">{c.name}</p>
                      <p className="cb-card-years">
                        Happy {ordinal(c.years!)} Anniversary!
                      </p>
                      {c.department && <p className="cb-card-dept">{c.department}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {birthdays.length === 0 && anniversaries.length === 0 && (
            <div className="cb-empty">
              <p>No celebrations this month</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
