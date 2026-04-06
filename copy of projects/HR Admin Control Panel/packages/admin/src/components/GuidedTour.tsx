import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  route?: string;
  anchor?: string; // data-tour value to anchor to (sidebar or in-page element)
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to RCO HR TV Admin!',
    description: 'This is your control center for managing the facility TV displays. From here you can manage employees, create recognition campaigns, and control what shows on the TV screens.\n\nLet\'s walk through each section so you know exactly how everything works.',
  },
  {
    title: 'Dashboard',
    description: 'Your home base with a quick snapshot of the system:\n\n- Total active employees in the roster\n- How many birthdays and anniversaries are this month\n- Number of active campaigns running on the TV displays',
    route: '/',
    anchor: '/',
  },
  {
    title: 'Employee Roster',
    description: 'The master list of all employees. From here you can:\n\n- Add employees one at a time with the "Add Employee" button\n- Bulk-import using "Import CSV" (more on that next)\n- Export your current roster with "Export CSV"\n- Click the pencil icon on any employee to edit their name, photo, department, birthday, or hire date\n- Search and filter by active/inactive status',
    route: '/employees',
    anchor: '/employees',
  },
  {
    title: 'Importing Employees via CSV',
    description: 'Click "Import CSV" to bulk-add employees.\n\n1. Download the CSV template — it has columns for First Name, Last Name, Email, Department, Job Title, Employee ID, Birthday, Hire Date, and more\n2. Fill in the template (only name is required — everything else is optional)\n3. Upload your completed CSV and preview the data\n4. Click Import — duplicates are automatically skipped, and birthday/anniversary campaigns are created for each employee\n\nThe importer is flexible with column names, so "First Name", "FirstName", or "Name" all work.',
    route: '/employees',
    anchor: 'import-csv-btn',
  },
  {
    title: 'Exporting Employee Data',
    description: 'Click "Export CSV" to download all active employees as a spreadsheet.\n\nThe export includes: name, email, department, employee ID, birthday, hire date, and phone last 4. You can open it in Excel or Google Sheets.',
    route: '/employees',
    anchor: 'export-csv-btn',
  },
  {
    title: 'Birthdays',
    description: 'Browse employee birthdays organized by month. Use the arrows to navigate between months.\n\nBirthday data comes from each employee\'s profile — when you add or update a birthday on the Employee Roster, it automatically appears here and creates a display campaign for the TV screens.',
    route: '/birthdays',
    anchor: '/birthdays',
  },
  {
    title: 'Anniversaries',
    description: 'Work anniversaries calculated automatically from each employee\'s hire date. Shows years of service and is organized by month.\n\nLike birthdays, anniversary campaigns are auto-created when you set a hire date on an employee\'s profile — no extra steps needed.',
    route: '/anniversaries',
    anchor: '/anniversaries',
  },
  {
    title: 'Campaigns — Overview',
    description: 'Campaigns control what shows on the facility TV screens. There are three types:\n\n- Birthday campaigns — auto-created when employees have birthday data\n- Anniversary campaigns — auto-created from hire dates\n- Rockstar campaigns — manually created to spotlight outstanding employees\n\nBirthday and anniversary campaigns are fully automatic. Rockstar campaigns are the ones you\'ll create and manage yourself.',
    route: '/campaigns',
    anchor: '/campaigns',
  },
  {
    title: 'How to Create a Rockstar Campaign',
    description: 'To recognize a Rockstar employee on the TV displays:\n\n1. Go to Campaigns and click "New Campaign"\n2. Set the type to "Rockstar" and pick the month\n3. Click into your new campaign to open it\n4. Click "Add Entry" and select the employee from the dropdown\n5. Write a quote or recognition message for them\n6. Save — they\'ll immediately appear in the TV display rotation\n\nYou can add multiple rockstars to a single campaign (e.g. "April 2026 Rockstars").',
    route: '/campaigns',
    anchor: '/campaigns',
  },
  {
    title: 'Photo Submissions',
    description: 'Employees can submit their own profile photos by scanning a QR code or visiting a link you share.\n\nHere\'s how it works:\n1. Go to the "QR Code" tab to see the QR code and shareable URL\n2. Print the QR code for a common area, or copy the URL and send it via email/Slack\n3. Employees scan it, search for their name, and upload a photo\n4. You\'ll see pending submissions on this page — approve or reject each one\n\nApproved photos automatically update the employee\'s profile and appear on the TV displays.',
    route: '/photo-submissions',
    anchor: '/photo-submissions',
  },
  {
    title: 'View Displays',
    description: 'Preview exactly what\'s showing on the facility TV screens.\n\n- "Birthdays & Anniversaries" — the calendar board that shows on the main display. Birthdays and anniversaries only appear on the employee\'s actual day.\n- "Rockstars Only" — shows only rockstar recognition slides\n\nUse "Preview" to see it inline, or "Open" to launch it fullscreen in a new tab. Point your Airtame device to the URL shown on each card.',
    route: '/displays',
    anchor: '/displays',
  },
  {
    title: 'Display Settings',
    description: 'Fine-tune how the TV displays behave:\n\n- Rotation Speed — how long each slide stays on screen\n- Progress Bar — shows a bar at the bottom indicating time until next slide\n- Dot Navigation — shows dots for each slide\n- Master On/Off — turn all displays on or off instantly\n\nChanges take effect immediately on all connected screens.',
    route: '/display-settings',
    anchor: '/display-settings',
  },
  {
    title: 'You\'re All Set!',
    description: 'Here\'s the quick summary:\n\n- Add employees via "Add Employee" or "Import CSV" on the roster\n- Export your roster anytime with "Export CSV"\n- Birthdays and anniversaries auto-create their own campaigns\n- Rockstars are added manually: Campaigns → New Campaign → Rockstar\n- Employees can self-submit photos via the QR code on the Photo Submissions tab\n- Displays update in real-time — no refresh needed\n\nRe-launch this tour anytime from "Retake Tour" in the sidebar.',
  },
];

