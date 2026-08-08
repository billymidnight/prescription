import { getDetailedAge } from '../lib/age';
import './AgeDisplay.css';

interface AgeDisplayProps {
  dob?: string | null;
  yearOfBirth?: number | null;
}

/**
 * Renders an age as "23Y, 8M, 15D" with the numbers and unit letters styled
 * separately. A component rather than a string so the two can carry different
 * weight and colour; the date maths itself stays in lib/age.ts.
 */
export default function AgeDisplay({ dob, yearOfBirth }: AgeDisplayProps) {
  const detailed = dob ? getDetailedAge(dob) : null;

  // Patients predating the dob column only have a birth year, so there is no
  // month or day to be precise about — show years alone rather than a fake 0M 0D.
  const parts = detailed
    ? [
        { value: detailed.years, unit: 'Y' },
        { value: detailed.months, unit: 'M' },
        { value: detailed.days, unit: 'D' },
      ]
    : yearOfBirth
      ? [{ value: new Date().getFullYear() - yearOfBirth, unit: 'Y' }]
      : null;

  if (!parts) {
    return <span className="age-display age-display-unknown">N/A</span>;
  }

  return (
    <span className="age-display">
      {parts.map((part, index) => (
        <span key={part.unit} className="age-part">
          <span className="age-number">{part.value}</span>
          <span className="age-unit">{part.unit}</span>
          {index < parts.length - 1 && <span className="age-separator">,</span>}
        </span>
      ))}
    </span>
  );
}
