import {
  collection, query, where, getDocs, addDoc, doc, setDoc, deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { MONTHS } from '@rco/shared';
import type { Employee } from '@rco/shared';

function ordinal(n: number) {
  if (!n || n < 1) return `${n}th`;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

async function findOrCreateCampaign(
  type: 'birthday' | 'anniversary',
  month: number,
  year: number,
  userId: string
): Promise<string> {
  if (month < 1 || month > 12) return '';
  const monthName = MONTHS[month - 1];

  try {
    const q = query(
      collection(db, 'campaigns'),
      where('type', '==', type),
      where('month', '==', monthName),
      where('year', '==', year)
    );
    const snap = await getDocs(q);
    if (snap.size > 0) return snap.docs[0].id;

    const title = type === 'birthday'
      ? `${monthName} ${year} Birthdays`
      : `${monthName} ${year} Work Anniversaries`;

    const ref = await addDoc(collection(db, 'campaigns'), {
      type,
      title,
      month: monthName,
      year,
      isActive: true,
      displayOrder: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
    return ref.id;
  } catch (err) {
    console.error(`Failed to find/create ${type} campaign for ${monthName} ${year}:`, err);
    return '';
  }
}

async function upsertCampaignEntry(
  campaignId: string,
  campaignType: 'birthday' | 'anniversary',
  emp: { id: string } & Partial<Employee>,
  extra: { years?: number; day: number; month: number }
) {
  if (!campaignId || !emp.id) return;
  if (extra.month < 1 || extra.month > 12) return;

  const monthName = MONTHS[extra.month - 1];
  const entriesRef = collection(db, 'campaigns', campaignId, 'entries');

  try {
    // Remove old entry for this employee if exists
    const existing = await getDocs(
      query(entriesRef, where('employeeRef', '==', emp.id))
    );
    for (const d of existing.docs) {
      await deleteDoc(doc(db, 'displayContent', `${campaignId}_${d.id}`)).catch(() => {});
      await deleteDoc(d.ref).catch(() => {});
    }

    const firstName = emp.firstName || '';
    const lastName = emp.lastName || '';
    const name = emp.displayName || `${firstName} ${lastName}`.trim() || 'Unknown';
    const initials = `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();

    const isAnniv = campaignType === 'anniversary';
    const years = extra.years || 0;
    const badgeText = isAnniv
      ? `Happy ${ordinal(years)} Anniversary`
      : `${monthName} Birthday`;
    const quote = isAnniv
      ? `Celebrating ${ordinal(years)} year${years > 1 ? 's' : ''} at Rowe Casa Organics!`
      : `Happy Birthday, ${firstName || name}!`;

    const entryRef = await addDoc(entriesRef, {
      employeeRef: emp.id,
      employeeName: name,
      employeeTitle: emp.department || '',
      employeeTenure: isAnniv ? `${years} ${years === 1 ? 'Year' : 'Years'}` : '',
      employeeInitials: initials,
      photoUrl: emp.photoUrl || null,
      quote,
      badgeText,
      isVisible: true,
      displayOrder: extra.day || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'displayContent', `${campaignId}_${entryRef.id}`), {
      type: campaignType,
      campaignId,
      entryId: entryRef.id,
      employeeName: name,
      employeeTitle: emp.department || '',
      employeeTenure: isAnniv ? `${years} ${years === 1 ? 'Year' : 'Years'}` : '',
      employeeInitials: initials,
      photoUrl: emp.photoUrl || null,
      quote,
      badgeText,
      displayOrder: extra.day || 0,
      isActive: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error(`Failed to upsert campaign entry for ${emp.displayName || emp.id}:`, err);
  }
}

/**
 * Call after adding/updating an employee.
 * Automatically creates or updates birthday and anniversary campaigns.
 * Fully safe — silently skips on missing/invalid data.
 */
export async function syncEmployeeCampaigns(
  emp: { id: string } & Partial<Employee>,
  userId: string
) {
  if (!emp.id) return;

  try {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Birthday campaign — only if both month AND day are valid
    const bMonth = Number(emp.birthMonth) || 0;
    const bDay = Number(emp.birthDay) || 0;
    if (bMonth >= 1 && bMonth <= 12 && bDay >= 1 && bDay <= 31) {
      const campaignId = await findOrCreateCampaign('birthday', bMonth, currentYear, userId);
      if (campaignId) {
        await upsertCampaignEntry(campaignId, 'birthday', emp, { day: bDay, month: bMonth });
      }
    }

    // Anniversary campaign — only if hireDate is valid and years > 0
    if (emp.hireDate) {
      let hire: Date;
      try {
        hire = (emp.hireDate as any).toDate
          ? (emp.hireDate as any).toDate()
          : new Date(emp.hireDate as any);
        if (isNaN(hire.getTime())) return;
      } catch {
        return;
      }

      const hireMonth = hire.getMonth() + 1;
      let years = currentYear - hire.getFullYear();
      if (now < new Date(currentYear, hire.getMonth(), hire.getDate())) years--;

      if (years > 0 && hireMonth >= 1 && hireMonth <= 12) {
        const campaignId = await findOrCreateCampaign('anniversary', hireMonth, currentYear, userId);
        if (campaignId) {
          await upsertCampaignEntry(campaignId, 'anniversary', emp, {
            years,
            day: hire.getDate(),
            month: hireMonth,
          });
        }
      }
    }
  } catch (err) {
    console.error('syncEmployeeCampaigns failed:', err);
  }
}
