export const WIB_TIME_ZONE = "Asia/Jakarta";

/** Formats a timestamp consistently for every user-facing date in the app. */
export function formatWibDateTime(value: Date | string | number) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("day")} ${part("month")} ${part("year")}, ${part("hour")}.${part("minute")} WIB`;
}
