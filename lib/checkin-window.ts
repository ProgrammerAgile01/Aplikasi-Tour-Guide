export function isNowWithinWindow(
  startAt?: string | null,
  endAt?: string | null,
  graceMinutes = 15
) {
  if (!startAt || !endAt) return true;

  const now = new Date();
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return true;

  const grace = graceMinutes * 60_000;

  return (
    now >= new Date(start.getTime() - grace) &&
    now <= new Date(end.getTime() + grace)
  );
}
