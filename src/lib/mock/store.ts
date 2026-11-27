// 메모리 mock 저장소. 모듈 상태라 새로고침하면 시드 상태로 돌아간다.
// 백엔드 연동 시 이 파일은 통째로 사라지고 src/lib/api/* 가 DB(Drizzle)를 읽는다.
import { addDays, seoulDateKey, seoulWallToIso, type DateKey } from "../date";
import { DOCTORS } from "./data";
import { MOCK_RACE_TIME, MOCK_SEED_PHONE } from "./config";
import { nextClinicDate, previousClinicDate, slotId } from "./schedule";
import type { IntakeForm, Patient, Reservation, ReservationStatusDb } from "../types";

interface OtpState {
  expiresAt: number;
  attempts: number;
}

interface MockStore {
  seeded: boolean;
  patients: Patient[];
  reservations: Reservation[];
  intakes: Map<string, IntakeForm>;
  /** 다른 사람이 가져간 슬롯 (SLOT_TAKEN 재현으로 추가됨) */
  otherTaken: Set<string>;
  otp: Map<string, OtpState>;
  sequence: number;
}

export const store: MockStore = {
  seeded: false,
  patients: [],
  reservations: [],
  intakes: new Map(),
  otherTaken: new Set(),
  otp: new Map(),
  sequence: 0,
};

export function nextReservationNo(date: DateKey): string {
  store.sequence += 1;
  return `R${date.replaceAll("-", "")}-${String(store.sequence).padStart(4, "0")}`;
}

export function newId(prefix: string): string {
  store.sequence += 1;
  return `${prefix}-${store.sequence}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 문자열 해시(결정적). 다른 환자가 이미 예약한 슬롯을 흉내 내는 데 쓴다. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 시드 예약과 별개로, 약 25% 슬롯은 다른 환자가 이미 예약한 것으로 본다. */
export function isTakenByOthers(doctorId: string, date: DateKey, time: string): boolean {
  if (time === MOCK_RACE_TIME) return false; // 15:00 은 제출 시점 충돌 재현용으로 비워 둔다
  return hash(`${doctorId}|${date}|${time}`) % 100 < 25;
}

export function ensureSeeded(now: Date = new Date()): void {
  if (store.seeded) return;
  store.seeded = true;
  const today = seoulDateKey(now);
  const patient: Patient = { id: "patient-1", name: "홍길동", phone: MOCK_SEED_PHONE };
  store.patients.push(patient);

  const add = (
    doctorId: string,
    date: DateKey,
    time: string,
    status: ReservationStatusDb,
    intake: boolean,
  ) => {
    const startAt = seoulWallToIso(date, time);
    const cancelled = status === "cancelled";
    const res: Reservation = {
      id: newId("resv"),
      reservationNo: nextReservationNo(date),
      patientId: patient.id,
      slotId: slotId(doctorId, date, time),
      doctorId,
      startAt,
      status,
      visitType: "return",
      createdVia: "member",
      cancelledAt: cancelled ? seoulWallToIso(addDays(date, -1), "10:00") : null,
      cancelledByRole: cancelled ? "patient" : null,
      version: 1,
    };
    store.reservations.push(res);
    if (intake) {
      store.intakes.set(res.id, {
        visit: "재진",
        purpose: "진료 · 상담",
        symptoms: ["기침"],
        since: "3일 전",
        detail: "",
        meds: "없음",
        medsName: "",
        allergy: "없음",
        travel: "아니오",
      });
    }
  };

  const doc = (id: string) => DOCTORS.find((d) => d.id === id)!;
  // 오늘 진료(취소 마감이 이미 지난 예약), 곧 다가오는 예약, 문진 미작성 예약
  add("doc-os-1", nextClinicDate(doc("doc-os-1"), today, 0), "16:00", "booked", true);
  add("doc-im-1", nextClinicDate(doc("doc-im-1"), today, 4), "11:00", "booked", true);
  add("doc-ent-1", nextClinicDate(doc("doc-ent-1"), today, 10), "14:30", "booked", false);
  // 지난 예약: 진료완료, 예약취소, 노쇼
  add("doc-os-1", previousClinicDate(doc("doc-os-1"), today, 16), "15:30", "completed", true);
  add("doc-derm-1", previousClinicDate(doc("doc-derm-1"), today, 9), "10:00", "cancelled", false);
  add("doc-im-2", previousClinicDate(doc("doc-im-2"), today, 30), "11:30", "no_show", false);
}
