interface Props {
  type: 'birthday' | 'anniversary' | 'combined';
  isActive: boolean;
}

export function EmptyTodaySlide({ type, isActive }: Props) {
  const title = type === 'birthday'
    ? 'BIRTHDAYS TODAY'
    : type === 'anniversary'
    ? 'ANNIVERSARIES TODAY'
    : 'CELEBRATIONS TODAY';

  const message = type === 'birthday'
    ? 'No Birthdays Today'
    : type === 'anniversary'
    ? 'No Anniversaries Today'
    : 'No Celebrations Today';

  const heading = type === 'birthday'
    ? 'BIRTHDAYS'
    : type === 'anniversary'
    ? 'ANNIVERSARIES'
    : 'CELEBRATIONS';

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

        <div className="photo-circle empty-circle">
          <div className="empty-icon">
            {type === 'anniversary' ? '\u{1F3C6}' : '\u{1F389}'}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="text-side">
        <div className="fw fw-r1" /><div className="fw fw-r2" /><div className="fw fw-r3" />
        <div className="fw fw-r4" /><div className="fw fw-r5" />
        <div className="sk sk1" /><div className="sk sk2" /><div className="sk sk3" /><div className="sk sk4" />

        <div className="text-spacer" />
        <div className="badge">{title}</div>
        <div className="slide-title">
          {heading}
          <span className="fw-icon" />
        </div>
        <div className="employee-name">{message}</div>
        <div className="employee-title-text">Check back soon!</div>
      </div>
    </div>
  );
}
