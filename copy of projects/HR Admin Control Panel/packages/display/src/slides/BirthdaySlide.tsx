import type { DisplayContent } from '@rco/shared';

interface Props {
  item: DisplayContent;
  isActive: boolean;
}

export function BirthdaySlide({ item, isActive }: Props) {
  return (
    <div className={`slide ${isActive ? 'active' : ''}`}>
      {/* Left panel */}
      <div className="photo-side">
        <div className="lp lp1" /><div className="lp lp2" /><div className="lp lp3" />
        <div className="lp lp4" /><div className="lp lp5" /><div className="lp lp6" />
        <div className="lp lp7" /><div className="lp lp8" />

        <div className="fw fw1" /><div className="fw fw2" /><div className="fw fw3" />
        <div className="fw fw4" /><div className="fw fw5" /><div className="fw fw6" />

        <img className="logo-top" src="/logo.png" alt="RCO" />

        <div className="photo-circle">
          {item.photoUrl ? (
            <img src={item.photoUrl} alt={item.employeeName} />
          ) : (
            <div className="photo-initials">{item.employeeInitials}</div>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="text-side">
        <div className="fw fw-r1" /><div className="fw fw-r2" /><div className="fw fw-r3" />
        <div className="fw fw-r4" /><div className="fw fw-r5" />
        <div className="sk sk1" /><div className="sk sk2" /><div className="sk sk3" /><div className="sk sk4" />

        <div className="text-spacer" />
        <div className="badge">{item.badgeText}</div>
        <div className="slide-title slide-title--nowrap">
          HAPPY BIRTHDAY
          <span className="fw-icon" />
        </div>
        <div className="employee-name">{item.employeeName}</div>
        <div className="employee-title-text">{item.employeeTitle}</div>
        {item.quote && (
          <div className="quote">
            <span className="quote-mark">&ldquo;</span>
            <p dangerouslySetInnerHTML={{ __html: item.quote }} />
          </div>
        )}

        {/* Decorative celebration graphic to fill space */}
        <div className="celebration-deco celebration-deco--bday">{'\u{1F382}'}</div>
      </div>
    </div>
  );
}
