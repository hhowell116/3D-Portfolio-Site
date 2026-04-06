import type { DisplayContent } from '@rco/shared';

interface Props {
  item: DisplayContent;
  isActive: boolean;
  variant?: number;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface Flair { headline: string; message: string }

const FLAIR: Record<string, Flair[]> = {
  '1': [
    { headline: 'A Memorable Beginning', message: 'Your first year has already left a mark. Thank you for bringing your passion and energy every day!' },
    { headline: 'One Year, Big Impact', message: 'Your fresh perspective and dedication have enriched our team. Here\'s to many more!' },
    { headline: 'What a Year!', message: 'Celebrating your first year with us! You\'ve made a real difference and we\'re so glad you\'re here.' },
    { headline: 'Just Getting Started', message: 'One year down and so much already accomplished. We can\'t wait to see where your journey takes you!' },
    { headline: 'Teamwork Makes the Dream Work', message: 'It\'s been an incredible first year with you on board. Thank you for your collaboration and commitment!' },
  ],
  '2-3': [
    { headline: 'Building Strong Foundations', message: 'Your hard work and enthusiasm have made a noticeable impact. We can\'t wait to see what you achieve in the years ahead!' },
    { headline: 'Growing Together', message: 'Your growth over these years has been inspiring to watch. Thank you for investing your talent in our team!' },
    { headline: 'Making Your Mark', message: 'You\'ve proven yourself to be an invaluable part of the team. Your contributions make a difference every single day.' },
    { headline: 'Stronger Every Year', message: 'Each year you bring even more energy and expertise. Thank you for your continued dedication!' },
    { headline: 'A True Team Player', message: 'Your commitment to collaboration and excellence shines through in everything you do. Here\'s to many more!' },
  ],
  '4': [
    { headline: 'Four Years of Excellence', message: 'Your consistency and dedication over these four years have set a wonderful example for the whole team.' },
    { headline: 'Almost Half a Decade!', message: 'Four years of making a difference every day. Your hard work and positive attitude don\'t go unnoticed!' },
    { headline: 'A Trusted Contributor', message: 'Year after year, you continue to raise the bar. Thank you for your unwavering commitment!' },
    { headline: 'Growing Into Greatness', message: 'Four years of steady growth and meaningful impact. We\'re grateful to have you on the team!' },
    { headline: 'Dedication in Action', message: 'Your reliability and passion over these years have been a cornerstone of our team\'s success.' },
  ],
  '5': [
    { headline: 'Half a Decade of Dedication', message: 'Five years of excellence! Thank you for your commitment and all the moments that have made our team stronger.' },
    { headline: 'Five Years Strong', message: 'What an incredible milestone! Your loyalty and expertise have been instrumental to our success.' },
    { headline: 'Celebrating Five Amazing Years', message: 'Half a decade of hard work, growth, and making a real impact. We\'re honored to have you!' },
    { headline: 'A Milestone Worth Celebrating', message: 'Five years is a testament to your character and dedication. Thank you for everything you bring to the table!' },
    { headline: 'Fabulous at Five', message: 'Five years of going above and beyond! Your positive energy and dedication inspire everyone around you.' },
  ],
  '6-9': [
    { headline: 'A Journey Worth Celebrating', message: 'Your dedication and hard work have left a lasting mark on all of us. Thank you for being such an integral part of our journey!' },
    { headline: 'Years of Making a Difference', message: 'Your experience and expertise are invaluable. Thank you for continuing to raise the bar for our team!' },
    { headline: 'An Essential Part of Our Story', message: 'You\'ve been a driving force behind so many of our successes. We\'re grateful for your continued commitment!' },
    { headline: 'Consistency and Excellence', message: 'Year after year, you deliver with passion and precision. Thank you for being someone we can always count on!' },
    { headline: 'Your Impact Grows Every Year', message: 'The longer you\'re here, the more we realize how fortunate we are. Thank you for your incredible contributions!' },
  ],
  '10': [
    { headline: 'A Decade of Making a Difference', message: 'Ten years of outstanding contributions. Your expertise and leadership are deeply valued by everyone on the team.' },
    { headline: 'Ten Years of Excellence', message: 'A full decade! Your dedication, wisdom, and passion have shaped our team in ways that will last for years to come.' },
    { headline: 'A Decade of Dedication', message: 'Ten years is a remarkable achievement. Thank you for your loyalty and the countless contributions you\'ve made.' },
    { headline: 'A True Milestone', message: 'Reaching ten years is a testament to your incredible character and work ethic. We\'re so grateful for you!' },
    { headline: 'Ten Years and Counting', message: 'A decade of growth, leadership, and making a lasting impact. Here\'s to the next ten!' },
  ],
  '11-14': [
    { headline: 'From Strength to Strength', message: 'Your dedication over the years has been nothing short of extraordinary. Thank you for everything you bring to the team!' },
    { headline: 'A Pillar of Our Team', message: 'Your years of service have built a legacy of excellence. We\'re so fortunate to have you!' },
    { headline: 'Leading by Example', message: 'Your experience and leadership continue to inspire those around you. Thank you for setting such a high standard!' },
    { headline: 'Steadfast and Strong', message: 'Through every challenge and triumph, you\'ve been a constant source of strength. Thank you for your dedication!' },
    { headline: 'A Legacy of Impact', message: 'Your contributions over the years have shaped our team\'s culture and success in profound ways.' },
  ],
  '15-19': [
    { headline: 'An Incredible Legacy', message: 'Years of dedication, innovation, and inspiration. Thank you for being a cornerstone of our success.' },
    { headline: 'A Heartfelt Thank You', message: 'Your years of hard work and passion have made a lasting impact that will be felt for generations.' },
    { headline: 'Your Journey, Our Success', message: 'Your steadfast commitment has been instrumental in building who we are today. Thank you!' },
    { headline: 'An Inspiration to All', message: 'Your longevity and dedication are truly inspiring. You\'ve set a standard of excellence that defines our team.' },
    { headline: 'The Heart of Our Team', message: 'After all these years, your passion and commitment are as strong as ever. We\'re so grateful for you!' },
  ],
  '20': [
    { headline: 'Your Impact Endures', message: 'Two decades with us! Your leadership and vision continue to shape our organization in amazing ways.' },
    { headline: 'Twenty Years of Greatness', message: 'Two decades of unwavering dedication and exceptional contributions. You are truly one of a kind!' },
    { headline: 'A Landmark Celebration', message: 'Twenty years! Your journey with us is a story of growth, resilience, and remarkable achievement.' },
    { headline: 'Two Decades of Excellence', message: 'Your commitment over twenty years has been the foundation of so much of our success. Thank you!' },
    { headline: 'An Extraordinary Journey', message: 'Twenty years of leadership, mentorship, and making a difference. We\'re honored to celebrate with you!' },
  ],
  '21+': [
    { headline: 'A Remarkable Milestone', message: 'Your journey with us is nothing short of extraordinary. Thank you for your steadfast commitment and lasting impact.' },
    { headline: 'Beyond Extraordinary', message: 'Your decades of service represent the very best of our organization. Thank you for your incredible legacy!' },
    { headline: 'A Living Legacy', message: 'Your contributions over the years have built something truly special. We\'re honored to celebrate this milestone with you.' },
    { headline: 'An Unmatched Journey', message: 'Very few reach a milestone like this. Your dedication and passion have shaped our organization in immeasurable ways.' },
    { headline: 'The Gold Standard', message: 'You are the embodiment of loyalty, excellence, and heart. Thank you for every year you\'ve given us!' },
  ],
};

function getBracket(years: number): string {
  if (years === 1) return '1';
  if (years <= 3) return '2-3';
  if (years === 4) return '4';
  if (years === 5) return '5';
  if (years <= 9) return '6-9';
  if (years === 10) return '10';
  if (years <= 14) return '11-14';
  if (years <= 19) return '15-19';
  if (years === 20) return '20';
  return '21+';
}

function getAnniversaryFlair(years: number, variant: number): Flair {
  const bracket = getBracket(years);
  const options = FLAIR[bracket];
  return options[variant % options.length];
}

export function AnniversarySlide({ item, isActive, variant = 0 }: Props) {
  const yearsMatch = item.employeeTenure?.match(/(\d+)/);
  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : null;
  const flair = years ? getAnniversaryFlair(years, variant) : null;

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
          WORK ANNIVERSARY
          <span className="fw-icon" />
        </div>
        <div className="employee-name">{item.employeeName}</div>
        <div className="employee-title-text">{item.employeeTitle}</div>
        {years && (
          <div className="employee-tenure">{ordinal(years)} Anniversary!</div>
        )}

        {flair && (
          <div className="anniv-flair">
            <div className="anniv-flair-headline">{flair.headline}</div>
            <div className="anniv-flair-message">{flair.message}</div>
          </div>
        )}

        {years && <div className="celebration-deco celebration-deco--anniv">{years}</div>}
      </div>
    </div>
  );
}
