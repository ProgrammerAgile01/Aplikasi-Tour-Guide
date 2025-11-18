export function isNowWithinWindow(
  startAt?: string | null,
  endAt?: string | null
) {
  if (!startAt || !endAt) return true;

  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;

  const graceBefore = 15 * 60_000;
  const graceAfter = 15 * 60_000;

  return (
    now >= new Date(start.getTime() - graceBefore) &&
    now <= new Date(end.getTime() + graceAfter)
  );
}