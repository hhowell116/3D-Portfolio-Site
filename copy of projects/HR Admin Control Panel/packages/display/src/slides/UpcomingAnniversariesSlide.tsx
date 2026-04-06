import type { CelebrationPerson } from '../hooks/useCelebrations';
import { MiniCalendar } from './MiniCalendar';

interface Props {
  people: CelebrationPerson[];
  monthName: string;
  isActive: boolean;
}

export function UpcomingAnniversariesSlide({ people, monthName, isActive }: Props) {
  return (
    <div className={`slide ${isActive ? 'active' : ''}`}>
      {/* Left panel — calendar */}
      <div className="photo-side">
        <div className="lp lp1" /><div className="lp lp2" /><div className="lp lp3" />
        <div className="lp lp4" /><div className="lp lp5" /><div className="lp lp6" />
        <div className="lp lp7" /><div className="lp lp8" />

        <div className="fw fw1" /><div className="fw fw2" /><div className="fw fw3" />
        <div className="fw fw4" /><div className="fw fw5" /><div className="fw fw6" />

        <img className="logo-top" src="/logo.png" alt="RCO" />

        <MiniCalendar people={people} monthName={monthName} type="anniversary" />
      </div>

      {/* Right panel */}
      <div className="text-side">
        <div className="fw fw-r1" /><div className="fw fw-r2" /><div className="fw fw-r3" />
        <div className="fw fw-r4" /><div className="fw fw-r5" />
        <div className="sk sk1" /><div className="sk sk2" /><div className="sk sk3" /><div className="sk sk4" />

        <div className="summary-spacer" />
        <div className="badge">Upcoming</div>
        <div className="slide-title">
          <span className="fw-icon" />
          {monthName.toUpperCase()} ANNIVERSARIES
          <span className="fw-icon" />
        </div>

        <div className="summary-list">
          {people.map((p, i) => (
            <div key={i} className="summary-row">
              {p.photoUrl ? (
                <img src={p.photoUrl} alt="" className="summary-photo" />
              ) : (
                <div className="summary-initials">{p.initials}</div>
              )}
              <div className="summary-info">
                <span className="summary-name">{p.name}</span>
                <span className="summary-detail">
                  {monthName} {p.day} &middot; {p.years} {p.years === 1 ? 'Year' : 'Years'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
