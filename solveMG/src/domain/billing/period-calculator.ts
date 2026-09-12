export type PlanDefinition = {
  id: string;
  name: string;
  price: number;
  lessonsPerPeriod: number | null;
  isUnlimited: boolean;
};

export type BillingPeriodDraft = {
  start: string;
  end: string;
  year: number;
  month: number;
  amountDue: number;
  lessonsEntitled: number | null;
  sequence: number;
  calculationOrigin: 'INITIAL_PARTIAL' | 'FULL_MONTH';
};

const OPERATING_WEEKDAYS = new Set([1, 2, 3, 4, 5, 6]);

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ISO date: ${value}`);
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonths(year: number, month: number, count: number): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + count;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

function countOperatingDays(start: Date, end: Date): number {
  let count = 0;
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const weekday = cursor.getUTCDay() === 0 ? 7 : cursor.getUTCDay();
    if (OPERATING_WEEKDAYS.has(weekday)) count += 1;
  }
  return count;
}

function proportionalLessons(plan: PlanDefinition, start: Date, end: Date): number | null {
  if (plan.isUnlimited) return null;
  if (plan.lessonsPerPeriod === null || plan.lessonsPerPeriod <= 0) {
    throw new Error('A limited plan must define a positive lessonsPerPeriod');
  }
  const monthDays = countOperatingDays(
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)),
    new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)),
  );
  const remainingDays = countOperatingDays(start, end);
  return Math.max(1, Math.ceil((plan.lessonsPerPeriod * remainingDays) / monthDays));
}

export function generateBillingPeriods(
  startDate: string,
  months: number,
  plan: PlanDefinition,
): BillingPeriodDraft[] {
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error('months must be an integer between 1 and 120');
  }
  const start = parseDate(startDate);
  const firstYear = start.getUTCFullYear();
  const firstMonth = start.getUTCMonth() + 1;
  const result: BillingPeriodDraft[] = [];

  for (let index = 0; index < months; index += 1) {
    const current = addMonths(firstYear, firstMonth, index);
    const isFirst = index === 0;
    const periodStart = isFirst
      ? start
      : new Date(Date.UTC(current.year, current.month - 1, 1));
    const periodEnd = new Date(Date.UTC(current.year, current.month, 0));
    const days = isFirst ? proportionalLessons(plan, periodStart, periodEnd) : plan.lessonsPerPeriod;
    result.push({
      start: formatDate(periodStart),
      end: formatDate(periodEnd),
      year: current.year,
      month: current.month,
      amountDue: plan.price,
      lessonsEntitled: days,
      sequence: index + 1,
      calculationOrigin: isFirst ? 'INITIAL_PARTIAL' : 'FULL_MONTH',
    });
  }
  return result;
}

export function countDaysWithoutAttendance(lastAttendance: string | null, today: string): number {
  if (!lastAttendance) return Number.POSITIVE_INFINITY;
  const start = parseDate(lastAttendance);
  const end = parseDate(today);
  if (start > end) throw new Error('lastAttendance cannot be after today');
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

export function isOperatingDay(date: string): boolean {
  const weekday = parseDate(date).getUTCDay();
  return OPERATING_WEEKDAYS.has(weekday === 0 ? 7 : weekday);
}

export { daysInMonth };
