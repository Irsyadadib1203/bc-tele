import { formatWibDateTime } from "@/lib/time";

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
export const timeAgo = (date: Date) =>
  formatWibDateTime(date);
