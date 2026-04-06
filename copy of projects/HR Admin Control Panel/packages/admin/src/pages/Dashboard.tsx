import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { Users, Cake, Trophy, Award } from 'lucide-react';

interface StatCard {
  label: string;
  value: number;
  icon: typeof Users;
  color: string;
}

export function Dashboard() {
  const { appUser } = useAuth();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1;

        const employeesSnap = await getDocs(
          query(collection(db, 'employees'), where('isActive', '==', true))
        );

        const campaignsSnap = await getDocs(
          query(collection(db, 'campaigns'), where('isActive', '==', true))
        );

        const birthdays = employeesSnap.docs.filter(
          (d) => d.data().birthMonth === currentMonth
        ).length;

        const anniversaries = employeesSnap.docs.filter((d) => {
          const hireDate = d.data().hireDate;
          if (!hireDate) return false;
          const hire = hireDate.toDate ? hireDate.toDate() : new Date(hireDate);
          return hire.getMonth() + 1 === currentMonth;
        }).length;

        setStats([
          { label: 'Active Employees', value: employeesSnap.size, icon: Users, color: 'bg-brand-warm-brown' },
          { label: 'Birthdays This Month', value: birthdays, icon: Cake, color: 'bg-brand-gold' },
          { label: 'Anniversaries This Month', value: anniversaries, icon: Award, color: 'bg-brand-bronze' },
          { label: 'Active Campaigns', value: campaignsSnap.size, icon: Trophy, color: 'bg-brand-taupe' },
        ]);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-brand-deep-brown">
          Welcome back, {appUser?.displayName?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-sm text-brand-taupe mt-1">
          Here's what's happening with employee recognition.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-brand-border animate-pulse h-28" />
            ))
          : stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl p-5 border border-brand-border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${stat.color} w-9 h-9 rounded-lg flex items-center justify-center`}>
                    <stat.icon size={18} className="text-white" />
                  </div>
                  <span className="text-sm text-brand-taupe">{stat.label}</span>
                </div>
                <p className="text-3xl font-bold text-brand-deep-brown">{stat.value}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
