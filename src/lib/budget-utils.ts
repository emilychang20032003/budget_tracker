import { differenceInDays, format, isAfter, isBefore, setDate, addMonths, subMonths, parseISO, startOfDay } from "date-fns";
import { BUDGET_CYCLE_START_DAY } from "./constants";

export function getCurrentCycleId(date: Date = new Date()): string {
  const d = startOfDay(date);
  const day = d.getDate();
  
  if (day >= BUDGET_CYCLE_START_DAY) {
    return format(d, "yyyy-MM");
  } else {
    return format(subMonths(d, 1), "yyyy-MM");
  }
}

export function getCycleRange(cycleId: string) {
  // cycleId is "YYYY-MM"
  const [year, month] = cycleId.split("-");
  const start = setDate(new Date(parseInt(year), parseInt(month) - 1), BUDGET_CYCLE_START_DAY);
  const end = setDate(addMonths(start, 1), BUDGET_CYCLE_START_DAY - 1);
  return { start, end };
}

export function getDaysInCycle(cycleId: string): number {
  const { start, end } = getCycleRange(cycleId);
  return differenceInDays(end, start) + 1;
}

export function getDaysRemaining(cycleId: string, today: Date = new Date()): number {
  const { start, end } = getCycleRange(cycleId);
  const current = startOfDay(today);
  
  if (isBefore(current, start)) return getDaysInCycle(cycleId);
  if (isAfter(current, end)) return 0;
  
  return differenceInDays(end, current);
}

export function getDaysElapsed(cycleId: string, today: Date = new Date()): number {
  const total = getDaysInCycle(cycleId);
  const remaining = getDaysRemaining(cycleId, today);
  return total - remaining;
}