export function GuidedTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const [arrowSide, setArrowSide] = useState<'left' | 'top'>('left');
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  // Navigate to the step's route
  useEffect(() => {
    if (current.route) navigate(current.route);
  }, [step, current.route, navigate]);

  // Position the card next to the anchor element
  useEffect(() => {
    if (!current.anchor) {
      setCardPos(null);
      return;
    }

    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-tour="${current.anchor}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const cardHeight = cardRef.current?.offsetHeight || 300;
        const cardWidth = cardRef.current?.offsetWidth || 380;

        // Detect if this is a sidebar item (left side of screen) or in-page element
        const isSidebarItem = rect.left < 280;

        if (isSidebarItem) {
          // Position to the right of the sidebar item
          let top = rect.top + rect.height / 2 - cardHeight / 2;
          top = Math.max(16, Math.min(top, window.innerHeight - cardHeight - 16));
          setCardPos({ top, left: rect.right + 16 });
          setArrowSide('left');
        } else {
          // Position below the in-page element
          let left = rect.left + rect.width / 2 - cardWidth / 2;
          left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));
          const top = Math.min(rect.bottom + 12, window.innerHeight - cardHeight - 16);
          setCardPos({ top, left });
          setArrowSide('top');
        }

        // Highlight the element
        el.classList.add('ring-2', 'ring-brand-gold', 'ring-offset-2', 'bg-brand-cream', 'relative', 'z-[1001]');
        return () => {
          el.classList.remove('ring-2', 'ring-brand-gold', 'ring-offset-2', 'bg-brand-cream', 'relative', 'z-[1001]');
        };
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [step, current.anchor]);

  // Clean up highlights on step change
  useEffect(() => {
    return () => {
      document.querySelectorAll('[data-tour]').forEach((el) => {
        el.classList.remove('ring-2', 'ring-brand-gold', 'ring-offset-2', 'bg-brand-cream', 'relative', 'z-[1001]');
      });
    };
  }, [step]);

  const next = () => {
    if (isLast) { onClose(); return; }
    setStep((s) => s + 1);
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const isAnchored = current.anchor && cardPos;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30 z-[999]" onClick={onClose} />

      {/* Tour card */}
      <div
        ref={cardRef}
        className="fixed z-[1000]"
        style={
          isAnchored
            ? { top: cardPos.top, left: cardPos.left }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        {/* Arrow pointing toward anchor */}
        {isAnchored && arrowSide === 'left' && (
          <div
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0"
            style={{
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderRight: '8px solid white',
            }}
          />
        )}
        {isAnchored && arrowSide === 'top' && (
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid white',
            }}
          />
        )}

        <div className="bg-white rounded-2xl shadow-2xl border border-brand-border w-[380px] max-w-[80vw] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-brand-border">
            <div
              className="h-full bg-brand-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-0.5">
            <span className="text-[11px] text-brand-taupe font-medium">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-brand-off-white text-brand-taupe"
            >
              <X size={14} />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 pb-2">
            <h3 className="text-base font-serif font-bold text-brand-deep-brown mb-1.5">
              {current.title}
            </h3>
            <p className="text-[13px] text-brand-text-brown leading-relaxed whitespace-pre-line">
              {current.description}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-brand-border mt-1">
            <button
              onClick={onClose}
              className="text-[11px] text-brand-taupe hover:text-brand-text-brown"
            >
              Skip tour
            </button>
            <div className="flex gap-1.5">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg border border-brand-border text-xs text-brand-text-brown hover:bg-brand-off-white transition-colors"
                >
                  <ChevronLeft size={13} />
                  Back
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-0.5 px-3 py-1.5 rounded-lg bg-brand-warm-brown text-white text-xs font-medium hover:bg-brand-deep-brown transition-colors"
              >
                {isLast ? 'Finish' : 'Next'}
                {!isLast && <ChevronRight size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function TourLauncher({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-tour="help"
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-brand-warm-brown bg-brand-cream hover:bg-brand-gold/15 transition-colors w-full font-medium"
    >
      <HelpCircle size={18} />
      Retake Tour
    </button>
  );
}
