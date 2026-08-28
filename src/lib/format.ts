/**
 * The only place a locale or a time zone is named.
 *
 * Server data is always integer grams, integer IDR, and integer epoch ms UTC.
 * Everything human-readable is derived here, at render time, in WIB.
 */

const LOCALE = "id-ID";
const TIME_ZONE = "Asia/Jakarta";

const idrFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const kgFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

export function formatIdr(amountIdr: number) {
  return idrFormatter.format(amountIdr);
}

export function formatKg(grams: number) {
  return `${kgFormatter.format(grams / 1_000)} kg`;
}

/** "17.00" — WIB clock time, 24-hour. */
export function formatWibTime(epochMs: number) {
  return timeFormatter.format(epochMs);
}

/** "27 Agu 2026" */
export function formatWibDate(epochMs: number) {
  return dateFormatter.format(epochMs);
}

/** "Kamis, 27 Agu" */
export function formatWibDay(epochMs: number) {
  return dayFormatter.format(epochMs);
}

/** "17.00-19.00 WIB" */
export function formatPickupWindow(startAt: number, endAt: number) {
  return `${timeFormatter.format(startAt)}-${timeFormatter.format(endAt)} WIB`;
}

export function formatDistance(distanceMeters: number) {
  return distanceMeters < 1_000
    ? `${Math.round(distanceMeters).toLocaleString(LOCALE)} m`
    : `${(distanceMeters / 1_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} km`;
}
