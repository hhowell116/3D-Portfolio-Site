import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { DisplayContent } from '@rco/shared';

export interface CelebrationPerson {
  name: string;
  initials: string;
  photoUrl: string | null;
  department: string;
  day: number;
  years?: number;
}

export interface CelebrationSlides {
  /** Individual slides for today's birthdays */
  todayBirthdays: DisplayContent[];
  /** Individual slides for today's anniversaries */
  todayAnniversaries: DisplayContent[];
  /** People with birthdays later this month */
  upcomingBirthdays: CelebrationPerson[];
  /** People with anniversaries later this month */
  upcomingAnniversaries: CelebrationPerson[];
  /** Current month name */
  monthName: string;
  loading: boolean;
}

/**
 * Auto-generates birthday and anniversary slides from employee data
 * for the current month — no manual campaign entries needed.
 */
/** Returns a date string like "2026-04-06" that changes at midnight. */
function useDateKey() {
  const [dateKey, setDateKey] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    // Calculate ms until next midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      setDateKey(new Date().toISOString().slice(0, 10));
    }, msUntilMidnight + 1000); // +1s buffer

    return () => clearTimeout(timeout);
  }, [dateKey]); // Re-schedules after each midnight tick

  return dateKey;
}

export function useCelebrations(): CelebrationSlides {
  const dateKey = useDateKey();

  const [data, setData] = useState<CelebrationSlides>({
    todayBirthdays: [],
    todayAnniversaries: [],
    upcomingBirthdays: [],
    upcomingAnniversaries: [],
    monthName: '',
    loading: true,
  });

  useEffect(() => {
    const q = query(
      collection(db, 'employees'),
      where('isActive', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const today = now.getDate();
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      const monthName = monthNames[now.getMonth()];

      const todayBirthdays: DisplayContent[] = [];
      const todayAnniversaries: DisplayContent[] = [];
      const upcomingBirthdays: CelebrationPerson[] = [];
      const upcomingAnniversaries: CelebrationPerson[] = [];

      snap.docs.forEach((d) => {
        const emp = d.data();
        const name = emp.displayName || `${emp.firstName} ${emp.lastName}`;
        const initials = `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase();

        // Birthday
        if (emp.birthMonth === currentMonth && emp.birthDay) {
          if (emp.birthDay === today) {
            todayBirthdays.push({
              id: `bday-${d.id}`,
              type: 'birthday',
              campaignId: '',
              entryId: '',
              employeeName: name,
              employeeTitle: emp.department || '',
              employeeTenure: '',
              employeeInitials: initials,
              photoUrl: emp.photoUrl || null,
              quote: '',
              badgeText: `${monthName} Birthday`,
              displayOrder: emp.birthDay,
              isActive: true,
              updatedAt: null as any,
            });
          } else if (emp.birthDay > today) {
            upcomingBirthdays.push({
              name,
              initials,
              photoUrl: emp.photoUrl || null,
              department: emp.department || '',
              day: emp.birthDay,
            });
          }
        }

        // Anniversary
        if (emp.hireDate) {
          const hire = emp.hireDate.toDate ? emp.hireDate.toDate() : new Date(emp.hireDate);
          if (hire.getMonth() + 1 === currentMonth) {
            const hireDay = hire.getDate();
            // Calculate years as of their anniversary day this year (not as of today)
            const yearsOnDay = now.getFullYear() - hire.getFullYear();

            if (yearsOnDay > 0) {
              if (hireDay === today) {
                todayAnniversaries.push({
                  id: `anniv-${d.id}`,
                  type: 'anniversary',
                  campaignId: '',
                  entryId: '',
                  employeeName: name,
                  employeeTitle: emp.department || '',
                  employeeTenure: `${yearsOnDay} ${yearsOnDay === 1 ? 'Year' : 'Years'}`,
                  employeeInitials: initials,
                  photoUrl: emp.photoUrl || null,
                  quote: '',
                  badgeText: `${monthName} Work Anniversary`,
                  displayOrder: hireDay,
                  isActive: true,
                  updatedAt: null as any,
                });
              } else if (hireDay > today) {
                upcomingAnniversaries.push({
                  name,
                  initials,
                  photoUrl: emp.photoUrl || null,
                  department: emp.department || '',
                  day: hireDay,
                  years: yearsOnDay,
                });
              }
            }
          }
        }
      });

      // Sort by name
      todayBirthdays.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      todayAnniversaries.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
      upcomingBirthdays.sort((a, b) => a.day - b.day);
      upcomingAnniversaries.sort((a, b) => a.day - b.day);

      setData({
        todayBirthdays,
        todayAnniversaries,
        upcomingBirthdays,
        upcomingAnniversaries,
        monthName,
        loading: false,
      });
    });

    return () => unsub();
  }, [dateKey]);

  return data;
}
