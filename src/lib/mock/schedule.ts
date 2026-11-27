// 의사 주간 진료 시간(doctor_weekly_hour) + 예약 간격(doctor.slot_minutes) 으로 슬롯을 만든다.
// 실제 구현은 slot 테이블을 조회한다 (data-model.md 3.4). 슬롯 id 규칙은 mock 전용이다.
import {
  addDays,
  isoWeekdayOf,
  minutesOf,
  seoulWallToIso,
  timeOfMinutes,
  type DateKey,
} from "../date";
import { CLOSURE_OFFSETS } from "./data";
import type { Doctor } from "../types";

export interface RawSlot {
  id: string;
  doctorId: string;
  date: DateKey;
  time: string;
  startAt: string;
  endAt: string;
}

export function slotId(doctorId: string, date: DateKey, time: string): string {
  return `slot_${doctorId}_${date}_${time.replace(":", "")}`;
}

/** slot id -> 구성요소. 형식이 다르면 null. */
export function parseSlotId(id: string): { doctorId: string; date: DateKey; time: string } | null {
  const m = /^slot_(.+)_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})$/.exec(id);
  if (!m) return null;
  return { doctorId: m[1], date: m[2], time: `${m[3]}:${m[4]}` };
}

export function isClosureDay(doctorId: string, date: DateKey, today: DateKey): boolean {
  return CLOSURE_OFFSETS.some(
    (c) =>
      c.doctorId === doctorId &&
      date >= addDays(today, c.fromOffset) &&
      date <= addDays(today, c.toOffset),
  );
}

/** 그 날 진료 요일인가 (휴진은 별도) */
export function isClinicDay(doctor: Doctor, date: DateKey): boolean {
  const hour = doctor.weeklyHours.find((h) => h.weekday === isoWeekdayOf(date));
  return !!hour?.isOpen;
}

export function buildDaySlots(doctor: Doctor, date: DateKey): RawSlot[] {
  const hour = doctor.weeklyHours.find((h) => h.weekday === isoWeekdayOf(date));
  if (!hour?.isOpen || !hour.startTime || !hour.endTime) return [];
  const step = doctor.slotMinutes;
  const start = minutesOf(hour.startTime);
  const end = minutesOf(hour.endTime);
  const lunchStart = hour.lunchStart ? minutesOf(hour.lunchStart) : null;
  const lunchEnd = hour.lunchEnd ? minutesOf(hour.lunchEnd) : null;
  const out: RawSlot[] = [];
  for (let t = start; t + step <= end; t += step) {
    // 점심시간과 겹치는 슬롯은 발행하지 않는다.
    if (lunchStart !== null && lunchEnd !== null && t < lunchEnd && t + step > lunchStart) continue;
    const time = timeOfMinutes(t);
    out.push({
      id: slotId(doctor.id, date, time),
      doctorId: doctor.id,
      date,
      time,
      startAt: seoulWallToIso(date, time),
      endAt: seoulWallToIso(date, timeOfMinutes(t + step)),
    });
  }
  return out;
}

/** 오늘 이후(minOffset 일 이후) 첫 진료일 */
export function nextClinicDate(doctor: Doctor, today: DateKey, minOffset: number): DateKey {
  for (let i = minOffset; i < minOffset + 14; i++) {
    const d = addDays(today, i);
    if (isClinicDay(doctor, d) && !isClosureDay(doctor.id, d, today)) return d;
  }
  return addDays(today, minOffset);
}

/** 오늘 이전(minDaysAgo 일 전부터) 마지막 진료일 */
export function previousClinicDate(doctor: Doctor, today: DateKey, minDaysAgo: number): DateKey {
  for (let i = minDaysAgo; i < minDaysAgo + 14; i++) {
    const d = addDays(today, -i);
    if (isClinicDay(doctor, d)) return d;
  }
  return addDays(today, -minDaysAgo);
}
