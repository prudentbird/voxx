// Require a timezone on datetimes so decoding never depends on the build host.
const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d))?$/;

const hasFourDigitYear = (date: Date): boolean => {
  const year = date.getUTCFullYear();
  return year >= 0 && year <= 9999;
};

export const isValidDate = (value: string | Date): boolean => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) && hasFourDigitYear(value);
  }
  if (!ISO_DATE_RE.test(value)) return false;
  // Date.parse rolls impossible days (e.g. February 30) into the next month.
  const day = value.slice(0, 10);
  const midnight = new Date(`${day}T00:00:00.000Z`);
  if (
    !Number.isFinite(midnight.getTime()) ||
    midnight.toISOString().slice(0, 10) !== day
  ) {
    return false;
  }
  const parsed = Date.parse(value);
  // A timezone offset can push the UTC instant outside the four-digit year
  // range even though the written year is valid; reject those since
  // rfc822/isoDate and schema normalization only support four-digit years.
  return Number.isFinite(parsed) && hasFourDigitYear(new Date(parsed));
};
