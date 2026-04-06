import { useRef, useEffect } from 'react';
import type { CelebrationPerson } from '../hooks/useCelebrations';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface Props {
  birthdays: CelebrationPerson[];
  anniversaries: CelebrationPerson[];
  monthName: string;
  isActive: boolean;
  rotationSpeed: number;
}

/**
 * Auto-scrolls list content using CSS transform (sub-pixel, GPU-accelerated).
 * Returns refs for the outer container and inner wrapper.
 */
function useAutoScroll(isActive: boolean, rotationSpeed: number) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || !isActive) {
      if (inner) inner.style.transform = 'translateY(0)';
      return;
    }

    const overflow = inner.scrollHeight - outer.clientHeight;
    if (overflow <= 0) {
      inner.style.transform = 'translateY(0)';
      return;
    }

    // Scroll over (rotationSpeed - 2s), sit at bottom for 2s
    const pauseMs = 2000;
    const scrollDuration = Math.max(rotationSpeed - pauseMs, 2000);
    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);
      // Smooth ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      // Sub-pixel translateY — GPU composited, no pixel snapping
      inner.style.transform = `translateY(${-eased * overflow}px)`;

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, rotationSpeed]);

  return { outerRef, innerRef };
}

export function UpcomingCelebrationsSlide({ birthdays, anniversaries, monthName, isActive, rotationSpeed }: Props) {
  const bday = useAutoScroll(isActive, rotationSpeed);
  const anniv = useAutoScroll(isActive, rotationSpeed);

  return (
    <div className={`slide upcoming-celebrations ${isActive ? 'active' : ''}`}>
      {/* Fireworks scattered across */}
      <div className="fw fw1" /><div className="fw fw2" /><div className="fw fw3" />
      <div className="fw fw-r1" /><div className="fw fw-r2" /><div className="fw fw-r3" />
      <div className="sk sk1" /><div className="sk sk2" /><div className="sk sk3" /><div className="sk sk4" />

      {/* Header bar — logo left, title center */}
      <div className="uc-topbar">
        <div className="badge">Upcoming {monthName} Celebrations</div>
      </div>

      {/* Two columns */}
      <div className="uc-columns">
        {/* Birthdays */}
        <div className="uc-col">
          <div className="uc-section-title">
            <span className="fw-icon" />
            BIRTHDAYS
            <span className="fw-icon" />
          </div>
          <div className="uc-list" ref={bday.outerRef}>
            <div className="uc-list-inner" ref={bday.innerRef}>
              {birthdays.length > 0 ? birthdays.map((p, i) => (
                <div key={i} className="uc-row">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="uc-photo" />
                  ) : (
                    <div className="uc-initials">{p.initials}</div>
                  )}
                  <div className="uc-info">
                    <span className="uc-name">{p.name}</span>
                    <span className="uc-detail">{monthName} {p.day}</span>
                  </div>
                </div>
              )) : (
                <div className="uc-none">None this month</div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="uc-divider" />

        {/* Anniversaries */}
        <div className="uc-col">
          <div className="uc-section-title">
            <span className="fw-icon" />
            ANNIVERSARIES
            <span className="fw-icon" />
          </div>
          <div className="uc-list" ref={anniv.outerRef}>
            <div className="uc-list-inner" ref={anniv.innerRef}>
              {anniversaries.length > 0 ? anniversaries.map((p, i) => (
                <div key={i} className="uc-row">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="uc-photo" />
                  ) : (
                    <div className="uc-initials">{p.initials}</div>
                  )}
                  <div className="uc-info">
                    <span className="uc-name">{p.name}</span>
                    <span className="uc-detail">{monthName} {p.day} &middot; {ordinal(p.years!)} Anniversary!</span>
                  </div>
                </div>
              )) : (
                <div className="uc-none">None this month</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
