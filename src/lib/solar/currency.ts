// Currency handling for the techno-economic analysis.
//
// Prices live in the base currency (NGN) and are converted for display. The
// rates below are INDICATIVE PLACEHOLDERS, not live data — this site has no
// server and makes no runtime network calls for pricing, so a rate here can
// only ever be as fresh as the last time someone edited this file. Every rate
// is editable in the UI for exactly that reason, and the UI shows the review
// date beside it. Treat the shipped numbers as a starting point to overwrite,
// the same way `sourceNote` works on the reference tables.

export const RATES_LAST_REVIEWED = '2026-09-16';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  /** Units of this currency per 1 NGN. Editable at runtime. */
  perNgn: number;
  /** Decimal places for display. */
  decimals: number;
}

export const BASE_CURRENCY = 'NGN';

export const CURRENCIES: Currency[] = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian naira', perNgn: 1, decimals: 0 },
  { code: 'USD', symbol: '$', name: 'US dollar', perNgn: 1 / 1550, decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', perNgn: 1 / 1680, decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'Pound sterling', perNgn: 1 / 1960, decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen', perNgn: 1 / 10.4, decimals: 0 },
  { code: 'CNY', symbol: '¥', name: 'Chinese yuan', perNgn: 1 / 214, decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Indian rupee', perNgn: 1 / 18.2, decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'South African rand', perNgn: 1 / 84, decimals: 2 },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian cedi', perNgn: 1 / 96, decimals: 2 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan shilling', perNgn: 1 / 12, decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian dollar', perNgn: 1 / 1140, decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar', perNgn: 1 / 1020, decimals: 2 },
  { code: 'AED', symbol: 'AED', name: 'UAE dirham', perNgn: 1 / 422, decimals: 2 },
];

export function findCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Convert an amount in NGN into the target currency. */
export function fromNgn(amountNgn: number, currency: Currency): number {
  return amountNgn * currency.perNgn;
}

/** Convert an amount in the given currency back into NGN. */
export function toNgn(amount: number, currency: Currency): number {
  return currency.perNgn === 0 ? 0 : amount / currency.perNgn;
}

/** Format an amount already expressed in `currency`. */
export function formatMoney(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount)) return '—';
  const abs = Math.abs(amount);
  // Large figures read better abbreviated; a 270-million-naira bill of
  // materials as a raw digit string is unreadable.
  if (abs >= 1e9) return `${currency.symbol}${(amount / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${currency.symbol}${(amount / 1e6).toFixed(2)}M`;
  return `${currency.symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  })}`;
}

/** Format without abbreviating — for input fields, which must round-trip. */
export function formatMoneyExact(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount)) return '';
  return amount.toFixed(currency.decimals);
}
