export type FinancialState = 'PAID' | 'PENDING' | 'OVERDUE' | 'FROZEN' | 'RELEASED';

export function deriveFinancialState(openPeriodCount: number, isFrozen: boolean, isReleased: boolean): FinancialState {
  if (isReleased) return 'RELEASED';
  if (isFrozen) return 'FROZEN';
  if (openPeriodCount === 0) return 'PAID';
  if (openPeriodCount === 1) return 'PENDING';
  return 'OVERDUE';
}