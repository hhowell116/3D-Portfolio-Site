import type { CelebrationPerson } from '../hooks/useCelebrations';

interface Props {
  people: CelebrationPerson[];
  monthName: string;
  type: 'birthday' | 'anniversary';
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export function MiniCalendar({ people, monthName, type }: Props) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const today = now.getDate();

  // Build set of days that have celebrations
  const eventDays = new Set(people.map((p) => p.day));

  return (
    <div className="mcal">
      <div className="mcal-header">{monthName} {currentYear}</div>
      <div className="mcal-grid">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="mcal-day-label">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e${i}`} className="mcal-cell mcal-empty" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = day === today;
          const hasEvent = eventDays.has(day);
          return (
            <div
              key={day}
              className={`mcal-cell${isToday ? ' mcal-today' : ''}${hasEvent ? ' mcal-event' : ''}`}
            >
              <span className="mcal-num">{day}</span>
              {hasEvent && <span className="mcal-dot">{type === 'birthday' ? '\u{1F382}' : '\u{1F3C6}'}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
