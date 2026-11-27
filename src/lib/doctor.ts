import { WEEK_LABELS } from "./date";
import type { Doctor } from "./types";

/** "김서연 교수" */
export function doctorFullName(doctor: Pick<Doctor, "name" | "title">): string {
  return doctor.title ? `${doctor.name} ${doctor.title}` : doctor.name;
}

/** 진료 요일 라벨 (월~토 순). DoctorCard days 에 넘긴다. 일요일 진료는 카드에 칸이 없어 제외한다. */
export function clinicDayLabels(doctor: Pick<Doctor, "weeklyHours">): string[] {
  return doctor.weeklyHours
    .filter((h) => h.isOpen && h.weekday >= 1 && h.weekday <= 6)
    .map((h) => WEEK_LABELS[h.weekday % 7]);
}

/** 오늘(0=일 … 6=토)이 진료 요일인가 */
export function worksOnWeekday(doctor: Pick<Doctor, "weeklyHours">, weekday0: number): boolean {
  const iso = weekday0 === 0 ? 7 : weekday0;
  return doctor.weeklyHours.some((h) => h.weekday === iso && h.isOpen);
}
