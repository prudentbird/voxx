// Require a timezone on datetimes so decoding never depends on the build host.
const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d))?$/;

export const isValidDate = (value: string | Date): boolean => {
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (!ISO_DATE_RE.test(value)) return false;
  // Date.parse rolls impossible days (e.g. February 30) into the next month.
  const day = value.slice(0, 10);
  const midnight = new Date(`${day}T00:00:00.000Z`);
  return (
    Number.isFinite(midnight.getTime()) &&
    midnight.toISOString().slice(0, 10) === day &&
    Number.isFinite(Date.parse(value))
  );
};
