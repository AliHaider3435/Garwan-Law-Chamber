export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const D1: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
export const D2: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
const DEFAULT: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };

export const fmt = (s: string, o: Intl.DateTimeFormatOptions = DEFAULT) =>
  s ? parse(s).toLocaleDateString('en-GB', o) : '-';

export const today = () => iso(new Date());
export const tomorrow = () => iso(addDays(new Date(), 1));
