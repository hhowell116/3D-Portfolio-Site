import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

// Existing rockstar data from the original static page
const ROCKSTARS = [
  { name: 'Kyle Longest', title: 'Production Specialist', tenure: '4 months', month: 'January', quote: 'I admire how Rowe Casa puts God above business and money. I like how Rowe Casa cares about its employees. I also like how Rowe Casa listens to its employees and follows through with employee ideas on making things better.', initials: 'KL' },
  { name: 'Derric Watson', title: 'Kitchen Supervisor', tenure: '1 year, 4 months', month: 'January', quote: 'The teammates and the camaraderie are what make working at Rowe Casa special. There\'s never a dull moment working with the great group of people I see daily.', initials: 'DW' },
  { name: 'Marcus Griffin', title: 'Warehouse Inventory Associate', tenure: '1 year', month: 'January', quote: '"Choose to be optimistic and have a positive outlook regardless of the circumstance."<br><br>What he likes best working at Rowe Casa Organics are the amazing people he has met throughout his time here and the work environment.', initials: 'MG' },
  { name: 'Jacob Schooley', title: 'Quality Assurance Specialist', tenure: '1 year, 3 months', month: 'February', quote: 'I enjoy the people and the vibe. I went through a personal matter and received nothing but support from my supervisors and my Rowe Casa family. This hammered in loyalty from the start. I also appreciate the opportunities that I have been given and the opportunities to grow within Rowe Casa.', initials: 'JS' },
  { name: 'Hillary Kemp', title: 'Quality Assurance Specialist', tenure: '2 years, 5 months', month: 'February', quote: '"Quality means doing it right when no one is looking." — Henry Ford<br><br>I like my job because it allows me to solve problems, ensure quality standards are met, and contributes to improving processes. It\'s rewarding to know the work I do helps maintain product quality and supports the team!', initials: 'HK' },
  { name: 'Terri Longest', title: 'Shipping Specialist', tenure: '1 year, 4 months', month: 'February', quote: 'Rowe Casa Organics provides great opportunities for learning and advancement. I enjoy working for this family-oriented company. Their professional staff is the best I have ever worked for.', initials: 'TL' },
  { name: 'Andrea Munoz', title: 'Quality Assurance Supervisor', tenure: '5 years', month: 'February', quote: 'I have never worked somewhere that has allowed me to grow like Rowe Casa has. I am grateful for the opportunity to be here.', initials: 'AM' },
  { name: 'Elijah Miller', title: 'QA Specialist', tenure: '', month: 'March', quote: 'I am pleased to be part of the quality assurance team and ensure we are putting out our best. From catching errors and contamination to finding ways to streamline and improve the processes in any way, I am dedicated to the overall quality and everyone that I work with each day.', initials: 'EM' },
  { name: 'Kim Eubank', title: 'Production Supervisor', tenure: '', month: 'March', quote: 'It is an honor to work with and for such incredible people here at Rowe Casa Organics. It\'s like my home away from home. I love how we not only create goals but also achieve them everyday. I believe in the people here and the future of this brand.', initials: 'KE' },
  { name: 'Megan Escobedo', title: 'Curing Specialist', tenure: '', month: 'March', quote: 'Working at Rowe Casa means so much more to me than just showing up and getting tasks done—it means being part of something meaningful, where everyday brings a chance to grow, connect and make a difference in ways big and small.', initials: 'ME' },
];

export const seedRockstarsData = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can seed data.');
  }

  const batch = db.batch();

  // Group by month for campaigns
  const monthGroups: Record<string, typeof ROCKSTARS> = {};
  for (const r of ROCKSTARS) {
    if (!monthGroups[r.month]) monthGroups[r.month] = [];
    monthGroups[r.month].push(r);
  }

  let entryOrder = 0;
  for (const [month, employees] of Object.entries(monthGroups)) {
    // Create campaign
    const campaignRef = db.collection('campaigns').doc();
    batch.set(campaignRef, {
      type: 'rockstar',
      title: `${month} 2025 Rockstars`,
      month,
      year: 2025,
      isActive: true,
      displayOrder: entryOrder,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    });

    for (const emp of employees) {
      const [firstName, ...lastParts] = emp.name.split(' ');
      const lastName = lastParts.join(' ');

      // Create employee
      const empRef = db.collection('employees').doc();
      batch.set(empRef, {
        firstName,
        lastName,
        displayName: emp.name,
        email: '',
        department: emp.title,
        employeeId: '',
        phoneLast4: '',
        photoUrl: null,
        photoStatus: 'none',
        birthMonth: 0,
        birthDay: 0,
        hireDate: null,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: request.auth.uid,
      });

      // Create campaign entry
      const entryRef = campaignRef.collection('entries').doc();
      batch.set(entryRef, {
        employeeRef: empRef.id,
        employeeName: emp.name,
        employeeTitle: emp.title,
        employeeTenure: emp.tenure,
        employeeInitials: emp.initials,
        photoUrl: null,
        quote: emp.quote,
        badgeText: `${month} Rockstar`,
        isVisible: true,
        displayOrder: entryOrder++,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  await batch.commit();
  return { success: true, count: ROCKSTARS.length };
});
