import { describe, expect, it } from 'vitest';
import {
  countDaysWithoutAttendance,
  daysInMonth,
  generateBillingPeriods,
  isOperatingDay,
} from '../src/domain/billing/period-calculator.js';

const threeLessons = {
  id: 'plan-3',
  name: '3 aulas',
  price: 100,
  lessonsPerPeriod: 3,
  isUnlimited: false,
};

const unlimited = {
  id: 'free',
  name: 'Livre Trânsito',
  price: 200,
  lessonsPerPeriod: null,
  isUnlimited: true,
};

describe('billing period calculator', () => {
  it.each([
    ['2026-02-01', 28],
    ['2028-02-01', 29],
    ['2026-04-01', 30],
    ['2026-01-01', 31],
  ])('handles calendar month length for %s', (date, expected) => {
    const [yearText, monthText] = date.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    expect(daysInMonth(year, month)).toBe(expected);
  });

  it('generates a partial month and full following months across year boundary', () => {
    const periods = generateBillingPeriods('2026-11-15', 3, threeLessons);
    expect(periods.map((period) => `${period.year}-${period.month}`)).toEqual([
      '2026-11',
      '2026-12',
      '2027-1',
    ]);
    expect(periods[0]?.calculationOrigin).toBe('INITIAL_PARTIAL');
    expect(periods[1]?.calculationOrigin).toBe('FULL_MONTH');
  });

  it('supports 12 months and unlimited plans', () => {
    const periods = generateBillingPeriods('2026-01-01', 12, unlimited);
    expect(periods).toHaveLength(12);
    expect(periods.every((period) => period.lessonsEntitled === null)).toBe(true);
  });

  it('never treats Sunday as an operating day', () => {
    expect(isOperatingDay('2026-09-13')).toBe(false);
    expect(isOperatingDay('2026-09-12')).toBe(true);
  });

  it('calculates absence days and missing attendance', () => {
    expect(countDaysWithoutAttendance('2026-09-01', '2026-09-11')).toBe(10);
    expect(countDaysWithoutAttendance(null, '2026-09-11')).toBe(Number.POSITIVE_INFINITY);
  });
});
