import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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