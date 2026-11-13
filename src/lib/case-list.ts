import type { Case } from './types';

export function casesForDate(cases: Case[], date: string): Case[] {
  return cases.filter((c) => c.status === 'active' && c.next === date);
}
