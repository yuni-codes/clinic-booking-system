// 예약 가능 날짜·시간 조회. 교체 지점: slot + closure + reservation 을 조인한 조회
// (예약 가능 = slot.status='open' AND 휴진 미중첩 AND 활성 예약 없음 AND 리드타임/오픈 범위 충족, data-model.md 3.4).
// 최종 중복 판정은 항상 서버(reservation(slot_id) 부분 유니크)가 한다.
import { addDays, isoWeekdayOf, seoulDateKey, seoulWallToIso, type DateKey } from "../date";
import { BOOKING_WINDOW_DAYS, MIN_LEAD_MINUTES } from "../mock/config";
import { DOCTORS } from "../mock/data";
import { buildDaySlots, isClinicDay, isClosureDay, parseSlotId } from "../mock/schedule";
import { ensureSeeded, isTakenByOthers, store } from "../mock/store";
import { latency } from "./delay";
import { ACTIVE_RESERVATION_STATUSES, fail, ok } from "../types";
import type { ApiResult, BookableDay, DaySlots, SlotState, SlotView } from "../types";

function isOccupied(id: string): boolean {
  return (
    store.otherTaken.has(id) ||
    store.reservations.some(
      (r) => r.slotId === id && ACTIVE_RESERVATION_STATUSES.includes(r.status),
    )
  );
}

export function slotState(
  raw: { id: string; doctorId: string; date: DateKey; time: string; startAt: string },
  now: Date,
): SlotState {
  // 진료 시간이 이미 지났거나 리드타임 안이면 "불가"
  if (new Date(raw.startAt).getTime() < now.getTime() + MIN_LEAD_MINUTES * 60_000) return "closed";
  if (isOccupied(raw.id) || isTakenByOthers(raw.doctorId, raw.date, raw.time)) return "taken";
  return "open";
}

/** 오늘부터 2주. 진료 요일이 아니거나 휴진이면 closed (DateStrip "휴진") */
export async function getBookableDays(doctorId: string): Promise<BookableDay[]> {
  await latency(150);
  const doctor = DOCTORS.find((d) => d.id === doctorId);
  const today = seoulDateKey(new Date());
  const now = new Date();
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i): BookableDay => {
    const date = addDays(today, i);
    const off = !doctor || !isClinicDay(doctor, date) || isClosureDay(doctor.id, date, today);
    if (off) return { date, closed: true, closedLabel: "휴진" };
    // 오늘 진료 시간이 모두 지났으면 선택할 수 없다 ("마감")
    const over =
      i === 0 && !buildDaySlots(doctor, date).some((raw) => slotState(raw, now) !== "closed");
    return over ? { date, closed: true, closedLabel: "마감" } : { date, closed: false };
  });
}

export async function getDaySlots(doctorId: string, date: DateKey): Promise<DaySlots> {
  await latency(250);
  ensureSeeded();
  const doctor = DOCTORS.find((d) => d.id === doctorId);
  const now = new Date();
  const today = seoulDateKey(now);
  if (!doctor || !isClinicDay(doctor, date) || isClosureDay(doctor.id, date, today)) {
    return { date, closed: true, slotMinutes: doctor?.slotMinutes ?? 30, lunch: null, slots: [] };
  }
  const slots: SlotView[] = buildDaySlots(doctor, date).map((raw) => ({
    id: raw.id,
    time: raw.time,
    startAt: raw.startAt,
    status: slotState(raw, now),
  }));
  const hour = doctor.weeklyHours.find((h) => h.weekday === isoWeekdayOf(date));
  return {
    date,
    closed: false,
    slotMinutes: doctor.slotMinutes,
    lunch:
      hour?.lunchStart && hour.lunchEnd
        ? { start: hour.lunchStart, end: hour.lunchEnd }
        : null,
    slots,
  };
}

/** "다음" 을 누를 때 서버가 다시 확인한다 (ScreenSchedule: 예약 가능 여부 확인 중…). */
export async function checkSlotAvailable(slotId: string): Promise<ApiResult<{ slotId: string }>> {
  await latency(600);
  ensureSeeded();
  const parsed = parseSlotId(slotId);
  const doctor = parsed && DOCTORS.find((d) => d.id === parsed.doctorId);
  if (!parsed || !doctor) {
    return fail("SLOT_UNAVAILABLE", "선택할 수 없는 시간입니다. 다른 시간을 선택해 주세요.");
  }
  const state = slotState(
    { ...parsed, id: slotId, startAt: seoulWallToIso(parsed.date, parsed.time) },
    new Date(),
  );
  if (state === "taken") {
    return fail("SLOT_TAKEN", "이미 다른 분이 예약한 시간입니다. 다른 시간을 선택해 주세요.");
  }
  if (state === "closed") {
    return fail("SLOT_UNAVAILABLE", "예약할 수 없는 시간입니다. 다른 시간을 선택해 주세요.");
  }
  return ok({ slotId });
}
