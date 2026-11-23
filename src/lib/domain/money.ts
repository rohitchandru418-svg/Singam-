/**
 * Money is stored and computed in paise (integers) to avoid floating point drift
 * in fee calculations, tranche verification and reconciliation.
 */

export const PAISE_PER_RUPEE = 100;

export function rupees(amountPaise: number): string {
  return formatINR(amountPaise / PAISE_PER_RUPEE);
}

export function formatINR(rupeesValue: number): string {
  const negative = rupeesValue < 0;
  const value = Math.abs(rupeesValue);
  const fixed = value >= 1 ? value.toFixed(value % 1 === 0 ? 0 : 2) : value.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const grouped = groupIndian(intPart);
  const sign = negative ? "-" : "";
  return `${sign}\u20B9${grouped}${decPart ? "." + decPart : ""}`;
}

/** Indian digit grouping: 1,00,000 not 100,000. */
export function groupIndian(intPart: string): string {
  if (intPart.length <= 3) return intPart;
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

/** Compact Indian notation used on dashboards: Rs 75L, Rs 2Cr. */
export function compactINR(amountPaise: number): string {
  const value = amountPaise / PAISE_PER_RUPEE;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}\u20B9${trim(abs / 1_00_00_000)}Cr`;
  if (abs >= 1_00_000) return `${sign}\u20B9${trim(abs / 1_00_000)}L`;
  if (abs >= 1_000) return `${sign}\u20B9${trim(abs / 1_000)}K`;
  return `${sign}\u20B9${trim(abs)}`;
}

function trim(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

export function toPaise(rupeesValue: number): number {
  return Math.round(rupeesValue * PAISE_PER_RUPEE);
}

export function toRupees(amountPaise: number): number {
  return amountPaise / PAISE_PER_RUPEE;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function percentOf(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

export function safeDiv(a: number, b: number): number {
  return b === 0 ? 0 : a / b;
}

export function percent1(a: number, b: number): number {
  return Math.round(safeDiv(a, b) * 1000) / 10;
}
