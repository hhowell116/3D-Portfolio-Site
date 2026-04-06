import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useActiveContent } from './hooks/useActiveContent';
import { useDisplayConfig } from './hooks/useDisplayConfig';
import { useCelebrations } from './hooks/useCelebrations';
import { RockstarSlide } from './slides/RockstarSlide';
import { BirthdaySlide } from './slides/BirthdaySlide';
import { AnniversarySlide } from './slides/AnniversarySlide';
import { UpcomingCelebrationsSlide } from './slides/UpcomingCelebrationsSlide';
import { EmptyTodaySlide } from './slides/EmptyTodaySlide';
import { PhotoUpload } from './pages/PhotoUpload';
import type { DisplayContent } from '@rco/shared';
import type { CelebrationPerson } from './hooks/useCelebrations';
import './styles/brand.css';

type SlideItem =
  | { kind: 'individual'; data: DisplayContent; variant?: number }
  | { kind: 'upcoming'; birthdays: CelebrationPerson[]; anniversaries: CelebrationPerson[]; monthName: string }
  | { kind: 'empty-today'; type: 'birthday' | 'anniversary' | 'combined' };

function SlideItemRenderer({ item, isActive, rotationSpeed }: { item: SlideItem; isActive: boolean; rotationSpeed: number }) {
  if (item.kind === 'empty-today') {
    return <EmptyTodaySlide type={item.type} isActive={isActive} />;
  }
  if (item.kind === 'upcoming') {
    return <UpcomingCelebrationsSlide birthdays={item.birthdays} anniversaries={item.anniversaries} monthName={item.monthName} isActive={isActive} rotationSpeed={rotationSpeed} />;
  }
  const { data } = item;
  switch (data.type) {
    case 'birthday':
      return <BirthdaySlide item={data} isActive={isActive} />;
    case 'anniversary':
      return <AnniversarySlide item={data} isActive={isActive} variant={item.variant ?? 0} />;
    case 'rockstar':
    default:
      return <RockstarSlide item={data} isActive={isActive} />;
  }
}

type DisplayMode = 'all' | 'rockstars' | 'upload';

function getMode(): DisplayMode {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (path === 'rockstars') return 'rockstars';
  if (path === 'upload') return 'upload';
  return 'all';
}

export default function App() {
  const mode = useMemo(getMode, []);
  if (mode === 'upload') return <PhotoUpload />;
  if (mode === 'rockstars') return <RockstarRotator />;
  return <CelebrationsRotator />;
}

/** Rockstar-only slideshow (unchanged behavior) */
function RockstarRotator() {
  const { content: allContent, loading } = useActiveContent();
  const config = useDisplayConfig();

  const content = useMemo(
    () => allContent.filter((c) => c.type === 'rockstar'),
    [allContent]
  );

  const slides: SlideItem[] = useMemo(
    () => content.map((data) => ({ kind: 'individual' as const, data })),
    [content]
  );

  return (
    <SlideRotator
      slides={slides}
      loading={loading}
      config={config}
    />
  );
}

/** Celebrations slideshow: today's birthdays → today's anniversaries → upcoming combined */
function CelebrationsRotator() {
  const celebrations = useCelebrations();
  const config = useDisplayConfig();

  const slides: SlideItem[] = useMemo(() => {
    const items: SlideItem[] = [];
    const noBirthdaysToday = celebrations.todayBirthdays.length === 0;
    const noAnniversariesToday = celebrations.todayAnniversaries.length === 0;

    // If nothing today, show one combined "No Celebrations Today" slide
    if (noBirthdaysToday && noAnniversariesToday) {
      items.push({ kind: 'empty-today', type: 'combined' });
    }

    // Today's birthdays (individual slides)
    celebrations.todayBirthdays.forEach((data) => {
      items.push({ kind: 'individual', data });
    });

    // Today's anniversaries (individual slides) — assign variant per tenure group
    const tenureCount: Record<string, number> = {};
    celebrations.todayAnniversaries.forEach((data) => {
      const key = data.employeeTenure || 'unknown';
      const idx = tenureCount[key] ?? 0;
      tenureCount[key] = idx + 1;
      items.push({ kind: 'individual', data, variant: idx });
    });

    // Single combined upcoming slide (birthdays left, anniversaries right)
    if (celebrations.upcomingBirthdays.length > 0 || celebrations.upcomingAnniversaries.length > 0) {
      items.push({
        kind: 'upcoming',
        birthdays: celebrations.upcomingBirthdays,
        anniversaries: celebrations.upcomingAnniversaries,
        monthName: celebrations.monthName,
      });
    }

    return items;
  }, [celebrations]);

  return (
    <SlideRotator
      slides={slides}
      loading={celebrations.loading}
      config={config}
    />
  );
}

/** Generic slide rotator with progress bar and dot nav */
function SlideRotator({
  slides,
  loading,
  config,
}: {
  slides: SlideItem[];
  loading: boolean;
  config: ReturnType<typeof useDisplayConfig>;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(index % (slides.length || 1));
      startTimeRef.current = Date.now();
    },
    [slides.length]
  );

  useEffect(() => {
    setCurrentIndex(0);
    startTimeRef.current = Date.now();
  }, [slides.length]);

  // Auto-rotation
  useEffect(() => {
    if (!config.isLive || slides.length === 0) return;
    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= config.rotationSpeed) {
        setProgress(0);
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        startTimeRef.current = Date.now();
      } else {
        setProgress((elapsed / config.rotationSpeed) * 100);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    startTimeRef.current = Date.now();
    setProgress(0);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [slides.length, config.rotationSpeed, config.isLive]);

  // Keyboard nav + fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goTo(currentIndex + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo((currentIndex - 1 + slides.length) % slides.length); }
      if (e.key === 'f' || e.key === 'F') {
        document.fullscreenElement
          ? document.exitFullscreen().catch(() => {})
          : document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [currentIndex, slides.length, goTo]);

  useEffect(() => {
    const fn = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {}); };
    document.addEventListener('click', fn, { once: true });
    return () => document.removeEventListener('click', fn);
  }, []);

  if (loading) {
    return <div className="idle-screen"><img src="/logo.png" alt="RCO" /><p>Loading...</p></div>;
  }
  if (!config.isLive || slides.length === 0) {
    return <div className="idle-screen"><img src="/logo.png" alt="RCO" /><p>Rowe Casa Organics</p></div>;
  }

  return (
    <>
      <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
        {slides.map((item, i) => (
          <SlideItemRenderer key={i} item={item} isActive={i === currentIndex} rotationSpeed={config.rotationSpeed} />
        ))}
      </div>
      {config.showDotNav && slides.length > 1 && (
        <div className="dots">
          {slides.map((_, i) => (
            <div key={i} className={`dot ${i === currentIndex ? 'active' : ''}`} onClick={() => goTo(i)} />
          ))}
        </div>
      )}
      {config.showProgressBar && <div className="tbar" style={{ width: `${progress}%` }} />}
    </>
  );
}
