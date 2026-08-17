import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Short form for the feed's timestamp gutter, which is a fixed narrow column.
 * `getEventTime` returns prose like "today @ 10:27:02 PM" that wraps to two
 * lines there, so today's events show a bare clock and older ones a bare date.
 */
export function getEventClock(createdAt: Date) {
  const now = new Date();
  const sameDay =
    createdAt.getFullYear() === now.getFullYear() &&
    createdAt.getMonth() === now.getMonth() &&
    createdAt.getDate() === now.getDate();

  return sameDay
    ? createdAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getEventTime(createdAt: Date) {
  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isYesterday = (d1: Date, d2: Date): boolean => {
    const yesterday = new Date(d2);
    yesterday.setDate(yesterday.getDate() - 1);

    return isSameDay(d1, yesterday);
  };

  const today = new Date();

  if (isSameDay(createdAt, today)) {
    return `today @ ${createdAt.toLocaleTimeString()}`;
  } else if (isYesterday(createdAt, today)) {
    return `yesterday @ ${createdAt.toLocaleTimeString()}`;
  } else {
    return `${createdAt.toLocaleDateString()} @ ${createdAt.toLocaleTimeString()}`;
  }
}
