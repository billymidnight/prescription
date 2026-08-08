/**
 * Age helpers.
 *
 * All calculations run in the machine's local timezone. `dob` comes back from
 * Supabase as a plain 'YYYY-MM-DD' string (Postgres `date`), so it is parsed
 * field-by-field rather than with `new Date(dob)` — the latter treats a
 * date-only string as UTC midnight, which lands on the previous day for
 * anyone west of UTC and would shift the age by a day.
 */

export interface DetailedAge {
  years: number;
  months: number;
  days: number;
}

/**
 * Exact age broken into years, months and days as of `today`.
 * Returns null if `dob` is unparseable or in the future.
 */
export function getDetailedAge(dob: string, today: Date = new Date()): DetailedAge | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob.trim());
  if (!match) return null;

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]) - 1;
  const birthDay = Number(match[3]);

  const birth = new Date(birthYear, birthMonth, birthDay);
  // Guards against values like 2024-02-31, which JS would roll over to March.
  if (
    birth.getFullYear() !== birthYear ||
    birth.getMonth() !== birthMonth ||
    birth.getDate() !== birthDay
  ) {
    return null;
  }

  // Compare calendar days only, so a birthday "ticks over" at local midnight.
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (birth > now) return null;

  let years = now.getFullYear() - birthYear;
  let months = now.getMonth() - birthMonth;
  let days = now.getDate() - birthDay;

  if (days < 0) {
    months -= 1;
    // Walk back to the birth-day anniversary in the previous month, clamped to
    // that month's length (31 Jan + 1 month = 29 Feb in a leap year), then count
    // real days forward. Math.round absorbs any DST hour shift.
    const previousMonthLength = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const anchor = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      Math.min(birthDay, previousMonthLength)
    );
    days = Math.round((now.getTime() - anchor.getTime()) / 86_400_000);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

/**
 * Age as a plain string, e.g. "23Y, 8M, 15D".
 *
 * For on-screen use prefer the AgeDisplay component, which styles the numbers
 * and unit letters separately. This is for contexts that need a bare string.
 *
 * Falls back to years-only when the patient predates the `dob` column and only
 * `year_of_birth` is on record — there is no day or month to be precise about.
 */
export function formatAge(dob?: string | null, yearOfBirth?: number | null): string {
  if (dob) {
    const age = getDetailedAge(dob);
    if (age) return `${age.years}Y, ${age.months}M, ${age.days}D`;
  }
  if (yearOfBirth) return `${new Date().getFullYear() - yearOfBirth}Y`;
  return 'N/A';
}
