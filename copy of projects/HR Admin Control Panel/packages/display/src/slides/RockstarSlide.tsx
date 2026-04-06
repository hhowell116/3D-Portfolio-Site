import type { DisplayContent } from '@rco/shared';

interface Props {
  item: DisplayContent;
  isActive: boolean;
}

export function RockstarSlide({ item, isActive }: Props) {
  return (
    <div className={`slide ${isActive ? 'active' : ''}`}>
      {/* Left panel */}
      <div className="photo-side">
        {/* Particles */}
        <div className="lp lp1" /><div className="lp lp2" /><div className="lp lp3" />
        <div className="lp lp4" /><div className="lp lp5" /><div className="lp lp6" />
        <div className="lp lp7" /><div className="lp lp8" />

        {/* Decorative stars */}
        <div className="deco-star ds-l1"><img src="/star.png" alt="" /></div>
        <div className="deco-star ds-l2"><img src="/star.png" alt="" /></div>
        <div className="deco-star ds-l3"><img src="/star.png" alt="" /></div>
        <div className="deco-star ds-l4"><img src="/star.png" alt="" /></div>

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
        <div className="deco-star ds-t"><img src="/star.png" alt="" /></div>
        <div className="deco-star ds-b"><img src="/star.png" alt="" /></div>
        <div className="deco-star ds-tr"><img src="/star.png" alt="" /></div>
        <div className="deco-star ds-bl"><img src="/star.png" alt="" /></div>
        <div className="sk sk1" /><div className="sk sk2" /><div className="sk sk3" /><div className="sk sk4" />

        <div className="text-spacer" />
        <div className="badge">{item.badgeText}</div>
        <div className="slide-title">
          <img className="star-icon" src="/star.png" alt="" />
          ROCKSTAR
          <img className="star-icon" src="/star.png" alt="" />
        </div>
        <div className="employee-name">{item.employeeName}</div>
        <div className="employee-title-text">{item.employeeTitle}</div>
        {item.employeeTenure && (
          <div className="employee-tenure">{item.employeeTenure}</div>
        )}
        {item.quote && (
          <div className="quote">
            <span className="quote-mark">&ldquo;</span>
            <p dangerouslySetInnerHTML={{ __html: item.quote }} />
          </div>
        )}
      </div>
    </div>
  );
}
